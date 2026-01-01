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

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

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

