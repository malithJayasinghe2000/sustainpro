/**
 * JWT Authentication Middleware
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '@sustainpro/shared-types';
import { UnauthorizedError } from '@sustainpro/shared-utils';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Middleware to verify JWT token from Authorization header
 */
export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer <token>

    if (!token) {
        res.status(401).json({
            success: false,
            error: 'Access token required'
        });
        return;
    }

    // Use the same fallback as auth-service config to ensure consistency
    const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    if (!secret) {
        console.error('JWT_SECRET not configured');
        res.status(500).json({
            success: false,
            error: 'Server configuration error'
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        req.user = decoded;
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
            return;
        }
        res.status(403).json({
            success: false,
            error: 'Invalid token'
        });
    }
};

/**
 * Optional auth - doesn't fail if no token, just sets req.user if valid
 */
export const optionalAuth = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        next();
        return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        next();
        return;
    }

    try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        req.user = decoded;
    } catch {
        // Ignore invalid tokens for optional auth
    }
    next();
};
