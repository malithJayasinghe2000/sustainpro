/**
 * Role Controller
 * Handles HTTP requests for role management
 * 
 * NOTE: Roles are seeded from the database seed file.
 * This controller only provides read access and display property updates.
 */

import { Request, Response, NextFunction } from 'express';
import { roleService } from '../services/role.service';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'auth-service' });

/**
 * GET /roles
 * Get all roles or assignable roles based on query params
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const assignableOnly = req.query.assignable === 'true';
        const user = (req as any).user;

        let roles;

        if (assignableOnly && !user.isSuperAdmin) {
            // Get user's highest level and return only assignable roles
            const userHighestLevel = await roleService.getUserHighestLevel(user.id);
            roles = await roleService.getAssignableRoles(userHighestLevel);
        } else if (user.isSuperAdmin) {
            // Super admin can see all roles
            roles = await roleService.getAll(true);
        } else {
            // Regular users see active roles only
            roles = await roleService.getAll(false);
        }

        res.json({
            success: true,
            data: roles,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /roles/:code
 * Get role by code
 */
export const getByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { code } = req.params;
        const role = await roleService.getByCode(code);

        if (!role) {
            res.status(404).json({
                success: false,
                error: `Role not found: ${code}`,
            });
            return;
        }

        res.json({
            success: true,
            data: role,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /roles/:id
 * Update a role's display properties (Super Admin only)
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;

        if (!user.isSuperAdmin) {
            res.status(403).json({
                success: false,
                error: 'Only Super Admins can update roles',
            });
            return;
        }

        const { id } = req.params;
        const { name, description, icon, color } = req.body;

        // Only allow updating display properties, not level or is_active
        const role = await roleService.update(id, {
            name,
            description,
            icon,
            color,
        });

        logger.info('Role display properties updated', { roleId: id, updatedBy: user.id });

        res.json({
            success: true,
            data: role,
        });
    } catch (error) {
        next(error);
    }
};
