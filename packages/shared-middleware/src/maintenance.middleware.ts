/**
 * Maintenance Mode Middleware
 * Blocks API requests (except for super admins) when maintenance mode is enabled
 */
import { Request, Response, NextFunction } from 'express';

/**
 * System settings interface for maintenance mode
 * Uses null | undefined to be compatible with Prisma's nullable fields
 */
export interface MaintenanceSettings {
    maintenance_mode?: boolean | null;
    maintenance_message?: string | null;
}

/**
 * Cache for system settings (30 second TTL for faster response to maintenance changes)
 */
let cachedSettings: MaintenanceSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Function to set maintenance settings fetcher (set by services that have DB access)
 */
type MaintenanceSettingsFetcher = () => Promise<MaintenanceSettings | null>;
let settingsFetcher: MaintenanceSettingsFetcher | null = null;

export const setMaintenanceSettingsFetcher = (fetcher: MaintenanceSettingsFetcher) => {
    settingsFetcher = fetcher;
};

/**
 * Get maintenance settings with caching
 */
const getMaintenanceSettings = async (): Promise<MaintenanceSettings> => {
    const now = Date.now();
    
    // Return cached settings if still valid
    if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedSettings;
    }

    // Fetch from database if fetcher is configured
    if (settingsFetcher) {
        try {
            const settings = await settingsFetcher();
            if (settings) {
                cachedSettings = settings;
                cacheTimestamp = now;
                return settings;
            }
        } catch (error) {
            console.error('Failed to fetch maintenance settings:', error);
        }
    }

    // Return defaults if no fetcher or fetch failed
    return {
        maintenance_mode: false,
        maintenance_message: 'System is under maintenance',
    };
};

/**
 * Paths that should be allowed even during maintenance
 */
const ALLOWED_PATHS = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/health',
    '/health',
    '/api/settings/system', // Allow super admins to disable maintenance
];

/**
 * Check if a path should be allowed during maintenance
 */
const isAllowedPath = (path: string): boolean => {
    return ALLOWED_PATHS.some(allowed => path.startsWith(allowed));
};

/**
 * Maintenance mode middleware
 * Blocks all API requests except for super admins and allowed paths
 */
export const maintenanceMode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await getMaintenanceSettings();
        
        // If maintenance mode is not enabled, proceed
        if (!settings.maintenance_mode) {
            return next();
        }

        // Allow certain paths even during maintenance
        if (isAllowedPath(req.path)) {
            return next();
        }

        // Allow super admins to bypass maintenance mode
        const user = (req as any).user;
        if (user?.is_super_admin) {
            return next();
        }

        // Block the request
        res.status(503).json({
            success: false,
            error: settings.maintenance_message || 'System is currently under maintenance. Please try again later.',
            code: 'MAINTENANCE_MODE',
        });
    } catch (error) {
        console.error('Maintenance mode middleware error:', error);
        // On error, allow the request through to avoid blocking everything
        next();
    }
};

/**
 * Clear maintenance settings cache (call when settings are updated)
 */
export const clearMaintenanceCache = (): void => {
    cachedSettings = null;
    cacheTimestamp = 0;
};
