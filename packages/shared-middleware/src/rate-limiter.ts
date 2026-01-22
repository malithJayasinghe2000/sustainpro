/**
 * Rate Limiting Middleware
 * Supports both static and dynamic (database-driven) rate limiting
 */
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

/**
 * API Security Config interface for database settings
 * Uses null | undefined to be compatible with Prisma's nullable fields
 */
export interface ApiSecurityConfig {
    rate_limit_enabled?: boolean | null;
    rate_limit_requests?: number | null;
    rate_limit_window_minutes?: number | null;
    rate_limit_by?: string | null; // IP, USER, API_KEY
}

/**
 * Cache for API security settings (60 second TTL)
 */
let cachedApiSecurityConfig: ApiSecurityConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Function to set API security config fetcher (set by services that have DB access)
 */
type ApiSecurityConfigFetcher = () => Promise<ApiSecurityConfig | null>;
let configFetcher: ApiSecurityConfigFetcher | null = null;

export const setApiSecurityConfigFetcher = (fetcher: ApiSecurityConfigFetcher) => {
    configFetcher = fetcher;
};

/**
 * Get API security config with caching
 */
const getApiSecurityConfig = async (): Promise<ApiSecurityConfig> => {
    const now = Date.now();
    
    // Return cached config if still valid
    if (cachedApiSecurityConfig && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedApiSecurityConfig;
    }

    // Fetch from database if fetcher is configured
    if (configFetcher) {
        try {
            const config = await configFetcher();
            if (config) {
                cachedApiSecurityConfig = config;
                cacheTimestamp = now;
                return config;
            }
        } catch (error) {
            console.error('Failed to fetch API security config:', error);
        }
    }

    // Return defaults if no fetcher or fetch failed
    return {
        rate_limit_enabled: true,
        rate_limit_requests: 100,
        rate_limit_window_minutes: 15,
        rate_limit_by: 'IP',
    };
};

/**
 * Key generator based on rate_limit_by setting
 */
const getKeyGenerator = (rateLimitBy: string) => {
    return (req: Request): string => {
        switch (rateLimitBy) {
            case 'USER':
                // Use user ID if available, fall back to IP
                return (req as any).user?.user_id || req.ip || 'unknown';
            case 'API_KEY':
                // Use API key if available, fall back to IP
                return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
            case 'IP':
            default:
                return req.ip || 'unknown';
        }
    };
};

/**
 * Static rate limiters (fallback defaults)
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

/**
 * Dynamic rate limiter cache (recreated when settings change)
 */
let dynamicLimiterCache: {
    limiter: RateLimitRequestHandler;
    config: ApiSecurityConfig;
    createdAt: number;
} | null = null;

/**
 * Create or get cached dynamic rate limiter
 */
const getOrCreateDynamicLimiter = async (): Promise<RateLimitRequestHandler | null> => {
    const config = await getApiSecurityConfig();
    
    // If rate limiting is disabled, return null
    if (!config.rate_limit_enabled) {
        return null;
    }

    const now = Date.now();
    
    // Check if we need to recreate the limiter (settings changed or cache expired)
    if (
        dynamicLimiterCache &&
        (now - dynamicLimiterCache.createdAt) < CACHE_TTL_MS &&
        dynamicLimiterCache.config.rate_limit_requests === config.rate_limit_requests &&
        dynamicLimiterCache.config.rate_limit_window_minutes === config.rate_limit_window_minutes &&
        dynamicLimiterCache.config.rate_limit_by === config.rate_limit_by
    ) {
        return dynamicLimiterCache.limiter;
    }

    // Create new limiter with current settings
    const windowMs = (config.rate_limit_window_minutes || 15) * 60 * 1000;
    const max = config.rate_limit_requests || 100;
    const rateLimitBy = config.rate_limit_by || 'IP';

    const limiter = rateLimit({
        windowMs,
        max,
        keyGenerator: getKeyGenerator(rateLimitBy),
        message: {
            success: false,
            error: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    dynamicLimiterCache = { limiter, config, createdAt: now };
    return limiter;
};

/**
 * Dynamic API rate limiter middleware that reads settings from database
 * Falls back to static limiter if database settings are not available
 */
export const dynamicApiLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const limiter = await getOrCreateDynamicLimiter();
        
        if (limiter) {
            limiter(req, res, next);
            return;
        }
        
        // Rate limiting disabled, proceed
        next();
    } catch (error) {
        console.error('Dynamic rate limiter error, using fallback:', error);
        // Fall back to static limiter on error
        apiLimiter(req, res, next);
    }
};

/**
 * Clear rate limiter cache (call when settings are updated)
 */
export const clearRateLimiterCache = (): void => {
    cachedApiSecurityConfig = null;
    cacheTimestamp = 0;
    dynamicLimiterCache = null;
};
