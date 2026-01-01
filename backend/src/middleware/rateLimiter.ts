import rateLimit from 'express-rate-limit';
import { getSecuritySettings } from '../services/settings';

// Rate limiter for login attempts (per IP)
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased to 1000 to prevent blocking during dev
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
    max: 100, // Increased for dev
    message: 'Too many registration attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Increased for dev
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
