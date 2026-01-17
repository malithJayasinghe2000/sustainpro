/**
 * RBAC Controller
 * Handles HTTP requests for role and permission management
 */

import { Request, Response, NextFunction } from 'express';
import { rbacService } from '../services/rbac.service';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'auth-service' });

/**
 * GET /rbac/permissions
 * Get all available permissions
 */
export const getPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const permissions = await rbacService.getAllPermissions();

        res.json({
            success: true,
            data: permissions.map(p => ({
                id: p.id,
                code: p.code,
                name: p.name,
                description: p.description,
                module: p.category, // Map category to module for frontend compatibility
            })),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /rbac/permissions/grouped
 * Get all permissions grouped by category
 */
export const getPermissionsGrouped = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const grouped = await rbacService.getPermissionsGroupedByCategory();

        res.json({
            success: true,
            data: grouped,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /rbac/mappings
 * Get all role-permission mappings
 */
export const getMappings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const mappings = await rbacService.getRolePermissionMappings();

        res.json({
            success: true,
            data: mappings,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /rbac/mappings
 * Update permissions for a role
 */
export const updateMapping = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { role, permissions } = req.body;
        const user = (req as any).user;

        if (!role || !Array.isArray(permissions)) {
            res.status(400).json({
                success: false,
                error: 'Role and permissions array required',
            });
            return;
        }

        await rbacService.updateRolePermissions(role, permissions);

        logger.info('Role permissions updated via API', { 
            role, 
            permissionCount: permissions.length,
            updatedBy: user?.id 
        });

        res.json({
            success: true,
            message: 'Permissions updated successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /rbac/user/:userId/permissions
 * Get permissions for a specific user (for debugging)
 */
export const getUserPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId } = req.params;
        const permissions = await rbacService.getUserPermissions(userId);

        res.json({
            success: true,
            data: permissions,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /rbac/my-permissions
 * Get current user's permissions
 */
export const getMyPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user?.id) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        // Super admin has all permissions
        if (req.user.isSuperAdmin) {
            const allPermissions = await rbacService.getAllPermissions();
            res.json({
                success: true,
                data: allPermissions.map(p => p.code),
            });
            return;
        }

        const permissions = await rbacService.getUserPermissions(req.user.id);

        res.json({
            success: true,
            data: permissions,
        });
    } catch (error) {
        next(error);
    }
};
