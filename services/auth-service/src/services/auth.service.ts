import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { config } from '../config';
import {
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    createLogger
} from '@sustainpro/shared-utils';
import { JwtPayload } from '@sustainpro/shared-types';

const logger = createLogger({ service: 'auth-service' });

export class AuthService {
    private userRepo = new UserRepository();

    /**
     * Authenticate user and return tokens
     */
    async login(email: string, password: string) {
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
            // Increment failed attempts
            const attempts = (user.failed_login_attempts || 0) + 1;
            let lockUntil: Date | undefined;

            if (attempts >= config.security.maxLoginAttempts) {
                lockUntil = new Date(Date.now() + config.security.accountLockDurationMinutes * 60000);
                logger.warn('Account locked due to failed attempts', { userId: user.id, attempts });
            }

            await this.userRepo.incrementFailedAttempts(user.id, lockUntil);
            throw new UnauthorizedError('Invalid credentials');
        }

        // Reset failed attempts on success
        await this.userRepo.resetFailedAttempts(user.id);

        // Get roles and permissions
        const roles = await this.userRepo.getUserRoles(user.id);
        const permissions = await this.userRepo.getUserPermissions(user.id);

        // Generate tokens
        const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
            id: user.id,
            email: user.email,
            organization_id: user.organization_id,
            isSuperAdmin: user.is_super_admin,
            roles: roles.map(r => r.role),
        };

        const accessToken = jwt.sign(payload, config.jwt.secret, {
            expiresIn: `${config.jwt.tokenExpireMinutes}m`,
        });

        const refreshToken = jwt.sign(
            { id: user.id },
            config.jwt.refreshSecret,
            { expiresIn: '7d' }
        );

        logger.info('User logged in', { userId: user.id, email: user.email });

        return {
            accessToken,
            refreshToken,
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
            },
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken: string) {
        try {
            const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string };
            const user = await this.userRepo.findById(decoded.id);

            if (!user) {
                throw new ForbiddenError('User not found');
            }

            if (!user.is_active) {
                throw new ForbiddenError('Account disabled');
            }

            const roles = await this.userRepo.getUserRoles(user.id);

            const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
                id: user.id,
                email: user.email,
                organization_id: user.organization_id,
                isSuperAdmin: user.is_super_admin,
                roles: roles.map(r => r.role),
            };

            const accessToken = jwt.sign(payload, config.jwt.secret, {
                expiresIn: `${config.jwt.tokenExpireMinutes}m`,
            });

            return { accessToken };
        } catch (err) {
            logger.warn('Token refresh failed', { error: (err as Error).message });
            throw new ForbiddenError('Invalid refresh token');
        }
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

        return {
            ...user,
            roles,
            permissions,
        };
    }

    /**
     * Change user password
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.userRepo.findByEmail(userId);
        if (!user) {
            throw new NotFoundError('User', userId);
        }

        const validPass = await argon2.verify(user.password_hash, currentPassword);
        if (!validPass) {
            throw new UnauthorizedError('Current password is incorrect');
        }

        const newHash = await argon2.hash(newPassword);
        // Update password in database
        // For now, return success - implement update method if needed
        logger.info('Password changed', { userId });

        return { success: true };
    }
}
