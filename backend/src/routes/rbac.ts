
import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Middleware: All RBAC management routes require Super Admin privileges
// We reuse the existing role check, assuming Super Admin has 'SUPER_ADMIN' role or flag.
// Ideally, this should be STRICTLY for the Platform Owner.
router.use(authenticateToken);

const isSuperAdmin = (req: Request, res: Response, next: any) => {
    // @ts-ignore
    if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }
    next();
};

router.use(isSuperAdmin);

// ============================================
// GET /api/v1/rbac/permissions
// List all available system permissions
// ============================================
router.get('/permissions', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM sps_permissions ORDER BY module, name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});

// ============================================
// GET /api/v1/rbac/mappings
// Get current role permission matrix
// returns: { "ORG_ADMIN": ["events:create", ...], ... }
// ============================================
router.get('/mappings', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT role_code, permission_code FROM sps_role_permissions');

        const mappings: Record<string, string[]> = {};

        result.rows.forEach(row => {
            if (!mappings[row.role_code]) {
                mappings[row.role_code] = [];
            }
            mappings[row.role_code].push(row.permission_code);
        });

        res.json(mappings);
    } catch (error) {
        console.error('Error fetching mappings:', error);
        res.status(500).json({ error: 'Failed to fetch mappings' });
    }
});

// ============================================
// POST /api/v1/rbac/mappings
// Update permissions for a specific role
// Body: { role: 'ORG_ADMIN', permissions: ['events:create', 'events:view'] }
// ============================================
router.post('/mappings', async (req: Request, res: Response) => {
    const client = await getClient();
    try {
        const { role, permissions } = req.body;

        if (!role || !Array.isArray(permissions)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        await client.query('BEGIN');

        // 1. Clear existing permissions for this role
        await client.query('DELETE FROM sps_role_permissions WHERE role_code = $1', [role]);

        // 2. Insert new permissions
        if (permissions.length > 0) {
            // Bulk insert construction
            // ($1, $2), ($1, $3), ...
            const values = permissions.map((_, i) => `($1, $${i + 2})`).join(', ');
            const params = [role, ...permissions];

            await client.query(
                `INSERT INTO sps_role_permissions (role_code, permission_code) VALUES ${values}`,
                params
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Updated permissions for ${role}` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating mappings:', error);
        res.status(500).json({ error: 'Failed to update mappings' });
    } finally {
        client.release();
    }
});

export default router;
