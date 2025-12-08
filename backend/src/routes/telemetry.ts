import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// ============================================
// POST /api/v1/telemetry - Ingest telemetry data
// ============================================
router.post('/', async (req: Request, res: Response) => {
    try {
        const { device_id, data } = req.body;

        // TODO: Add your SQL query here
        const sql = `
      INSERT INTO sps_telemetry (device_id, data, timestamp)
      VALUES ($1, $2, NOW())
      RETURNING id, device_id, timestamp
    `;

        // Convert data object to JSON string
        const dataJson = JSON.stringify(data);
        const result = await query(sql, [device_id, dataJson]);

        // Also update device's last_seen
        await query(
            'UPDATE sps_devices SET last_seen = NOW(), last_data = $1 WHERE id = $2',
            [dataJson, device_id]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
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
            sql += ` AND timestamp >= $${params.length + 1}`;
            params.push(start_time);
        }

        if (end_time) {
            sql += ` AND timestamp <= $${params.length + 1}`;
            params.push(end_time);
        }

        sql += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
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

        // TODO: Add your TimescaleDB query here
        // Use time_bucket for aggregation
        const sql = `
      SELECT
        time_bucket('1 hour', timestamp) AS hour,
        COUNT(*) as reading_count,
        MIN(timestamp) as first_reading,
        MAX(timestamp) as last_reading
      FROM sps_telemetry
      WHERE device_id = $1
        AND timestamp > NOW() - INTERVAL '${hours} hours'
      GROUP BY hour
      ORDER BY hour DESC
    `;

        const result = await query(sql, [device_id]);

        res.json({
            success: true,
            device_id: parseInt(device_id),
            interval: '1 hour',
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
