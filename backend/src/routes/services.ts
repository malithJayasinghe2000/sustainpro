import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireRole, requireSuperAdmin } from '../middleware/rbac';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// --- SERVICE TEMPLATES (Super Admin Role) ---

// Create a new Service Template
router.post('/', requireSuperAdmin, async (req: Request, res: Response) => {
    const { name, description, scope, config, is_public_dashboard_supported, device_models, dashboard_template, main_dashboard_layout, public_dashboard_layout } = req.body;
    console.log('🔥 CREATE SERVICE REQUEST RECEIVED:', { name, scope, device_models_count: device_models?.length });
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create Service Template
        console.log('DEBUG: Inserting into sps_service_templates...');
        const serviceRes = await client.query(
            `INSERT INTO sps_service_templates 
            (name, description, scope, config, is_public_dashboard_supported, created_by, main_dashboard_layout, public_dashboard_layout)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [name, description, scope, config || {}, is_public_dashboard_supported || false, (req.user as any).id, main_dashboard_layout || [], public_dashboard_layout || []]
        );
        const serviceId = serviceRes.rows[0].id;

        // 2. Link Device Models if provided
        if (device_models && Array.isArray(device_models)) {
            for (const dm of device_models) {
                await client.query(
                    `INSERT INTO sps_service_device_models (service_id, device_model_id, role, min_count, max_count)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [serviceId, dm.device_model_id, dm.role || 'main', dm.min_count || 1, dm.max_count]
                );
            }
        }

        // 3. Save Dashboard Template if provided
        if (dashboard_template) {
            await client.query(
                `INSERT INTO sps_dashboard_templates (service_id, layout, widgets)
                VALUES ($1, $2, $3)`,
                [serviceId, dashboard_template.layout || [], dashboard_template.widgets || []]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ id: serviceId, message: 'Service created successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create Service error:', error);
        res.status(500).json({ error: 'Failed to create service' });
    } finally {
        client.release();
    }
});

// Get all Service Templates
router.get('/', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        const { scope } = req.query;
        let query = `
            SELECT st.*, 
            json_agg(json_build_object('id', sdm.device_model_id, 'role', sdm.role)) as device_models
            FROM sps_service_templates st
            LEFT JOIN sps_service_device_models sdm ON st.id = sdm.service_id
        `;
        const params: any[] = [];

        if (scope) {
            query += ` WHERE st.scope = $1`;
            params.push(scope);
        }

        query += ` GROUP BY st.id ORDER BY st.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Fetch Services error:', error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// Get Single Service Template with Full Details
router.get('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log('👉 GET /services/:id REQUEST:', id);
    try {
        const result = await pool.query(`
            SELECT st.*, 
            (
                SELECT jsonb_agg(jsonb_build_object('device_model_id', sdm.device_model_id, 'role', sdm.role, 'min_count', sdm.min_count, 'max_count', sdm.max_count))
                FROM sps_service_device_models sdm
                WHERE sdm.service_id = st.id
            ) as device_models,
            (
                SELECT jsonb_build_object('layout', dt.layout, 'widgets', dt.widgets) 
                FROM sps_dashboard_templates dt 
                WHERE dt.service_id = st.id
            ) as dashboard_template
            FROM sps_service_templates st
            WHERE st.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Fetch Service error:', error);
        res.status(500).json({ error: 'Failed to fetch service' });
    }
});

// Update Service Template
router.put('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, scope, config, is_public_dashboard_supported, dashboard_template, main_dashboard_layout, public_dashboard_layout } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update Service Template
        await client.query(
            `UPDATE sps_service_templates SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            scope = COALESCE($3, scope),
            config = COALESCE($4, config),
            is_public_dashboard_supported = COALESCE($5, is_public_dashboard_supported),
            main_dashboard_layout = COALESCE($7, main_dashboard_layout),
            public_dashboard_layout = COALESCE($8, public_dashboard_layout),
            updated_at = NOW()
            WHERE id = $6`,
            [name, description, scope, config, is_public_dashboard_supported, id, main_dashboard_layout, public_dashboard_layout]
        );

        // 2. Update Dashboard Template if provided
        if (dashboard_template) {
            console.log('DEBUG: Updating dashboard template for service:', id);
            console.log('DEBUG: dashboard_template received:', typeof dashboard_template, dashboard_template);

            // Ensure layout and widgets are proper JSON objects/arrays, not strings
            const layout = typeof dashboard_template.layout === 'string'
                ? JSON.parse(dashboard_template.layout)
                : (dashboard_template.layout || []);

            const widgets = typeof dashboard_template.widgets === 'string'
                ? JSON.parse(dashboard_template.widgets)
                : (dashboard_template.widgets || []);

            console.log('DEBUG: Processed widgets:', typeof widgets, Array.isArray(widgets), widgets);

            await client.query(
                `INSERT INTO sps_dashboard_templates (service_id, layout, widgets)
                VALUES ($1, $2::jsonb, $3::jsonb)
                ON CONFLICT (service_id)
                DO UPDATE SET layout = $2::jsonb, widgets = $3::jsonb, updated_at = NOW()`,
                [id, JSON.stringify(layout), JSON.stringify(widgets)]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Service updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update Service error:', error);
        // Cast error to any to access message safely
        const errorMessage = (error as any).message || 'Failed to update service';
        res.status(500).json({ error: errorMessage });
    } finally {
        client.release();
    }
});

// Delete Service
router.delete('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
        await pool.query('DELETE FROM sps_service_templates WHERE id = $1', [req.params.id]);
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

// --- ASSIGNMENTS (Multi-Tenancy) ---

// Grant Service to Organization (Create Subscription)
router.post('/:id/assign', requireSuperAdmin, async (req: Request, res: Response) => {
    const { id } = req.params; // Service ID
    const { organization_id, valid_until, config_override } = req.body;

    try {
        await pool.query(
            `INSERT INTO sps_service_subscriptions 
            (service_id, organization_id, status, config_override, valid_until, assigned_by)
            VALUES ($1, $2, 'ACTIVE', $3, $4, $5)
            ON CONFLICT (service_id, organization_id) 
            DO UPDATE SET status = 'ACTIVE', valid_until = $4, updated_at = NOW()`,
            [id, organization_id, config_override || {}, valid_until, (req.user as any).id]
        );
        res.json({ message: 'Service assigned to organization successfully' });
    } catch (error) {
        console.error('Assign Service error:', error);
        res.status(500).json({ error: 'Failed to assign service' });
    }
});

export default router;
