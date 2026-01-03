import { Router, Request, Response } from 'express';
import pool, { query } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// ============================================
// GET /api/v1/department-services/:id
// Get service instance details with dashboard template
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await query(`SELECT 
                ds.*,
                st.name as service_name,
                st.description as service_description,
                st.is_public_dashboard_supported,
                dt.widgets,
                dt.layout,
                (
                    SELECT COUNT(*)::int 
                    FROM sps_devices d 
                    WHERE d.service_id = ds.id
                ) as total_devices,
                (
                    SELECT COUNT(*)::int 
                    FROM sps_devices d 
                    WHERE d.service_id = ds.id AND d.status = 'ONLINE'
                ) as active_devices,
                (
                    SELECT COALESCE(SUM((d.metadata->>'total_dispensed')::numeric), 0)
                    FROM sps_devices d 
                    WHERE d.service_id = ds.id
                ) as total_dispensed,
                (
                    SELECT COALESCE(SUM((d.metadata->>'bottles_saved')::numeric), 0)
                    FROM sps_devices d 
                    WHERE d.service_id = ds.id
                ) as total_bottles_saved,
                (
                    SELECT COALESCE(SUM((d.metadata->>'co2_saved')::numeric), 0)
                    FROM sps_devices d 
                    WHERE d.service_id = ds.id
                ) as total_co2_saved
            FROM sps_department_services ds
            JOIN sps_service_templates st ON ds.service_id = st.id
            LEFT JOIN sps_dashboard_templates dt ON st.id = dt.service_id
            WHERE ds.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service instance not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching service instance:', error);
        res.status(500).json({ error: 'Failed to fetch service instance' });
    }
});

// ============================================
// GET /api/v1/department-services/:id/devices
// Get devices assigned to service instance
// ============================================
router.get('/:id/devices', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                d.id as assignment_id,
                'primary' as role,
                '{}'::jsonb as config,
                d.updated_at as assigned_at,
                d.id as device_id,
                d.device_code,
                d.name as device_name,
                d.status,
                d.last_seen
            FROM sps_devices d
            WHERE d.service_id = $1
            ORDER BY d.created_at DESC
        `, [id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching service devices:', error);
        res.status(500).json({ error: 'Failed to fetch service devices' });
    }
});

// ============================================
// POST /api/v1/department-services/:id/devices
// Assign device to service instance
// ============================================
router.post('/:id/devices', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { device_id, role, config } = req.body;

        if (!device_id) {
            return res.status(400).json({ error: 'device_id is required' });
        }

        // Check if device is already assigned to ANY service?
        // Usually a device can only be in one service.
        // We override assignment here.

        const result = await query(
            `UPDATE sps_devices SET service_id = $1 WHERE id = $2 RETURNING *`,
            [id, device_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error assigning device to service:', error);
        res.status(500).json({ error: 'Failed to assign device to service' });
    }
});

// ============================================
// DELETE /api/v1/department-services/:id/devices/:deviceId
// Remove device from service instance
// ============================================
router.delete('/:id/devices/:deviceId', async (req: Request, res: Response) => {
    try {
        const { id, deviceId } = req.params;

        const result = await query(
            'UPDATE sps_devices SET service_id = NULL WHERE id = $2 AND service_id = $1 RETURNING *',
            [id, deviceId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Device assignment not found or device not assigned to this service' });
        }

        res.json({ message: 'Device removed from service successfully' });
    } catch (error) {
        console.error('Error removing device from service:', error);
        res.status(500).json({ error: 'Failed to remove device from service' });
    }
});

export default router;
