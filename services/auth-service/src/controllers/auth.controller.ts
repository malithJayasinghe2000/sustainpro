import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthService, LoginRequest } from '../services/auth.service';
import { config } from '../config';
import { AppError } from '@sustainpro/shared-utils';

const authService = new AuthService();

/**
 * Extract client info from request
 */
const getClientInfo = (req: Request) => ({
    deviceInfo: req.headers['x-device-info'] as string || undefined,
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent'],
});

/**
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                errors: errors.array()
            });
            return;
        }

        const { email, password } = req.body;
        const clientInfo = getClientInfo(req);

        const loginRequest: LoginRequest = {
            email,
            password,
            ...clientInfo,
        };

        const result = await authService.login(loginRequest);

        // Check if 2FA is required
        if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
            res.json({
                success: true,
                requiresTwoFactor: true,
                tempToken: result.tempToken,
                message: result.message,
            });
            return;
        }

        // Type guard confirms this is a successful login result
        const loginResult = result as { accessToken: string; refreshToken: string; user: any };

        // Set refresh token as HTTP-only cookie
        res.cookie('refresh_token', loginResult.refreshToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
            maxAge: config.jwt.refreshTokenExpireDays * 24 * 60 * 60 * 1000,
        });

        res.json({
            success: true,
            message: 'Login successful',
            token: loginResult.accessToken,
            user: loginResult.user,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/verify-2fa
 */
export const verify2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                errors: errors.array()
            });
            return;
        }

        const { tempToken, code } = req.body;
        const clientInfo = getClientInfo(req);

        const result = await authService.verify2FA(tempToken, code, clientInfo);

        // Set refresh token as HTTP-only cookie
        res.cookie('refresh_token', result.refreshToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
            maxAge: config.jwt.refreshTokenExpireDays * 24 * 60 * 60 * 1000,
        });

        res.json({
            success: true,
            message: 'Login successful',
            token: result.accessToken,
            user: result.user,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
        await authService.logout(refreshToken);
    }

    res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
    });

    res.json({
        success: true,
        message: 'Logged out successfully',
    });
};

/**
 * POST /api/v1/auth/logout-all
 */
export const logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        const revokedCount = await authService.logoutAllDevices(req.user.id);

        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
        });

        res.json({
            success: true,
            message: `Logged out from ${revokedCount} device(s)`,
            revokedCount,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/refresh
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            res.status(401).json({
                success: false,
                error: 'Refresh token required',
            });
            return;
        }

        const result = await authService.refreshToken(refreshToken);

        res.json({
            success: true,
            token: result.accessToken,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * GET /api/v1/auth/me
 */
export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        const profile = await authService.getProfile(req.user.id);

        res.json({
            success: true,
            user: profile,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * GET /api/v1/auth/sessions
 */
export const getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        const sessions = await authService.getActiveSessions(req.user.id);

        res.json({
            success: true,
            sessions: sessions.map(s => ({
                id: s.id,
                device_info: s.device_info,
                ip_address: s.ip_address,
                created_at: s.created_at,
                expires_at: s.expires_at,
            })),
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 */
export const revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        const { sessionId } = req.params;
        await authService.revokeSession(req.user.id, sessionId);

        res.json({
            success: true,
            message: 'Session revoked',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/change-password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                errors: errors.array()
            });
            return;
        }

        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        const { currentPassword, newPassword } = req.body;
        await authService.changePassword(req.user.id, currentPassword, newPassword);

        // Clear refresh token to force re-login
        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
        });

        res.json({
            success: true,
            message: 'Password changed successfully. Please log in again.',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                errors: errors.array()
            });
            return;
        }

        const { email } = req.body;
        const result = await authService.requestPasswordReset(email);

        res.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                errors: errors.array()
            });
            return;
        }

        const { email, code, newPassword } = req.body;
        await authService.resetPassword(email, code, newPassword);

        res.json({
            success: true,
            message: 'Password reset successfully. Please log in with your new password.',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/request-email-verification
 */
export const requestEmailVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        await authService.requestEmailVerification(req.user.id);

        res.json({
            success: true,
            message: 'Verification code sent to your email',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/verify-email
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                errors: errors.array()
            });
            return;
        }

        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        const { code } = req.body;
        await authService.verifyEmail(req.user.id, code);

        res.json({
            success: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/2fa/enable
 */
export const enable2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        await authService.enable2FA(req.user.id);

        res.json({
            success: true,
            message: 'Two-factor authentication enabled',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/auth/2fa/disable
 */
export const disable2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                errors: errors.array()
            });
            return;
        }

        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        const { password } = req.body;
        await authService.disable2FA(req.user.id, password);

        res.json({
            success: true,
            message: 'Two-factor authentication disabled',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * GET /api/v1/auth/password-policy
 * Get password policy requirements (public endpoint for frontend validation)
 */
export const getPasswordPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policies = await authService.getPasswordPolicies();

        res.json({
            success: true,
            policies,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};
