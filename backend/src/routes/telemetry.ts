import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticateDevice } from '../middleware/deviceAuth';
import { authenticateToken } from '../middleware/auth';
import { getIO } from '../socket';

const router = Router();

// ... (previous interfaces) ...
interface LiveDataEntry {
    data: any;
    timestamp: Date;
    device_id: number;
    device_code: string;
}

const liveDataStore: Map<string, LiveDataEntry> = new Map();
const OFFLINE_THRESHOLD_MS = 10000;

// ... (previous helper) ...
const getDeviceStatus = (entry: LiveDataEntry | undefined): 'online' | 'offline' => {
    if (!entry) return 'offline';
    const now = Date.now();
    const lastUpdate = entry.timestamp.getTime();
    return (now - lastUpdate) < OFFLINE_THRESHOLD_MS ? 'online' : 'offline';
};

// ============================================
// POST /api/v1/telemetry - Ingest telemetry data (IN-MEMORY ONLY)
// No database writes - purely live data
// ============================================
router.post('/', authenticateDevice, async (req: Request, res: Response) => {
    try {
        console.log('[Telemetry] Body:', req.body);
        const { data } = req.body;
        const device = req.device;

        if (!data) {
            return res.status(400).json({
                success: false,
                error: 'Missing data payload'
            });
        }

        // Store in memory only - NO DATABASE WRITES
        const timestamp = new Date();
        const liveEntry: LiveDataEntry = {
            data,
            timestamp,
            device_id: device.id,
            device_code: device.device_code
        };

        liveDataStore.set(device.device_code, liveEntry);

        // Update Last Seen in DB (Async, don't block response)
        query('UPDATE sps_devices SET last_seen = $1 WHERE id = $2', [timestamp, device.id])
            .catch(err => console.error('Failed to update last_seen:', err));

        // Get total device count for stats calculation
        const devicesResult = await query('SELECT COUNT(*) as total FROM sps_devices');
        const totalDevices = parseInt(devicesResult.rows[0]?.total || '0');

        // Emit Real-Time Update via Socket.IO
        try {
            const io = getIO();

            // Calculate stats
            let onlineCount = 0;
            liveDataStore.forEach((entry) => {
                const status = getDeviceStatus(entry);
                if (status === 'online') {
                    onlineCount++;
                }
            });

            const payload = {
                device_code: device.device_code,
                device_id: device.id,
                timestamp: timestamp.toISOString(),
                data: data,
                status: 'online',
                // Include stats in payload (same pattern as device list)
                stats: {
                    total_devices: totalDevices,
                    online_devices: onlineCount,
                    offline_devices: Math.max(0, totalDevices - onlineCount),
                    active_alerts: 0
                }
            };

            // Emit to specific device channel (for details page)
            io.emit(`device:${device.device_code}`, payload);

            // Emit to global dashboard channel (includes stats)
            io.emit('dashboard:telemetry', payload);

        } catch (socketError) {
            // Don't fail request if socket fails
            console.error('Socket emit error:', socketError);
        }

        res.status(201).json({
            success: true,
            message: 'Live data received (in-memory)',
            device_id: device.id,
            device_code: device.device_code,
            timestamp: timestamp.toISOString(),
            data
        });
    } catch (error) {
        console.error('Error ingesting telemetry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to ingest telemetry data'
        });
    }
});

// ============================================
// GET /api/v1/telemetry/live/:device_code - Get LIVE data (from memory)
// ============================================
router.get('/live/:device_code', async (req: Request, res: Response) => {
    try {
        const { device_code } = req.params;

        const liveData = liveDataStore.get(device_code);
        const status = getDeviceStatus(liveData);

        if (!liveData) {
            return res.json({
                success: true,
                data: null,
                status: 'offline',
                message: 'No live data available'
            });
        }

        res.json({
            success: true,
            data: liveData.data,
            timestamp: liveData.timestamp.toISOString(),
            device_code: liveData.device_code,
            status: status
        });
    } catch (error) {
        console.error('Error fetching live data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live data'
        });
    }
});

// ============================================
// GET /api/v1/telemetry/stats - Dashboard Statistics
// ============================================
router.get('/stats/dashboard', authenticateToken, async (req: Request, res: Response) => {
    try {
        const orgId = (req.user as any)?.organization_id;
        const isSuperAdmin = (req.user as any)?.is_super_admin;

        // Get all devices from database, filtered by organization if not super admin
        let devicesQuery = `
            SELECT id, device_code, name, status, type, last_seen, organization_id
            FROM sps_devices
        `;
        const params: any[] = [];

        if (!isSuperAdmin && orgId) {
            devicesQuery += ` WHERE organization_id = $1`;
            params.push(orgId);
        }

        devicesQuery += ` ORDER BY last_seen DESC NULLS LAST`;

        const devicesResult = await query(devicesQuery, params);

        const devices = devicesResult.rows;
        const totalDevices = devices.length;

        // Check each device's live status from memory
        let onlineCount = 0;
        let offlineCount = 0;
        const recentlyActive: any[] = [];

        devices.forEach(device => {
            const liveEntry = liveDataStore.get(device.device_code);
            const status = getDeviceStatus(liveEntry);

            if (status === 'online') {
                onlineCount++;
            } else {
                offlineCount++;
            }

            // Add to recently active if has live data (limit to 5)
            if (liveEntry && recentlyActive.length < 5) {
                recentlyActive.push({
                    id: device.id,
                    device_code: device.device_code,
                    name: device.name,
                    type: device.type,
                    status: status,
                    last_seen: liveEntry.timestamp.toISOString(),
                    data: liveEntry.data
                });
            }
        });

        // Sort by most recent
        recentlyActive.sort((a, b) =>
            new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
        );

        // TODO: Get active alerts count from alerts table when implemented
        const activeAlerts = 0;

        res.json({
            success: true,
            stats: {
                total_devices: totalDevices,
                online_devices: onlineCount,
                offline_devices: offlineCount,
                active_alerts: activeAlerts
            },
            recently_active: recentlyActive
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard stats'
        });
    }
});

