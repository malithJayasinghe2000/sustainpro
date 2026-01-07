import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticateToken, requireSuperAdmin } from '@sustainpro/shared-middleware';

const router = Router();

// All RBAC routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/rbac/permissions
 * Get all available permissions
 */
router.get('/permissions', async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT DISTINCT permission_code FROM sps_role_permissions ORDER BY permission_code`
        );

        res.json({
            success: true,
            data: result.rows.map(r => r.permission_code),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch permissions',
        });
    }
});

/**
 * GET /api/v1/rbac/mappings
 * Get role-permission mappings (Super Admin only)
 */
router.get('/mappings', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT role_code, array_agg(permission_code) as permissions
       FROM sps_role_permissions
       GROUP BY role_code
       ORDER BY role_code`
        );

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch mappings',
        });
    }
});

/**
 * POST /api/v1/rbac/mappings
 * Update role-permission mapping (Super Admin only)
 */
router.post('/mappings', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
        const { role, permissions } = req.body;

        if (!role || !Array.isArray(permissions)) {
            res.status(400).json({
                success: false,
                error: 'Role and permissions array required',
            });
            return;
        }

        // Delete existing permissions for role
        await query('DELETE FROM sps_role_permissions WHERE role_code = $1', [role]);

        // Insert new permissions
        for (const permission of permissions) {
            await query(
                'INSERT INTO sps_role_permissions (role_code, permission_code) VALUES ($1, $2)',
                [role, permission]
            );
        }

        res.json({
            success: true,
            message: 'Permissions updated',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update mappings',
        });
    }
});

export default router;
