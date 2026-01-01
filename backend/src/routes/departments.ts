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
            'SELECT * FROM sps_departments WHERE event_id = $1 ORDER BY created_at DESC',
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
router.post('/', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { event_id, name, head_user_id } = req.body;

        const result = await query(
            'INSERT INTO sps_departments (event_id, name, head_user_id) VALUES ($1, $2, $3) RETURNING *',
            [event_id, name, head_user_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create department' });
    }
});

export default router;
