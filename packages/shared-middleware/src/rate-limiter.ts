/**
 * Rate Limiting Middleware
 */
import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 login attempts per windowMs
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Telemetry ingestion rate limiter (higher limits for IoT)
 */
export const telemetryLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 600, // 10 requests per second average
    message: {
        success: false,
        error: 'Telemetry rate limit exceeded',
        code: 'TELEMETRY_RATE_LIMIT',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Create a custom rate limiter
 */
export const createRateLimiter = (options: {
    windowMs: number;
    max: number;
    message?: string;
}) => {
    return rateLimit({
        windowMs: options.windowMs,
        max: options.max,
        message: {
            success: false,
            error: options.message || 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};
