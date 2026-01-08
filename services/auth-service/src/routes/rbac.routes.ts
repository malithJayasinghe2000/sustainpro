import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticateToken, requireSuperAdmin } from '@sustainpro/shared-middleware';

const router = Router();

// All RBAC routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /rbac/permissions:
 *   get:
 *     tags: [RBAC]
 *     summary: Get all permissions
 *     description: Get list of all available permissions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
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
 * @swagger
 * /rbac/mappings:
 *   get:
 *     tags: [RBAC]
 *     summary: Get role-permission mappings
 *     description: Get all role-permission mappings (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Role-permission mappings
 *       403:
 *         description: Forbidden - Super Admin required
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
 * @swagger
 * /rbac/mappings:
 *   post:
 *     tags: [RBAC]
 *     summary: Update role-permission mapping
 *     description: Update permissions for a role (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, permissions]
 *             properties:
 *               role:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Permissions updated
 *       403:
 *         description: Forbidden - Super Admin required
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
