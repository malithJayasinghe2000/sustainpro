import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../repositories/user.repository';
import { passwordValidationService } from './password-validation.service';
import { getLoginPolicies, getSessionPolicies, getTwoFactorConfig } from './settings.service';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { OtpRepository, OtpPurpose } from '../repositories/otp.repository';
import { SessionRepository } from '../repositories/session.repository';
import { config } from '../config';
import {
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    createLogger,
    publishNotification,
    auditLogger,
    AuditAction,
    AuditCategory,
    AuditStatus,
} from '@sustainpro/shared-utils';
import { JwtPayload } from '@sustainpro/shared-types';

const logger = createLogger({ service: 'auth-service' });

export interface LoginRequest {
    email: string;
    password: string;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Audit context passed from controllers to services
 */
export interface AuditContext {
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestPath?: string;
    requestId?: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export class AuthService {
    private userRepo = new UserRepository();
    private refreshTokenRepo = new RefreshTokenRepository();
    private otpRepo = new OtpRepository();
    private sessionRepo = new SessionRepository();

    /**
     * Generate a secure random token
     */
    private generateSecureToken(): string {
        return crypto.randomBytes(64).toString('base64url');
    }

    /**
     * Authenticate user and return tokens
     */
    async login(request: LoginRequest) {
        const { email, password, deviceInfo, ipAddress, userAgent } = request;

        // Fetch dynamic settings from database
        const [loginPolicies, sessionPolicies, twoFactorConfig] = await Promise.all([
            getLoginPolicies(),
            getSessionPolicies(),
            getTwoFactorConfig(),
        ]);

        const user = await this.userRepo.findByEmail(email);

        if (!user) {
            logger.warn('Login attempt with non-existent email', { email });
            throw new UnauthorizedError('Invalid credentials');
        }

        // Check if account is active
        if (!user.is_active) {
            logger.warn('Login attempt on disabled account', { userId: user.id });
            throw new ForbiddenError('Account disabled');
        }

        // Check account lockout
        if (user.account_locked_until) {
            const lockUntil = new Date(user.account_locked_until);
            if (lockUntil > new Date()) {
                const minutesRemaining = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
                throw new ForbiddenError(
                    `Account locked. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
                );
            }
        }

        // Verify password
        const validPass = await argon2.verify(user.password_hash, password);
        if (!validPass) {
            // Increment failed attempts using database settings
            const attempts = (user.failed_login_attempts || 0) + 1;
            let lockUntil: Date | undefined;

            // Use database settings for max login attempts
            const maxAttempts = loginPolicies.max_login_attempts;
            let lockDuration = loginPolicies.lockout_duration_minutes;

            if (attempts >= maxAttempts) {
                // Apply progressive lockout if enabled (based on previous lock count, estimated from attempts)
                if (loginPolicies.progressive_lockout && user.failed_login_attempts && user.failed_login_attempts >= maxAttempts) {
                    // Estimate lockout count based on how many times user has exceeded max attempts
                    const estimatedLockoutCount = Math.floor(user.failed_login_attempts / maxAttempts);
                    const multiplier = loginPolicies.progressive_lockout_multiplier;
                    const originalDuration = lockDuration;
                    lockDuration = Math.min(
                        lockDuration * Math.pow(multiplier, estimatedLockoutCount),
                        loginPolicies.max_lockout_duration_minutes
                    );
                    logger.info('Progressive lockout applied', {
                        originalDuration,
                        multiplier,
                        estimatedLockoutCount,
                        calculatedDuration: lockDuration,
                        maxLockoutDuration: loginPolicies.max_lockout_duration_minutes,
                    });
                }

                lockUntil = new Date(Date.now() + lockDuration * 60000);
                logger.warn('Account locked due to failed attempts', {
                    userId: user.id,
                    attempts,
                    maxAttempts,
                    lockDuration,
                    lockUntil: lockUntil.toISOString(),
                    progressiveLockoutEnabled: loginPolicies.progressive_lockout,
                });
            }

            await this.userRepo.incrementFailedAttempts(user.id, lockUntil);
            throw new UnauthorizedError('Invalid credentials');
        }

        // Reset failed attempts on success
        await this.userRepo.resetFailedAttempts(user.id);

        // Check if 2FA is required (use database settings)
        const requires2FA = (user as any).two_factor_enabled ||
            twoFactorConfig.enforce_globally ||
            (twoFactorConfig.enforce_for_admins && user.is_super_admin);

        if (requires2FA && twoFactorConfig.enabled) {
            // Generate and send OTP for 2FA using database settings
            const otpResult = await this.otpRepo.create({
                userId: user.id,
                purpose: 'login_2fa',
                expiresInMinutes: twoFactorConfig.email_otp_expiry_minutes,
                codeLength: twoFactorConfig.email_otp_length,
                maxAttempts: twoFactorConfig.email_otp_max_attempts,
            });

            // Send OTP via notification service
            await publishNotification({
                type: 'otp',
                to: user.email,
                data: {
                    code: otpResult.code,
                    purpose: 'login_2fa',
                    expiryMinutes: twoFactorConfig.email_otp_expiry_minutes,
                    userName: user.full_name,
                },
                metadata: { userId: user.id, source: 'auth-service' },
            });

            // Return a temporary token for 2FA verification
            const tempToken = jwt.sign(
                { id: user.id, purpose: '2fa_pending' },
                config.jwt.secret,
                { expiresIn: '5m' }
            );

            return {
                requiresTwoFactor: true,
                tempToken,
                message: 'Verification code sent to your email',
            };
        }

        // Complete login without 2FA
        return this.completeLogin(user, { deviceInfo, ipAddress, userAgent });
    }

    /**
     * Complete login after password verification (and optional 2FA)
     */
    private async completeLogin(user: any, context: { deviceInfo?: string; ipAddress?: string; userAgent?: string }) {
        // Fetch session settings from database
        const sessionPolicies = await getSessionPolicies();

        // Get roles and permissions
        const roles = await this.userRepo.getUserRoles(user.id);
        const permissions = await this.userRepo.getUserPermissions(user.id);

        // Extract unique event IDs from role assignments
        // Extract context IDs from role assignments
        const assignedEventIds = roles.filter(r => r.event_id).map(r => r.event_id as string);
        const assignedDeptIds = roles.filter(r => r.dept_id).map(r => r.dept_id as string);

        // Also fetch event IDs from assigned departments (implicit access)
        const deptAssociatedEventIds = await this.userRepo.getEventIdsForDepartments(assignedDeptIds);

        const eventIds = [...new Set([...assignedEventIds, ...deptAssociatedEventIds])];
        const deptIds = [...new Set(assignedDeptIds)];
        const serviceIds = [...new Set(
            roles.filter(r => r.service_id).map(r => r.service_id as string)
        )];

        // Generate tokens using database settings
        const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
            id: user.id,
            email: user.email,
            organization_id: user.organization_id,
            isSuperAdmin: user.is_super_admin,
            roles: roles.map(r => r.role),
            permissions: permissions, // Include permissions in JWT
            eventIds, // Include assigned event IDs
            deptIds,  // Include assigned department IDs
            serviceIds, // Include assigned service IDs
        };

        // Use database settings for token expiration
        const tokenExpireMinutes = sessionPolicies.access_token_expire_minutes;
        const refreshTokenExpireDays = sessionPolicies.refresh_token_expire_days;

        const accessToken = jwt.sign(payload, config.jwt.secret, {
            expiresIn: `${tokenExpireMinutes}m`,
        });

        // Generate and store refresh token securely
        const refreshTokenValue = this.generateSecureToken();
        const refreshTokenExpiry = new Date(Date.now() + refreshTokenExpireDays * 24 * 60 * 60 * 1000);

        const tokenRecord = await this.refreshTokenRepo.create({
            userId: user.id,
            token: refreshTokenValue,
            deviceInfo: context.deviceInfo,
            ipAddress: context.ipAddress,
            expiresAt: refreshTokenExpiry,
        });

        // Create session record
        await this.sessionRepo.create({
            userId: user.id,
            refreshTokenId: tokenRecord.id,
            deviceInfo: context.deviceInfo,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            expiresAt: refreshTokenExpiry,
        });

        // Update last login
        await this.userRepo.updateLastLogin(user.id);

        logger.info('User logged in', { userId: user.id, email: user.email });

        return {
            accessToken,
            refreshToken: refreshTokenValue,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                code: user.code,
                organization_id: user.organization_id,
                org_name: (user as any).org_name,
                org_logo: (user as any).logo_url,
                theme_config: (user as any).theme_config,
                is_super_admin: user.is_super_admin,
                timezone: user.timezone,
                roles,
                permissions,
                eventIds,
                deptIds,
                serviceIds,
                two_factor_enabled: (user as any).two_factor_enabled || false,
                force_password_change: (user as any).force_password_change || false,
            },
        };
    }

    /**
     * Verify 2FA code and complete login
     */
    async verify2FA(tempToken: string, code: string, context: { deviceInfo?: string; ipAddress?: string; userAgent?: string }) {
        try {
            const decoded = jwt.verify(tempToken, config.jwt.secret) as { id: string; purpose: string };

            if (decoded.purpose !== '2fa_pending') {
                throw new ForbiddenError('Invalid verification token');
            }

            const user = await this.userRepo.findById(decoded.id);
            if (!user) {
                throw new ForbiddenError('User not found');
            }

            // Verify OTP
            const verification = await this.otpRepo.verify(user.id, code, 'login_2fa');
            if (!verification.valid) {
                throw new UnauthorizedError(verification.error || 'Invalid verification code');
            }

            // Complete login
            return this.completeLogin(user, context);
        } catch (err) {
            if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
                throw err;
            }
            logger.warn('2FA verification failed', { error: (err as Error).message });
            throw new ForbiddenError('Invalid or expired verification token');
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshTokenValue: string, context?: { deviceInfo?: string; ipAddress?: string; userAgent?: string }) {
        // Fetch session settings from database
        const sessionPolicies = await getSessionPolicies();

        // Find the token in database
        const tokenRecord = await this.refreshTokenRepo.findValidToken(refreshTokenValue);

        if (!tokenRecord) {
            logger.warn('Refresh token not found or invalid');
            throw new ForbiddenError('Invalid refresh token');
        }

        // Validate session binding if enabled
        if (sessionPolicies.bind_session_to_ip || sessionPolicies.bind_session_to_user_agent) {
            // Check IP binding
            if (sessionPolicies.bind_session_to_ip && tokenRecord.ip_address && context?.ipAddress) {
                if (tokenRecord.ip_address !== context.ipAddress) {
                    logger.warn('Session IP mismatch during token refresh', {
                        userId: tokenRecord.user_id,
                        originalIp: tokenRecord.ip_address,
                        currentIp: context.ipAddress,
                    });
                    await this.refreshTokenRepo.revokeToken(refreshTokenValue, 'ip_mismatch');
                    throw new ForbiddenError('Session validation failed - IP address changed');
                }
            }

            // Check User Agent binding (with normalization for minor version changes)
            if (sessionPolicies.bind_session_to_user_agent && tokenRecord.device_info && context?.userAgent) {
                const normalizeUA = (ua: string) => ua.replace(/\d+\.\d+\.\d+/g, 'X.X.X');
                const storedUA = normalizeUA(tokenRecord.device_info);
                const currentUA = normalizeUA(context.userAgent);

                if (storedUA !== currentUA) {
                    logger.warn('Session User Agent mismatch during token refresh', {
                        userId: tokenRecord.user_id,
                    });
                    await this.refreshTokenRepo.revokeToken(refreshTokenValue, 'user_agent_mismatch');
                    throw new ForbiddenError('Session validation failed - browser/device changed');
                }
            }
        }

        const user = await this.userRepo.findById(tokenRecord.user_id);

        if (!user) {
            // Revoke the token if user doesn't exist
            await this.refreshTokenRepo.revokeToken(refreshTokenValue, 'user_not_found');
            throw new ForbiddenError('User not found');
        }

        if (!user.is_active) {
            // Revoke the token if user is disabled
            await this.refreshTokenRepo.revokeToken(refreshTokenValue, 'account_disabled');
            throw new ForbiddenError('Account disabled');
        }

        const roles = await this.userRepo.getUserRoles(user.id);
        const permissions = await this.userRepo.getUserPermissions(user.id);

        // Extract unique event IDs from role assignments
        const assignedEventIds = roles.filter(r => r.event_id).map(r => r.event_id as string);
        const assignedDeptIds = roles.filter(r => r.dept_id).map(r => r.dept_id as string);

        // Also fetch event IDs from assigned departments (implicit access)
        const deptAssociatedEventIds = await this.userRepo.getEventIdsForDepartments(assignedDeptIds);

        const eventIds = [...new Set([...assignedEventIds, ...deptAssociatedEventIds])];

        const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
            id: user.id,
            email: user.email,
            organization_id: user.organization_id,
            isSuperAdmin: user.is_super_admin,
            roles: roles.map(r => r.role),
            permissions: permissions, // Include permissions in refresh token payload
            eventIds, // Include assigned event IDs
        };

        const accessToken = jwt.sign(payload, config.jwt.secret, {
            expiresIn: `${sessionPolicies.access_token_expire_minutes}m`,
        });

        logger.debug('Access token refreshed', { userId: user.id });

        return { accessToken };
    }

    /**
     * Logout - revoke refresh token
     */
    async logout(refreshTokenValue: string): Promise<void> {
        const revoked = await this.refreshTokenRepo.revokeToken(refreshTokenValue, 'logout');
        if (revoked) {
            logger.info('User logged out, refresh token revoked');
        }
    }

    /**
     * Logout from all devices - revoke all refresh tokens for user
     */
    async logoutAllDevices(userId: string): Promise<number> {
        const revokedCount = await this.refreshTokenRepo.revokeAllForUser(userId, 'logout_all_devices');
        await this.sessionRepo.deactivateAllForUser(userId);
        logger.info('User logged out from all devices', { userId, revokedCount });
        return revokedCount;
    }

    /**
     * Get active sessions for a user
     */
    async getActiveSessions(userId: string) {
        return this.refreshTokenRepo.getActiveTokensForUser(userId);
    }

    /**
     * Revoke a specific session
     */
    async revokeSession(userId: string, tokenId: string): Promise<boolean> {
        const tokens = await this.refreshTokenRepo.getActiveTokensForUser(userId);
        const token = tokens.find(t => t.id === tokenId);

        if (!token) {
            throw new NotFoundError('Session', tokenId);
        }

        return this.refreshTokenRepo.revokeById(tokenId, 'user_revoked');
    }

    /**
     * Get user profile with roles and permissions
     */
    async getProfile(userId: string) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new NotFoundError('User', userId);
        }

        const roles = await this.userRepo.getUserRoles(userId);
        const permissions = await this.userRepo.getUserPermissions(userId);

        // Extract context IDs from role assignments
        const assignedEventIds = roles.filter(r => r.event_id).map(r => r.event_id as string);
        const assignedDeptIds = roles.filter(r => r.dept_id).map(r => r.dept_id as string);

        // Also fetch event IDs from assigned departments (implicit access)
        const deptAssociatedEventIds = await this.userRepo.getEventIdsForDepartments(assignedDeptIds);

        const eventIds = [...new Set([...assignedEventIds, ...deptAssociatedEventIds])];
        const deptIds = [...new Set(assignedDeptIds)];
        const serviceIds = [...new Set(
            roles.filter(r => r.service_id).map(r => r.service_id as string)
        )];

        return {
            ...user,
            roles,
            permissions,
            eventIds,
            deptIds,
            serviceIds,
        };
    }

    /**
     * Change user password
     * If user has force_password_change flag, current password is not required
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const userById = await this.userRepo.findById(userId);
        if (!userById) {
            throw new NotFoundError('User', userId);
        }

        // Get user with password hash
        const userWithPassword = await this.userRepo.findByEmail(userById.email);
        if (!userWithPassword) {
            throw new NotFoundError('User', userId);
        }

        // Check if this is a forced password change (admin-created user first login)
        const isForcePasswordChange = (userById as any).force_password_change === true;

        // If not a forced change, verify current password
        if (!isForcePasswordChange) {
            if (!currentPassword) {
                throw new BadRequestError('Current password is required');
            }
            const validPass = await argon2.verify(userWithPassword.password_hash, currentPassword);
            if (!validPass) {
                throw new UnauthorizedError('Current password is incorrect');
            }
        }

        // Validate new password against configured policies
        await passwordValidationService.validatePasswordStrength(newPassword);

        const newHash = await argon2.hash(newPassword);
        await this.userRepo.updatePassword(userId, newHash);

        // Revoke all refresh tokens (force re-login)
        await this.refreshTokenRepo.revokeAllForUser(userId, 'password_change');

        // Send notification via notification service
        await publishNotification({
            type: 'password_changed',
            to: userById.email,
            data: { userName: userById.full_name },
            metadata: { userId, source: 'auth-service' },
        });

        logger.info('Password changed', { userId, isForcePasswordChange });
        return { success: true };
    }

    /**
     * Request password reset OTP
     */
    async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
        const user = await this.userRepo.findByEmail(email);

        // Always return success message to prevent email enumeration
        const successMessage = 'If an account exists with this email, a password reset code will be sent.';

        if (!user) {
            logger.warn('Password reset requested for non-existent email', { email });
            return { success: true, message: successMessage };
        }

        if (!user.is_active) {
            logger.warn('Password reset requested for disabled account', { email });
            return { success: true, message: successMessage };
        }

        // Fetch 2FA settings for OTP configuration
        const twoFactorConfig = await getTwoFactorConfig();

        // Generate OTP using database settings
        const otpResult = await this.otpRepo.create({
            userId: user.id,
            purpose: 'password_reset',
            expiresInMinutes: twoFactorConfig.email_otp_expiry_minutes,
            codeLength: twoFactorConfig.email_otp_length,
            maxAttempts: twoFactorConfig.email_otp_max_attempts,
        });

        // Send OTP via notification service
        await publishNotification({
            type: 'otp',
            to: email,
            data: {
                code: otpResult.code,
                purpose: 'password_reset',
                expiryMinutes: twoFactorConfig.email_otp_expiry_minutes,
                userName: user.full_name,
            },
            metadata: { userId: user.id, source: 'auth-service' },
        });

        logger.info('Password reset OTP sent', { userId: user.id });
        return { success: true, message: successMessage };
    }

    /**
     * Reset password with OTP
     */
    async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean }> {
        const user = await this.userRepo.findByEmail(email);

        if (!user) {
            throw new BadRequestError('Invalid email or verification code');
        }

        // Verify OTP
        const verification = await this.otpRepo.verify(user.id, code, 'password_reset');
        if (!verification.valid) {
            throw new BadRequestError(verification.error || 'Invalid verification code');
        }

        // Update password
        const newHash = await argon2.hash(newPassword);
        await this.userRepo.updatePassword(user.id, newHash);

        // Revoke all refresh tokens
        await this.refreshTokenRepo.revokeAllForUser(user.id, 'password_reset');

        // Send notification via notification service
        await publishNotification({
            type: 'password_changed',
            to: email,
            data: { userName: user.full_name },
            metadata: { userId: user.id, source: 'auth-service' },
        });

        logger.info('Password reset completed', { userId: user.id });
        return { success: true };
    }

    /**
     * Request email verification OTP
     */
    async requestEmailVerification(userId: string): Promise<{ success: boolean }> {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new NotFoundError('User', userId);
        }

        if ((user as any).email_verified) {
            throw new BadRequestError('Email is already verified');
        }

        // Fetch 2FA settings for OTP configuration
        const twoFactorConfig = await getTwoFactorConfig();

        // Generate OTP using database settings
        const otpResult = await this.otpRepo.create({
            userId: user.id,
            purpose: 'email_verification',
            expiresInMinutes: twoFactorConfig.email_otp_expiry_minutes,
            codeLength: twoFactorConfig.email_otp_length,
            maxAttempts: twoFactorConfig.email_otp_max_attempts,
        });

        // Send OTP via notification service
        await publishNotification({
            type: 'otp',
            to: user.email,
            data: {
                code: otpResult.code,
                purpose: 'email_verification',
                expiryMinutes: twoFactorConfig.email_otp_expiry_minutes,
                userName: user.full_name,
            },
            metadata: { userId, source: 'auth-service' },
        });

        logger.info('Email verification OTP sent', { userId });
        return { success: true };
    }

    /**
     * Verify email with OTP
     */
    async verifyEmail(userId: string, code: string): Promise<{ success: boolean }> {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new NotFoundError('User', userId);
        }

        // Verify OTP
        const verification = await this.otpRepo.verify(user.id, code, 'email_verification');
        if (!verification.valid) {
            throw new BadRequestError(verification.error || 'Invalid verification code');
        }

        // Mark email as verified
        await this.userRepo.updateEmailVerified(userId, true);

        logger.info('Email verified', { userId });
        return { success: true };
    }

    /**
     * Enable 2FA for user
     */
    async enable2FA(userId: string): Promise<{ success: boolean }> {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new NotFoundError('User', userId);
        }

        await this.userRepo.update2FAStatus(userId, true);
        await publishNotification({
            type: '2fa_enabled',
            to: user.email,
            data: { userName: user.full_name },
            metadata: { userId, source: 'auth-service' },
        });

        logger.info('2FA enabled', { userId });
        return { success: true };
    }

    /**
     * Disable 2FA for user
     */
    async disable2FA(userId: string, password: string): Promise<{ success: boolean }> {
        const user = await this.userRepo.findByEmail(userId);
        if (!user) {
            const userById = await this.userRepo.findById(userId);
            if (!userById) {
                throw new NotFoundError('User', userId);
            }
            const userWithPassword = await this.userRepo.findByEmail(userById.email);
            if (!userWithPassword) {
                throw new NotFoundError('User', userId);
            }

            const validPass = await argon2.verify(userWithPassword.password_hash, password);
            if (!validPass) {
                throw new UnauthorizedError('Invalid password');
            }

            await this.userRepo.update2FAStatus(userId, false);
            logger.info('2FA disabled', { userId });
            return { success: true };
        }

        const validPass = await argon2.verify(user.password_hash, password);
        if (!validPass) {
            throw new UnauthorizedError('Invalid password');
        }

        await this.userRepo.update2FAStatus(userId, false);
        logger.info('2FA disabled', { userId });
        return { success: true };
    }

    /**
     * Check session validity (for session timeout)
     */
    async validateSession(sessionId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
        // Fetch session settings from database
        const sessionPolicies = await getSessionPolicies();

        // Check session binding (IP and User Agent)
        if (sessionPolicies.bind_session_to_ip || sessionPolicies.bind_session_to_user_agent) {
            const bindingResult = await this.sessionRepo.validateSessionBinding(
                sessionId,
                ipAddress || null,
                userAgent || null,
                sessionPolicies.bind_session_to_ip,
                sessionPolicies.bind_session_to_user_agent
            );

            if (!bindingResult.valid) {
                logger.warn('Session binding validation failed', {
                    sessionId,
                    reason: bindingResult.reason,
                    bindToIp: sessionPolicies.bind_session_to_ip,
                    bindToUserAgent: sessionPolicies.bind_session_to_user_agent,
                });
                await this.sessionRepo.deactivate(sessionId);
                return false;
            }
        }

        if (!sessionPolicies.session_timeout_enabled) {
            return true;
        }

        const isTimedOut = await this.sessionRepo.isSessionTimedOut(
            sessionId,
            sessionPolicies.session_timeout_minutes
        );

        if (isTimedOut) {
            await this.sessionRepo.deactivate(sessionId);
            return false;
        }

        // Update last activity
        await this.sessionRepo.updateLastActivity(sessionId);
        return true;
    }

    /**
     * Cleanup expired tokens and sessions (maintenance task)
     */
    async cleanup(): Promise<{ tokens: number; otps: number; sessions: number }> {
        const [tokens, otps, sessions] = await Promise.all([
            this.refreshTokenRepo.cleanupExpiredTokens(),
            this.otpRepo.cleanupExpiredOtps(),
            this.sessionRepo.cleanupExpiredSessions(),
        ]);

        logger.info('Cleanup completed', { tokens, otps, sessions });
        return { tokens, otps, sessions };
    }

    /**
     * Get password policies for frontend validation
     */
    async getPasswordPolicies() {
        return passwordValidationService.getPolicies();
    }
}
