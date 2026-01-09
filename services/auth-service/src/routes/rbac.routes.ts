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
 *     description: Get list of all available permissions with details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/permissions', async (req: Request, res: Response): Promise<void> => {
    try {
        // Get all permissions with full details
        const result = await query(
            `SELECT id, code, name, description, category as module FROM sps_permissions ORDER BY category, code`
        );

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Failed to fetch permissions:', error);
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
        // Get mappings using actual column names: role, permission_id
        const result = await query(
            `SELECT rp.role, array_agg(p.code) as permissions
             FROM sps_role_permissions rp
             JOIN sps_permissions p ON rp.permission_id = p.id
             GROUP BY rp.role
             ORDER BY rp.role`
        );

        // Convert to object format for frontend: { 'ORG_ADMIN': ['events.view', ...], ... }
        const mappings: Record<string, string[]> = {};
        for (const row of result.rows) {
            mappings[row.role] = row.permissions || [];
        }

        res.json({
            success: true,
            data: mappings,
        });
    } catch (error) {
        console.error('Failed to fetch mappings:', error);
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

        // Delete existing permissions for role (using actual column name: role)
        await query('DELETE FROM sps_role_permissions WHERE role = $1', [role]);

        // Insert new permissions (lookup permission_id from code)
        for (const permCode of permissions) {
            await query(
                `INSERT INTO sps_role_permissions (role, permission_id)
                 SELECT $1, id FROM sps_permissions WHERE code = $2`,
                [role, permCode]
            );
        }

        res.json({
            success: true,
            message: 'Permissions updated',
        });
    } catch (error) {
        console.error('Failed to update mappings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update mappings',
        });
    }
});

export default router;
