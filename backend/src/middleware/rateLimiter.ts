import rateLimit from 'express-rate-limit';
import { getSecuritySettings } from '../services/settings';

// SECURITY: Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Rate limiter for login attempts (per IP)
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 5 : 1000, // Production: 5 attempts, Dev: 1000
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            error: options.message
        });
    },
    message: 'Too many login attempts from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for registration (per IP)
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isProduction ? 3 : 100, // Production: 3 attempts, Dev: 100
    message: 'Too many registration attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 5000, // Production: 100 requests, Dev: 5000
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
