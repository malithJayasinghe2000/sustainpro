import { Router, Request, Response } from 'express';
import pool, { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// ============================================
// GET /api/v1/departments/by-event/:eventId
// ============================================
router.get('/by-event/:eventId', async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        // Should implement comprehensive permission check here (ensure user has access to this event's org)

        const result = await query(
            `SELECT 
                d.*,
                COUNT(ds.id)::int as services_count
            FROM sps_departments d
            LEFT JOIN sps_department_services ds ON d.id = ds.department_id
            WHERE d.event_id = $1
            GROUP BY d.id
            ORDER BY d.created_at DESC`,
            [eventId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// ============================================
// POST /api/v1/departments
// ============================================
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            event_id,
            name,
            head_user_id,
            description,
            icon,
            color,
            template_origin_id
        } = req.body;

        const user = req.user as any;

        // --- Permission Check ---
        // We do this manually because requireRole expects params, but here ID is in body.
        if (!user.isSuperAdmin) {
            // Check if user has permission for this event
            // 1. Get user's roles from DB (safest)
            const roleQuery = `
                SELECT role, org_id, event_id 
                FROM sps_role_assignments 
                WHERE user_id = $1
            `;
            const { rows: roles } = await query(roleQuery, [user.id]);

            const hasPermission = roles.some((r: any) => {
                // ORG_ADMIN for the user's org (assuming event belongs to same org)
                if (r.role === 'ORG_ADMIN' && r.org_id === user.organization_id) return true;
                // EVENT_ADMIN for this specific event
                if (r.role === 'EVENT_ADMIN' && r.event_id === event_id) return true;
                return false;
            });

            if (!hasPermission) {
                console.warn(`User ${user.id} denied creating department for event ${event_id}`);
                return res.status(403).json({ error: 'Insufficient permissions to create department' });
            }
        }

        // Check if department from this template already exists in this event
        if (template_origin_id) {
            const duplicateCheck = await query(
                'SELECT id, name FROM sps_departments WHERE event_id = $1 AND template_origin_id = $2',
                [event_id, template_origin_id]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(400).json({
                    error: 'This department template has already been added to this event',
                    existingDepartment: duplicateCheck.rows[0]
                });
            }
        }

        const result = await query(
            `INSERT INTO sps_departments (
                event_id, name, head_user_id, description, icon, color, template_origin_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                event_id,
                name,
                head_user_id || null,
                description || null,
                icon || 'Layers',
                color || '#3B82F6',
                template_origin_id || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// ============================================
// GET /api/v1/departments/:id
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query(
            'SELECT * FROM sps_departments WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ error: 'Failed to fetch department' });
    }
});

// ============================================
// GET /api/v1/departments/:id/services
// ============================================
router.get('/:id/services', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get services assigned to this department
        const result = await query(`
            SELECT 
                ds.id,
                ds.service_id,
                ds.config,
                st.name,
                st.description,
                st.scope
            FROM sps_department_services ds
            JOIN sps_service_templates st ON ds.service_id = st.id
            WHERE ds.department_id = $1
            ORDER BY ds.created_at DESC
        `, [id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching department services:', error);
        res.status(500).json({ error: 'Failed to fetch department services' });
    }
});

// ============================================
// POST /api/v1/departments/:id/services
// ============================================
router.post('/:id/services', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { service_id, config } = req.body;

        if (!service_id) {
            return res.status(400).json({ error: 'service_id is required' });
        }

        // Check if service is already assigned
        const existing = await query(
            'SELECT id FROM sps_department_services WHERE department_id = $1 AND service_id = $2',
            [id, service_id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Service already assigned to this department' });
        }

        const result = await query(
            `INSERT INTO sps_department_services (department_id, service_id, config)
             VALUES ($1, $2, $3) RETURNING *`,
            [id, service_id, config || {}]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding service to department:', error);
        res.status(500).json({ error: 'Failed to add service to department' });
    }
});

// ============================================
// DELETE /api/v1/departments/:id/services/:serviceId
// ============================================
router.delete('/:id/services/:serviceId', async (req: Request, res: Response) => {
    try {
        const { id, serviceId } = req.params;

        const result = await query(
            'DELETE FROM sps_department_services WHERE department_id = $1 AND service_id = $2 RETURNING *',
            [id, serviceId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Service assignment not found' });
        }

        res.json({ message: 'Service removed from department successfully' });
    } catch (error) {
        console.error('Error removing service from department:', error);
        res.status(500).json({ error: 'Failed to remove service from department' });
    }
});

export default router;
