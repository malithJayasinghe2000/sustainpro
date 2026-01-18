/**
 * Permission-based Authorization Middleware
 * Best Practice: Dynamic permission checking with caching
 * Supports distributed cache invalidation via RabbitMQ
 */

import { Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '@sustainpro/shared-database';
import {
    ForbiddenError,
    UnauthorizedError,
    initCacheInvalidation,
    getCacheInvalidationService,
    CacheInvalidationMessage,
    logger
} from '@sustainpro/shared-utils';

const prisma = getPrismaClient();

// Cache for user permissions (5 minute TTL)
const permissionCache = new Map<string, { permissions: string[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize cache invalidation listener for this service
 * Call this during service startup
 */
export async function initPermissionCacheInvalidation(serviceName: string, rabbitmqUrl: string): Promise<void> {
    try {
        const cacheService = await initCacheInvalidation({
            url: rabbitmqUrl,
            serviceName,
            enabled: !!rabbitmqUrl
        });

        // Register handler for cache invalidation events
        cacheService.onInvalidation((message: CacheInvalidationMessage) => {
            switch (message.type) {
                case 'user_permissions':
                case 'user_role_changed':
                    if (message.userId) {
                        clearPermissionCache(message.userId);
                        logger.debug(`[PermissionCache] Cleared cache for user ${message.userId} (event from ${message.source})`);
                    }
                    break;
                case 'role_updated':
                    // When a role is updated, clear ALL caches (could be optimized later)
                    clearAllPermissionCache();
                    logger.debug(`[PermissionCache] Cleared all caches due to role update (event from ${message.source})`);
                    break;
                case 'all_permissions':
                    clearAllPermissionCache();
                    logger.debug(`[PermissionCache] Cleared all caches (event from ${message.source})`);
                    break;
            }
        });

        logger.info(`[PermissionCache] Cache invalidation initialized for ${serviceName}`);
    } catch (error) {
        logger.warn('[PermissionCache] Failed to initialize cache invalidation - running in standalone mode', {
            error: (error as Error).message
        });
    }
}

/**
 * Get user's permissions from database with caching
 */
async function getUserPermissions(userId: string): Promise<string[]> {
    // Check cache
    const cached = permissionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.permissions;
    }

    // Query from database - using correct table name sps_role_permissions
    const result = await prisma.$queryRaw<{ code: string }[]>`
        SELECT DISTINCT p.code
        FROM sps_permissions p
        INNER JOIN sps_role_permissions rp ON p.id = rp.permission_id
        INNER JOIN sps_role_assignments ra ON rp.role = ra.role
        WHERE ra.user_id = ${userId}::uuid
    `;

    const permissions = result.map((r: { code: string }) => r.code);

    // Update cache
    permissionCache.set(userId, {
        permissions,
        timestamp: Date.now(),
    });

    return permissions;
}

/**
 * Clear permission cache for a user (call after role changes)
 */
export function clearPermissionCache(userId: string): void {
    permissionCache.delete(userId);
}

/**
 * Clear all permission caches
 */
export function clearAllPermissionCache(): void {
    permissionCache.clear();
}

/**
 * Publish cache invalidation event (call from auth-service when roles change)
 */
export async function publishPermissionCacheInvalidation(
    type: 'user_permissions' | 'role_updated' | 'user_role_changed' | 'all_permissions',
    options?: { userId?: string; roleCode?: string }
): Promise<boolean> {
    const cacheService = getCacheInvalidationService();
    if (!cacheService) {
        return false;
    }

    switch (type) {
        case 'user_permissions':
            if (options?.userId) {
                return cacheService.invalidateUserPermissions(options.userId);
            }
            break;
        case 'role_updated':
            if (options?.roleCode) {
                return cacheService.invalidateRolePermissions(options.roleCode);
            }
            break;
        case 'user_role_changed':
            if (options?.userId && options?.roleCode) {
                return cacheService.invalidateUserRole(options.userId, options.roleCode);
            }
            break;
        case 'all_permissions':
            return cacheService.invalidateAll();
    }
    return false;
}

/**
 * Middleware to check if user has specific permission
 * @param permission - Permission code (e.g., 'devices.manage')
 */
export function requirePermission(permission: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            // Super admin has all permissions
            if (req.user.isSuperAdmin) {
                return next();
            }

            const userPermissions = await getUserPermissions(req.user.id);
            if (req.user) { (req.user as any).permissions = userPermissions; }

            if (!userPermissions.includes(permission)) {
                throw new ForbiddenError(`Permission denied: ${permission} required`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware to check if user has ANY of the specified permissions
 */
export function requireAnyPermission(...permissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            // Super admin has all permissions
            if (req.user.isSuperAdmin) {
                return next();
            }

            const userPermissions = await getUserPermissions(req.user.id);
            if (req.user) { (req.user as any).permissions = userPermissions; }
            const hasAny = permissions.some(p => userPermissions.includes(p));

            if (!hasAny) {
                throw new ForbiddenError(`Permission denied: One of [${permissions.join(', ')}] required`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware to check if user has ALL specified permissions
 */
export function requireAllPermissions(...permissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            // Super admin has all permissions
            if (req.user.isSuperAdmin) {
                return next();
            }

            const userPermissions = await getUserPermissions(req.user.id);
            if (req.user) { (req.user as any).permissions = userPermissions; }
            const hasAll = permissions.every(p => userPermissions.includes(p));

            if (!hasAll) {
                throw new ForbiddenError(`Permission denied: All of [${permissions.join(', ')}] required`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Get user's permissions (for use in controllers)
 */
export async function getUserPermissionsList(userId: string, isSuperAdmin: boolean = false): Promise<string[]> {
    if (isSuperAdmin) {
        // Return all permissions for super admin
        const allPerms = await prisma.sps_permissions.findMany({
            select: { code: true },
        });
        return allPerms.map((p: { code: string }) => p.code);
    }

    return getUserPermissions(userId);
}
