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
// Fetch devices for the User's Organization (or ALL for Super Admin)
// ============================================
router.get('/', async (req: Request, res: Response) => {
    try {
        const orgId = req.user?.organization_id;
        const params: any[] = [];

        let sql = `
            SELECT 
                d.id, d.device_code, d.name, d.type, d.status, 
                d.last_seen, d.metadata, d.created_at,
                s.name as service_name,
                dept.name as dept_name
            FROM sps_devices d
            LEFT JOIN sps_department_services ds ON d.service_id = ds.id
            LEFT JOIN sps_service_templates s ON ds.service_id = s.id
            LEFT JOIN sps_departments dept ON ds.department_id = dept.id
        `;

        if (orgId) {
            sql += ` WHERE d.organization_id = $1`;
            params.push(orgId);
        }

        sql += ` ORDER BY d.created_at DESC`;

        const result = await query(sql, params);
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
// GET /api/v1/devices/:id
// Fetch single device details
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.organization_id;

        let sql = `
            SELECT 
                d.*,
                s.name as service_name,
                dept.name as dept_name
            FROM sps_devices d
            LEFT JOIN sps_department_services ds ON d.service_id = ds.id
            LEFT JOIN sps_service_templates s ON ds.service_id = s.id
            LEFT JOIN sps_departments dept ON ds.department_id = dept.id
            WHERE d.id = $1
        `;

        const params: any[] = [id];

        if (orgId) {
            sql += ` AND d.organization_id = $2`;
            params.push(orgId);
        }

        const result = await query(sql, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Device not found' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching device:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch device' });
    }
});

// ============================================
// POST /api/v1/devices (Manual Creation)
// Requires ORG_ADMIN or TECHNICIAN
// ============================================
router.post('/', requireRole('TECHNICIAN'), async (req: Request, res: Response) => {
    try {
        const { name, type, service_id, device_code } = req.body;
        let orgId = req.user?.organization_id;

        // Validation
        if (!device_code) return res.status(400).json({ error: 'Device Code is required' });

        // If Super Admin (no orgId) and service_id is present, fetch Org ID from Service->Dept->Event->Org
        if (!orgId && service_id) {
            const orgResult = await query(`
                SELECT e.organization_id 
                FROM sps_department_services ds
                JOIN sps_departments d ON ds.department_id = d.id
                JOIN sps_events e ON d.event_id = e.id
                WHERE ds.id = $1
            `, [service_id]);

            if (orgResult.rows.length > 0) {
                orgId = orgResult.rows[0].organization_id;
            } else {
                return res.status(400).json({ error: 'Invalid service_id or Organization context missing' });
            }
        }

        if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

        // Generate API Key
        const apiKey = require('crypto').randomBytes(32).toString('hex');

        const sql = `
            INSERT INTO sps_devices (
                organization_id, service_id, device_code, api_key, name, type, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'OFFLINE')
            RETURNING *
        `;

        const result = await query(sql, [orgId, service_id, device_code, apiKey, name, type]);
        res.status(201).json({ success: true, data: result.rows[0] });

    } catch (error) {
        console.error('Create device error:', error);
        res.status(500).json({ success: false, error: 'Failed to create device' });
    }
});

// ============================================
// POST /api/v1/devices/provision
// Provisioning Logic
// ============================================
router.post('/provision', async (req: Request, res: Response) => {
    try {
        const { serial_number, name } = req.body;
        const orgId = req.user?.organization_id;

        if (!serial_number) return res.status(400).json({ error: 'Serial Number required' });

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
