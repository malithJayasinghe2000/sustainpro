import { Router, Request, Response } from 'express';
import pool, { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// ============================================
// GET /api/v1/services/definitions
// Catalog
// ============================================
router.get('/definitions', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM sps_service_definitions ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch catalog' });
    }
});

// ============================================
// GET /api/v1/services/by-dept/:deptId
// ============================================
router.get('/by-dept/:deptId', async (req: Request, res: Response) => {
    try {
        const { deptId } = req.params;

        const result = await query(
            `SELECT s.*, d.name as definition_name 
             FROM sps_services s
             JOIN sps_service_definitions d ON s.definition_id = d.id
             WHERE s.department_id = $1 
             ORDER BY s.created_at DESC`,
            [deptId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// ============================================
// POST /api/v1/services
// ============================================
router.post('/', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { department_id, definition_id, name, config, assigned_supervisor_id } = req.body;

        const result = await query(
            `INSERT INTO sps_services (department_id, definition_id, name, config, assigned_supervisor_id) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [department_id, definition_id, name, config || {}, assigned_supervisor_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create service' });
    }
});

export default router;
