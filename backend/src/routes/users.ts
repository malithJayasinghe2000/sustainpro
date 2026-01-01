import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import pool, { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Protect all routes
router.use(authenticateToken);
router.use(requireRole('ORG_ADMIN')); // Requires Org Admin or higher (SUPER_ADMIN has auto-access)

// ============================================
// GET /api/v1/users - Get all users
// ============================================
router.get('/', async (req: Request, res: Response) => {
    try {
        const { organization_id, isSuperAdmin } = req.user as any;

        let sql = '';
        let params: any[] = [];

        if (isSuperAdmin) {
            // Super Admin sees ALL users + Org Name
            sql = `
              SELECT 
                u.id, u.email, u.code, u.is_active, u.organization_id,
                u.created_at, u.last_login as last_login_at,
                o.name as org_name,
                (
                    SELECT json_agg(json_build_object('role', ra.role, 'org_id', ra.org_id))
                    FROM sps_role_assignments ra
                    WHERE ra.user_id = u.id
                ) as roles
              FROM sps_users u
              LEFT JOIN sps_organizations o ON u.organization_id = o.id
              ORDER BY u.created_at DESC
            `;
        } else {
            // Org Admin sees only their org users
            sql = `
              SELECT 
                u.id, u.email, u.code, u.is_active, 
                u.created_at, u.last_login as last_login_at,
                (SELECT name FROM sps_organizations WHERE id = u.organization_id) as org_name,
                (
                    SELECT json_agg(json_build_object('role', ra.role, 'org_id', ra.org_id))
                    FROM sps_role_assignments ra
                    WHERE ra.user_id = u.id
                ) as roles
              FROM sps_users u
              WHERE u.organization_id = $1
              ORDER BY u.created_at DESC
            `;
            params = [organization_id];
        }

        const result = await query(sql, params);
        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

// ============================================
// GET /api/v1/users/:id - Get user by ID
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.organization_id;

        const sql = `
          SELECT 
            u.id, u.email, u.is_active,
            u.created_at, u.last_login as last_login_at,
            u.timezone,
            (
                SELECT json_agg(json_build_object('role', ra.role))
                FROM sps_role_assignments ra
                WHERE ra.user_id = u.id
            ) as roles
          FROM sps_users u
          WHERE u.id = $1 AND u.organization_id = $2
        `;

        const result = await query(sql, [id, orgId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
});

// ============================================
// PUT /api/v1/users/:id - Update user
// ============================================
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { email, is_active } = req.body;
        const orgId = req.user?.organization_id;

        // Basic validation
        if (email) {
            const existing = await query('SELECT id FROM sps_users WHERE email = $1 AND id != $2', [email, id]);
            if (existing.rows.length > 0) return res.status(409).json({ success: false, error: 'Email in use' });
        }

        const sql = `
          UPDATE sps_users
          SET email = COALESCE($1, email),
              is_active = COALESCE($2, is_active)
          WHERE id = $3 AND organization_id = $4
          RETURNING id, email, is_active
        `;

        const result = await query(sql, [email, is_active, id, orgId]);

        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'User not found' });

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

// ============================================
// DELETE /api/v1/users/:id - Delete user
// ============================================
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.organization_id;

        // Ensure user belongs to Org before deleting
        const sql = `DELETE FROM sps_users WHERE id = $1 AND organization_id = $2 RETURNING id`;
        const result = await query(sql, [id, orgId]);

        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'User not found' });

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

// ============================================
// POST /api/v1/users - Create new user
// ============================================
router.post('/', async (req: Request, res: Response) => {
    const client = await pool.connect(); // Use transaction client for safety
    try {
        const { email, password, full_name, organization_id, role, code, event_id, dept_id, service_id } = req.body;
        const requestor = req.user as any;

        // Permission Check
        if (!requestor.isSuperAdmin && organization_id !== requestor.organization_id) {
            return res.status(403).json({ success: false, error: 'Permission denied: Cannot create user for another organization' });
        }

        // Basic Validation
        if (!email || !password || !organization_id || !role) {
            return res.status(400).json({ success: false, error: 'Missing fields: email, password, organization_id, role' });
        }

        await client.query('BEGIN');

        // Check Email
        const existing = await client.query('SELECT id FROM sps_users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, error: 'Email already exists' });
        }

        // Hash Password
        const hash = await argon2.hash(password);

        // Insert User
        const userRes = await client.query(
            `INSERT INTO sps_users (email, password_hash, full_name, organization_id, code, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, true, NOW())
             RETURNING id, email, organization_id`,
            [email, hash, full_name || '', organization_id, code || null]
        );
        const newUser = userRes.rows[0];

        // Assign Role with Context
        // We must ensure only ONE context ID is set (per the DB constraint), or rely on logic to pick the "deepest" one.
        // Actually, the schema constraint `one_context_only` allows only one NOT NULL column among org, event, dept, service.
        // So we must determine which one to set based on the role or provided IDs.

        let targetOrgId = organization_id;
        let targetEventId = null;
        let targetDeptId = null;
        let targetServiceId = null;

        // Reset upstream contexts if a deeper context is provided
        if (service_id) {
            targetServiceId = service_id;
            targetDeptId = null;
            targetEventId = null;
            targetOrgId = null;
        } else if (dept_id) {
            targetDeptId = dept_id;
            targetEventId = null;
            targetOrgId = null;
        } else if (event_id) {
            targetEventId = event_id;
            targetOrgId = null;
        }

        await client.query(
            `INSERT INTO sps_role_assignments (user_id, role, org_id, event_id, dept_id, service_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [newUser.id, role, targetOrgId, targetEventId, targetDeptId, targetServiceId]
        );

        await client.query('COMMIT');

        res.status(201).json({ success: true, data: newUser, message: 'User created successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create user error:', error);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    } finally {
        client.release();
    }
});

export default router;
