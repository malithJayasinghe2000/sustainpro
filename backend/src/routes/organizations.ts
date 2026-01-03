
import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import argon2 from 'argon2';

const router = Router();

// Middleware: All routes require Super Admin privileges (or at least strictly checked)
// In our RBAC, we might want a specific 'PLATFORM_ADMIN' role or check is_super_admin flag.
// For now, we'll verify the user is a super admin via the check loop or a specific middleware.
// Since requireRole checks "roles", let's assume we might assign a 'SUPER_ADMIN' role or check the boolean.
// But our token has `isSuperAdmin`. Let's create a quick inline middleware or check.

const validSuperAdmin = (req: Request, res: Response, next: any) => {
    // @ts-ignore
    const user = req.user;

    // Log user details for debugging 403 errors
    console.log('[Auth] validSuperAdmin Check:', {
        userId: user?.id,
        email: user?.email,
        isSuperAdminFlag: user?.isSuperAdmin,
        roles: user?.roles
    });

    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check for isSuperAdmin flag OR existence of 'SUPER_ADMIN' role in roles array
    const hasSuperPrivileges = user.isSuperAdmin === true || (Array.isArray(user.roles) && user.roles.includes('SUPER_ADMIN'));

    if (!hasSuperPrivileges) {
        console.warn(`[Auth] Access Denied: User ${user.email} lacks Super Admin privileges.`);
        return res.status(403).json({ error: 'Forbidden: Requre Super Admin Access' });
    }

    next();
};

