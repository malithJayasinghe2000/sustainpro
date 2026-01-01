import express from 'express';
import pool, { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getCurrentSystemTime } from '../utils/timezone';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route GET /api/v1/device-models
 * @desc Get all device models
 * @access Private (All authenticated users)
 */
router.get('/', async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM sps_device_models ORDER BY name ASC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching device models:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

/**
 * @route POST /api/v1/device-models
 * @desc Create a new device model
 * @access Private (Admin, Moderator)
 */
router.post('/', requireRole('admin', 'moderator'), async (req, res) => {
    const { id, name, description, parameters } = req.body;

    // Basic Validation
    if (!id || !name) {
        return res.status(400).json({ success: false, error: 'ID and Name are required' });
    }

    try {
        // Check if exists
        const check = await query('SELECT id FROM sps_device_models WHERE id = $1 OR name = $2', [id, name]);
        if (check.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Device model ID or Name already exists' });
        }

        const now = await getCurrentSystemTime();
        const sql = `
            INSERT INTO sps_device_models (id, name, description, parameters, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
            RETURNING *
        `;

        const result = await query(sql, [
            id,
            name,
            description || '',
            JSON.stringify(parameters || []),
            req.user?.id,
            now
        ]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating device model:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

/**
 * @route PUT /api/v1/device-models/:id
 * @desc Update a device model
 * @access Private (Admin, Moderator)
 */
router.put('/:id', requireRole('admin', 'moderator'), async (req, res) => {
    const { id } = req.params;
    const { name, description, parameters } = req.body;

    try {
        const check = await query('SELECT id FROM sps_device_models WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Device model not found' });
        }

        const now = await getCurrentSystemTime();
        const sql = `
            UPDATE sps_device_models
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                parameters = COALESCE($3, parameters),
                updated_at = $5
            WHERE id = $4
            RETURNING *
        `;

        const result = await query(sql, [
            name,
            description,
            parameters ? JSON.stringify(parameters) : null,
            id,
            now
        ]);

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating device model:', error);
        // Check for unique constraint violation on name
        if ((error as any).code === '23505') {
            return res.status(400).json({ success: false, error: 'Model name already exists' });
        }
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

/**
 * @route DELETE /api/v1/device-models/:id
 * @desc Delete a device model
 * @access Private (Admin Only)
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query('DELETE FROM sps_device_models WHERE id = $1 RETURNING id', [id]);

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Device model not found' });
        }

        res.json({ success: true, message: 'Device model deleted' });
    } catch (error) {
        console.error('Error deleting device model:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;