// ============================================
// GET /api/v1/telemetry/stats/system - System-Wide Statistics (Super Admin Only)
// ============================================
router.get('/stats/system', authenticateToken, async (req: Request, res: Response) => {
    try {
        // Debug logging
        console.log('🔐 /stats/system - User data:', {
            hasUser: !!req.user,
            isSuperAdmin: (req.user as any)?.isSuperAdmin,
            userId: (req.user as any)?.id,
            email: (req.user as any)?.email
        });

        const isSuperAdmin = (req.user as any)?.isSuperAdmin;

        // Only Super Admins can access system-wide stats
        if (!isSuperAdmin) {
            console.log('❌ Access denied - user is not super admin');
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Super Admin access required'
            });
        }

        // Get total organizations count
        const orgsResult = await query('SELECT COUNT(*) as total FROM sps_organizations');
        const totalOrganizations = parseInt(orgsResult.rows[0]?.total || '0');

        // Get total events count across all organizations
        const eventsResult = await query('SELECT COUNT(*) as total FROM sps_events');
        const totalEvents = parseInt(eventsResult.rows[0]?.total || '0');

        // Get total users count across all organizations
        const usersResult = await query('SELECT COUNT(*) as total FROM sps_users');
        const totalUsers = parseInt(usersResult.rows[0]?.total || '0');

        // Get total devices count
        const devicesResult = await query('SELECT COUNT(*) as total FROM sps_devices');
        const totalDevices = parseInt(devicesResult.rows[0]?.total || '0');

        res.json({
            success: true,
            stats: {
                total_organizations: totalOrganizations,
                total_events: totalEvents,
                total_users: totalUsers,
                total_devices: totalDevices
            }
        });
    } catch (error) {
        console.error('Error fetching system stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch system stats'
        });
    }
});

// ============================================
// GET /api/v1/telemetry/:device_id - Get device telemetry
// ============================================
router.get('/:device_id', async (req: Request, res: Response) => {
    try {
        const { device_id } = req.params;
        const { start_time, end_time, limit = '100' } = req.query;

        // TODO: Add your SQL query here
        // TimescaleDB query for recent telemetry
        let sql = `
      SELECT id, device_id, timestamp, data
      FROM sps_telemetry
      WHERE device_id = $1
            `;

        const params: any[] = [device_id];

        if (start_time) {
            sql += ` AND timestamp >= $${params.length + 1} `;
            params.push(start_time);
        }

        if (end_time) {
            sql += ` AND timestamp <= $${params.length + 1} `;
            params.push(end_time);
        }

        sql += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} `;
        params.push(limit);

        const result = await query(sql, params);

        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows.map(row => ({
                ...row,
                data: JSON.parse(row.data) // Parse JSON string back to object
            }))
        });
    } catch (error) {
        console.error('Error fetching telemetry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch telemetry data'
        });
    }
});

// ============================================
// GET /api/v1/telemetry/:device_id/hourly - Hourly aggregates
// ============================================
router.get('/:device_id/hourly', async (req: Request, res: Response) => {
    try {
        const { device_id } = req.params;
        const { hours = '24' } = req.query;

        // SECURITY: Validate hours parameter to prevent SQL injection
        const hoursNum = parseInt(hours as string, 10);

        if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 168) {
            return res.status(400).json({
                success: false,
                error: 'Invalid hours parameter. Must be between 1 and 168 (1 week)'
            });
        }

        // SECURITY: Use parameterized query with validated numeric value
        const sql = `
        SELECT
        time_bucket('1 hour', timestamp) AS hour,
            COUNT(*) as reading_count,
            MIN(timestamp) as first_reading,
            MAX(timestamp) as last_reading
      FROM sps_telemetry
      WHERE device_id = $1
        AND timestamp > NOW() - INTERVAL '1 hour' * $2
      GROUP BY hour
      ORDER BY hour DESC
            `;

        const result = await query(sql, [device_id, hoursNum]);

        res.json({
            success: true,
            device_id: parseInt(device_id),
            interval: '1 hour',
            hours: hoursNum,
            count: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching hourly telemetry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hourly telemetry'
        });
    }
});

// ============================================
// GET /api/v1/telemetry/:device_id/latest - Latest reading
// ============================================
router.get('/:device_id/latest', async (req: Request, res: Response) => {
    try {
        const { device_id } = req.params;

        // TODO: Add your SQL query here
        const sql = `
      SELECT id, device_id, timestamp, data
      FROM sps_telemetry
      WHERE device_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
            `;

        const result = await query(sql, [device_id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'No telemetry data found for this device'
            });
        }

        res.json({
            success: true,
            data: {
                ...result.rows[0],
                data: JSON.parse(result.rows[0].data)
            }
        });
    } catch (error) {
        console.error('Error fetching latest telemetry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch latest telemetry'
        });
    }
});

export default router;