// ============================================
// GET /api/v1/organizations - List all organizations
// ============================================
router.get('/', authenticateToken, validSuperAdmin, async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT *
            FROM sps_organizations
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

// ============================================
// POST /api/v1/organizations - Create a new organization
//Body: { name, slug, type, contact_email, theme_config }
// ============================================
router.post('/', authenticateToken, validSuperAdmin, async (req: Request, res: Response) => {
    const client = await getClient();
    try {
        const {
            name, slug, type = 'CLIENT', contact_email, theme_config = {},
            description, industry, website, logo_url, timezone, address, city, country, phone, vat_id, billing_email,
            plan_tier = 'ENTERPRISE', max_users = 999999, max_devices = 999999
        } = req.body;

        // Validations
        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and Slug are required' });
        }

        await client.query('BEGIN');

        // 1. Generate formatted code (SPS-ORG-XXX)
        // Improved logic: Find latest code, extract number, increment. Fallback to 001.
        const lastOrgRes = await client.query('SELECT code FROM sps_organizations WHERE code LIKE \'SPS-ORG-%\' ORDER BY code DESC LIMIT 1');
        let nextId = 1;
        if (lastOrgRes.rows.length > 0) {
            const lastCode = lastOrgRes.rows[0].code; // SPS-ORG-005
            const parts = lastCode.split('-');
            const lastNum = parseInt(parts[2]);
            if (!isNaN(lastNum)) {
                nextId = lastNum + 1;
            }
        }
        const code = `SPS-ORG-${nextId.toString().padStart(3, '0')}`;

        // 2. Insert Org
        const insertRes = await client.query(`
            INSERT INTO sps_organizations (
                name, slug, code, type, contact_email, theme_config,
                description, industry, website, logo_url, timezone, address, city, country, phone, vat_id, billing_email,
                plan_tier, max_users, max_devices
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `, [
            name, slug, code, type, contact_email, theme_config,
            description, industry, website, logo_url, timezone, address, city, country, phone, vat_id, billing_email,
            plan_tier, max_users, max_devices
        ]);

        const newOrg = insertRes.rows[0];

        // 3. Create 'admin' role group? No, roles are assigned to users directly in this schema.
        // Create Admin User if password provided
        if (req.body.admin_password && contact_email) {
            // Generate User Code (SPS-USR-XXX)
            const lastUserRes = await client.query('SELECT code FROM sps_users WHERE code LIKE \'SPS-USR-%\' ORDER BY code DESC LIMIT 1');
            let nextUserId = 1;
            if (lastUserRes.rows.length > 0) {
                const lastCode = lastUserRes.rows[0].code;
                const parts = lastCode.split('-');
                const lastNum = parseInt(parts[2]);
                if (!isNaN(lastNum)) nextUserId = lastNum + 1;
            }
            const userCode = `SPS-USR-${nextUserId.toString().padStart(3, '0')}`;

            // Hash Password
            const hashedPassword = await argon2.hash(req.body.admin_password);

            // Create User
            const userRes = await client.query(`
                INSERT INTO sps_users (
                    organization_id, email, password_hash, full_name, code, is_active, timezone
                ) VALUES ($1, $2, $3, $4, $5, true, $6)
                RETURNING id
            `, [
                newOrg.id,
                contact_email,
                hashedPassword,
                req.body.admin_name || `${name} Admin`, // Use provided admin_name or fallback to default
                userCode,
                timezone || 'UTC'
            ]);
            const newUserId = userRes.rows[0].id;

            // Assign Role ORG_ADMIN
            await client.query(`
                INSERT INTO sps_role_assignments (user_id, role, org_id)
                VALUES ($1, 'ORG_ADMIN', $2)
            `, [newUserId, newOrg.id]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Organization created successfully',
            organization: newOrg
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error creating organization:', error?.message);
        if (error?.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Organization name, slug or code already exists' });
        }
        res.status(500).json({ error: 'Failed to create organization' });
    } finally {
        client.release();
    }
});

router.get('/:id_or_code', authenticateToken, validSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { id_or_code } = req.params;
        let queryStr = 'SELECT * FROM sps_organizations WHERE id = $1';

        // precise check for UUID vs Code to avoid DB casting errors
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id_or_code);

        if (!isUuid) {
            queryStr = `
                SELECT 
                    o.*,
                    (SELECT COUNT(*)::int FROM sps_users u WHERE u.organization_id = o.id) as user_count,
                    (SELECT COUNT(*)::int FROM sps_devices d WHERE d.organization_id = o.id) as device_count
                FROM sps_organizations o 
                WHERE o.code = $1
            `;
        } else {
            queryStr = `
                SELECT 
                    o.*,
                    (SELECT COUNT(*)::int FROM sps_users u WHERE u.organization_id = o.id) as user_count,
                    (SELECT COUNT(*)::int FROM sps_devices d WHERE d.organization_id = o.id) as device_count
                FROM sps_organizations o 
                WHERE o.id = $1
            `;
        }

        const result = await query(queryStr, [id_or_code]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get Org Error:', error);
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

// ============================================
// GET /api/v1/organizations/:id/structure - Get full hierarchy
// Returns events, depts, and services associated with an org
// ============================================
router.get('/:id/structure', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Finalized implementation for structure fetching
        // 1. Fetch Events
        const eventsRes = await query(`
            SELECT id, name, image_url 
            FROM sps_events 
            WHERE organization_id = $1
            ORDER BY name ASC
        `, [id]);

        // 2. Fetch Departments (via events)
        const deptsRes = await query(`
            SELECT d.id, d.name, d.event_id
            FROM sps_departments d
            JOIN sps_events e ON d.event_id = e.id
            WHERE e.organization_id = $1
            ORDER BY d.name ASC
        `, [id]);

        // 3. Fetch Services (via depts -> events)
        const servicesRes = await query(`
            SELECT s.id, s.name, s.department_id, sd.name as definition_name
            FROM sps_services s
            JOIN sps_service_definitions sd ON s.definition_id = sd.id
            JOIN sps_departments d ON s.department_id = d.id
            JOIN sps_events e ON d.event_id = e.id
            WHERE e.organization_id = $1
            ORDER BY s.name ASC
        `, [id]);

        // 4. Fetch User Count
        const userCountRes = await query(`
            SELECT COUNT(*)::int as count FROM sps_users WHERE organization_id = $1
        `, [id]);

        // 5. Fetch Device Count
        const deviceCountRes = await query(`
            SELECT COUNT(*)::int as count FROM sps_devices WHERE organization_id = $1
        `, [id]);

        res.json({
            events: eventsRes.rows,
            departments: deptsRes.rows,
            services: servicesRes.rows,
            user_count: userCountRes.rows[0].count,
            device_count: deviceCountRes.rows[0].count
        });
    } catch (error) {
        console.error('Get Org Structure Error:', error);
        res.status(500).json({ error: 'Failed to fetch organization structure' });
    }
});

// ============================================
// PUT /api/v1/organizations/:id - Update details
// ============================================
router.put('/:id', authenticateToken, validSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name, contact_email, theme_config, subscription_status,
            description, industry, website, logo_url, timezone, address, city, country, phone, vat_id, billing_email,
            plan_tier, max_users, max_devices
        } = req.body;

        const result = await query(`
            UPDATE sps_organizations
            SET name = COALESCE($1, name),
                contact_email = COALESCE($2, contact_email),
                theme_config = COALESCE($3, theme_config),
                subscription_status = COALESCE($4, subscription_status),
                description = COALESCE($5, description),
                industry = COALESCE($6, industry),
                website = COALESCE($7, website),
                address = COALESCE($8, address),
                city = COALESCE($9, city),
                country = COALESCE($10, country),
                phone = COALESCE($11, phone),
                vat_id = COALESCE($12, vat_id),
                billing_email = COALESCE($13, billing_email),
                plan_tier = COALESCE($14, plan_tier),
                max_users = COALESCE($15, max_users),
                max_devices = COALESCE($16, max_devices),
                logo_url = COALESCE($17, logo_url),
                timezone = COALESCE($18, timezone),
                updated_at = NOW()
            WHERE id = $19
            RETURNING *
        `, [
            name, contact_email, theme_config, subscription_status,
            description, industry, website, address, city, country, phone, vat_id, billing_email,
            plan_tier, max_users, max_devices, logo_url, timezone,
            id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.json({ success: true, organization: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update organization' });
    }
});

// ============================================
// DELETE /api/v1/organizations/:id - Delete organization
// ============================================
router.delete('/:id', authenticateToken, validSuperAdmin, async (req: Request, res: Response) => {
    const client = await getClient();
    try {
        const { id } = req.params;
        const { adminPassword } = req.body;

        if (!adminPassword) {
            return res.status(400).json({ error: 'Admin password is required to confirm deletion' });
        }

        // 1. Verify Requesting User's Password
        // @ts-ignore
        const userId = req.user?.id;
        const userRes = await client.query('SELECT password_hash FROM sps_users WHERE id = $1', [userId]);

        if (userRes.rowCount === 0) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        const validPassword = await argon2.verify(userRes.rows[0].password_hash, adminPassword);
        if (!validPassword) {
            console.warn(`[Auth] Delete Org Attempt: Invalid password provided by user ${req.user?.email}`);
            return res.status(403).json({ error: 'Invalid admin password. Deletion cancelled.' });
        }

        await client.query('BEGIN');

        // 2. Fetch organization logo before deletion
        const orgRes = await client.query('SELECT logo_url FROM sps_organizations WHERE id = $1', [id]);

        if (orgRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Organization not found' });
        }

        const logoUrl = orgRes.rows[0].logo_url;

        // 3. Delete Organization (Cascades should handle the rest)
        const result = await client.query('DELETE FROM sps_organizations WHERE id = $1 RETURNING id', [id]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Organization not found' });
        }

        await client.query('COMMIT');

        // 4. Delete associated logo image (after successful DB deletion)
        if (logoUrl) {
            const { deleteImageFile } = await import('../utils/delete-images');
            await deleteImageFile(logoUrl);
        }

        res.json({ success: true, message: 'Organization deleted successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete Org Error:', error);
        res.status(500).json({ error: 'Failed to delete organization' });
    } finally {
        client.release();
    }
});

export default router;
