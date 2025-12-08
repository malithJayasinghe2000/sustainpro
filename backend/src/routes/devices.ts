import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// ============================================
// GET /api/v1/devices - Get all devices
// ============================================
router.get('/', async (req: Request, res: Response) => {
    try {
        // TODO: Add your SQL query here
        // You can add filters: ?user_id=1&status=active
        const sql = `
      SELECT 
        d.id, d.device_code, d.name, d.type, d.status, d.location,
        d.last_seen, d.battery_level, d.created_at,
        u.username as owner_username
      FROM sps_devices d
      LEFT JOIN sps_users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `;

        const result = await query(sql);
        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch devices'
        });
    }
});

// ============================================
// GET /api/v1/devices/:id - Get device by ID
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // TODO: Add your SQL query here
        const sql = `
      SELECT 
        d.*,
        u.username as owner_username,
        u.email as owner_email
      FROM sps_devices d
      LEFT JOIN sps_users u ON d.user_id = u.id
      WHERE d.id = $1
    `;

        const result = await query(sql, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching device:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch device'
        });
    }
});

// ============================================
// POST /api/v1/devices - Create new device
// ============================================
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, type, user_id, location } = req.body;

        // TODO: Add your SQL query here
        // Generate device_code (e.g., SPD-00001)
        const sql = `
      INSERT INTO sps_devices (name, type, user_id, location, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING id, device_code, name, type, status, created_at
    `;

        const result = await query(sql, [name, type, user_id, location]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating device:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create device'
        });
    }
});

// ============================================
// PUT /api/v1/devices/:id - Update device
// ============================================
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // TODO: Add your SQL query here
        // Build dynamic UPDATE query based on provided fields
        const sql = `
      UPDATE sps_devices
      SET 
        name = COALESCE($1, name),
        location = COALESCE($2, location),
        status = COALESCE($3, status),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

        const result = await query(sql, [
            updates.name,
            updates.location,
            updates.status,
            id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating device:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update device'
        });
    }
});

export default router;
