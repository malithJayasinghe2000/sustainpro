import { Router, Request, Response } from 'express';
import pool, { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Protect all routes
router.use(authenticateToken);

// ============================================
// GET /api/v1/events
// Get all events (Super Admin only)
// ============================================
router.get('/', requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM sps_events ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all events:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch events' });
    }
});

// ============================================
// GET /api/v1/events/by-org/:orgId
// Get all events for an organization
// ============================================
router.get('/by-org/:orgId', async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = req.user as any;

        // Permission check: User must belong to Org or be Super Admin
        if (!user.isSuperAdmin && user.organization_id !== orgId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const result = await query(
            'SELECT * FROM sps_events WHERE organization_id = $1 ORDER BY created_at DESC',
            [orgId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch events' });
    }
});

// ============================================
// POST /api/v1/events
// Create a new event
// ============================================
router.post('/', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const {
            organization_id, name, location, start_date, end_date,
            status = 'PLANNING', description, event_type, image_url, coordinates,
            permit_authority, permit_license_number, noc_status, ticketing_partner,
            protocol_level, access_control, arrival_gate, venue_zones,
            climate_control, power_requirement
        } = req.body;
        const user = req.user as any;

        // Permission Check
        if (!user.isSuperAdmin && user.organization_id !== organization_id) {
            return res.status(403).json({ success: false, error: 'Cannot create event for another organization' });
        }

        // Auto-generate Event Code
        const countRes = await query('SELECT COUNT(*) FROM sps_events');
        const eventCount = parseInt(countRes.rows[0].count, 10);
        const eventCode = `SPS-EVT-${String(eventCount + 1).padStart(3, '0')}`;

        const result = await query(
            `INSERT INTO sps_events 
                (organization_id, name, location, start_date, end_date, status, description, event_type, image_url, coordinates,
                 permit_authority, permit_license_number, noc_status, ticketing_partner, protocol_level, 
                 access_control, arrival_gate, venue_zones, climate_control, power_requirement, code)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
             RETURNING *`,
            [organization_id, name, location, start_date, end_date, status, description, event_type, image_url, coordinates,
                permit_authority, permit_license_number, noc_status, ticketing_partner, protocol_level,
                access_control, arrival_gate, venue_zones, climate_control, power_requirement, eventCode]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ success: false, error: 'Failed to create event' });
    }
});

// ============================================
// GET /api/v1/events/:id
// Get single event
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Simple fetch, realistically should check org ownership if strict
        const result = await query('SELECT * FROM sps_events WHERE id = $1', [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// PUT /api/v1/events/:id
// Update event
// ============================================
router.put('/:id', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name, location, start_date, end_date, status, description, event_type, image_url, coordinates,
            permit_authority, permit_license_number, noc_status, ticketing_partner,
            protocol_level, access_control, arrival_gate, venue_zones,
            climate_control, power_requirement
        } = req.body;

        // TODO: Validate user owns the event via Org check

        const result = await query(
            `UPDATE sps_events SET
                name = COALESCE($1, name),
                location = COALESCE($2, location),
                start_date = COALESCE($3, start_date),
                end_date = COALESCE($4, end_date),
                status = COALESCE($5, status),
                description = COALESCE($6, description),
                event_type = COALESCE($7, event_type),
                image_url = COALESCE($8, image_url),
                coordinates = COALESCE($9, coordinates),
                permit_authority = COALESCE($10, permit_authority),
                permit_license_number = COALESCE($11, permit_license_number),
                noc_status = COALESCE($12, noc_status),
                ticketing_partner = COALESCE($13, ticketing_partner),
                protocol_level = COALESCE($14, protocol_level),
                access_control = COALESCE($15, access_control),
                arrival_gate = COALESCE($16, arrival_gate),
                venue_zones = COALESCE($17, venue_zones),
                climate_control = COALESCE($18, climate_control),
                power_requirement = COALESCE($19, power_requirement)
             WHERE id = $20
             RETURNING *`,
            [name, location, start_date, end_date, status, description, event_type, image_url, coordinates,
                permit_authority, permit_license_number, noc_status, ticketing_partner, protocol_level,
                access_control, arrival_gate, venue_zones, climate_control, power_requirement, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// ============================================
// POST /api/v1/events/:id/start
// Start tracking time
// ============================================
router.post('/:id/start', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const now = new Date();
        const result = await query(
            `UPDATE sps_events SET actual_start_time = $1, status = 'ACTIVE' WHERE id = $2 RETURNING *`,
            [now, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to start event' });
    }
});

// ============================================
// POST /api/v1/events/:id/stop
// Stop tracking time
// ============================================
router.post('/:id/stop', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const now = new Date();
        const result = await query(
            `UPDATE sps_events SET actual_end_time = $1, status = 'ARCHIVED' WHERE id = $2 RETURNING *`,
            [now, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to stop event' });
    }
});

// ============================================
// DELETE /api/v1/events/:id
// Delete event (requires admin password)
// ============================================
router.delete('/:id', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { adminPassword } = req.body;
        const user = req.user as any;

        // Verify admin password for safety
        if (!adminPassword) {
            return res.status(400).json({ error: 'Admin password required to delete event' });
        }

        // Get the admin's user record to verify password
        const userResult = await query('SELECT password FROM sps_users WHERE id = $1', [user.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const argon2 = require('argon2');
        const isValid = await argon2.verify(userResult.rows[0].password, adminPassword);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid admin password' });
        }

        // Delete the event (CASCADE will handle related data)
        const result = await query('DELETE FROM sps_events WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

export default router;
