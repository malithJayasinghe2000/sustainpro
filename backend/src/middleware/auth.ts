import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                email: string;
                id: string;
                organization_id: string;
                isSuperAdmin: boolean;
                roles?: string[]; // Optional: Roles cached in token
            };
        }
    }
}

// Middleware to verify JWT token
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    // SECURITY: No fallback - JWT_SECRET must be set in environment
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error('FATAL: JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        req.user = decoded as {
            email: string;
            id: string;
            organization_id: string;
            isSuperAdmin: boolean;
            roles?: string[];
        };
        next();
    });
};

