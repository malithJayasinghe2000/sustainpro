import { Router, Request, Response } from 'express';
import pool, { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getCurrentSystemTime } from '../utils/timezone';

const router = Router();

// Protect all device routes
router.use(authenticateToken);

// ============================================
// GET /api/v1/devices
// Fetch devices for the current User's Organization
// ============================================
router.get('/', async (req: Request, res: Response) => {
    try {
        const orgId = req.user?.organization_id;

        const sql = `
            SELECT 
                d.id, d.device_code, d.name, d.type, d.status, 
                d.last_seen, d.metadata, d.created_at,
                s.name as service_name,
                dept.name as dept_name
            FROM sps_devices d
            LEFT JOIN sps_services s ON d.service_id = s.id
            LEFT JOIN sps_departments dept ON s.department_id = dept.id
            WHERE d.organization_id = $1
            ORDER BY d.created_at DESC
        `;

        const result = await query(sql, [orgId]);
        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch devices' });
    }
});

// ============================================
// POST /api/v1/devices (Manual Creation)
// Requires ORG_ADMIN or TECHNICIAN
// ============================================
router.post('/', requireRole('TECHNICIAN'), async (req: Request, res: Response) => {
    try {
        const { name, type, service_id, device_code } = req.body;
        const orgId = req.user?.organization_id;

        // Basic validation
        if (!device_code) return res.status(400).json({ error: 'Device Code is required' });

        const sql = `
            INSERT INTO sps_devices (
                organization_id, service_id, device_code, name, type, status
            )
            VALUES ($1, $2, $3, $4, $5, 'OFFLINE')
            RETURNING *
        `;

        const result = await query(sql, [orgId, service_id, device_code, name, type]);
        res.status(201).json({ success: true, data: result.rows[0] });

    } catch (error) {
        console.error('Create device error:', error);
        res.status(500).json({ success: false, error: 'Failed to create device' });
    }
});

// ============================================
// POST /api/v1/devices/provision
// Provisioning Logic (Simplified for brevity)
// ============================================
router.post('/provision', async (req: Request, res: Response) => {
    try {
        const { serial_number, name } = req.body;
        const orgId = req.user?.organization_id;

        if (!serial_number) return res.status(400).json({ error: 'Serial Number required' });

        // 1. Check uniqueness in Org? Or Globally? Serial is usually global unique.
        // sps_devices.serial_unique constraint?

        // For now, simple insert
        const deviceCode = `SPS-${Date.now().toString().slice(-6)}`;
        const apiKey = require('crypto').randomBytes(32).toString('hex');

        const sql = `
            INSERT INTO sps_devices (
                organization_id, device_code, api_key, serial_number, name, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, 'PROVISIONED', NOW())
            RETURNING id, device_code, api_key, name, status
        `;

        const result = await query(sql, [orgId, deviceCode, apiKey, serial_number, name || deviceCode]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        console.error('Provision error:', err);
        res.status(500).json({ success: false, error: 'Provisioning failed' });
    }
});

export default router;
