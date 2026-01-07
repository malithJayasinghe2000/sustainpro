import { query } from '../db';

export interface TelemetryRecord {
    id: string;
    device_id: string;
    device_code: string;
    organization_id: string;
    event_id?: string;
    department_service_id?: string;
    data: Record<string, any>;
    recorded_at: Date;
    created_at: Date;
}

export interface CreateTelemetryInput {
    device_id: string;
    device_code: string;
    organization_id: string;
    event_id?: string;
    department_service_id?: string;
    data: Record<string, any>;
    recorded_at?: Date;
}

export interface TelemetryStats {
    total_records: number;
    records_today: number;
    records_this_hour: number;
    unique_devices: number;
}

export class TelemetryRepository {
    /**
     * Insert a telemetry record
     */
    async create(input: CreateTelemetryInput): Promise<TelemetryRecord> {
        const result = await query(
            `INSERT INTO device_telemetry (
                device_id, device_code, organization_id, event_id, 
                department_service_id, data, recorded_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                input.device_id,
                input.device_code,
                input.organization_id,
                input.event_id || null,
                input.department_service_id || null,
                JSON.stringify(input.data),
                input.recorded_at || new Date(),
            ]
        );
        return result.rows[0];
    }

    /**
     * Get telemetry records for a device with pagination
     */
    async findByDevice(
        deviceId: string,
        limit: number = 100,
        offset: number = 0
    ): Promise<TelemetryRecord[]> {
        const result = await query(
            `SELECT * FROM device_telemetry 
             WHERE device_id = $1 
             ORDER BY recorded_at DESC 
             LIMIT $2 OFFSET $3`,
            [deviceId, limit, offset]
        );
        return result.rows;
    }

    /**
     * Get telemetry records for a device within a time range
     */
    async findByDeviceAndTimeRange(
        deviceId: string,
        startTime: Date,
        endTime: Date
    ): Promise<TelemetryRecord[]> {
        const result = await query(
            `SELECT * FROM device_telemetry 
             WHERE device_id = $1 
             AND recorded_at >= $2 
             AND recorded_at <= $3 
             ORDER BY recorded_at ASC`,
            [deviceId, startTime, endTime]
        );
        return result.rows;
    }

    /**
     * Get latest telemetry for multiple devices
     */
    async findLatestByDevices(deviceIds: string[]): Promise<TelemetryRecord[]> {
        if (deviceIds.length === 0) return [];

        const result = await query(
            `SELECT DISTINCT ON (device_id) *
             FROM device_telemetry
             WHERE device_id = ANY($1)
             ORDER BY device_id, recorded_at DESC`,
            [deviceIds]
        );
        return result.rows;
    }

    /**
     * Get telemetry records for an organization
     */
    async findByOrganization(
        organizationId: string,
        limit: number = 100
    ): Promise<TelemetryRecord[]> {
        const result = await query(
            `SELECT * FROM device_telemetry 
             WHERE organization_id = $1 
             ORDER BY recorded_at DESC 
             LIMIT $2`,
            [organizationId, limit]
        );
        return result.rows;
    }

    /**
     * Get telemetry records for an event
     */
    async findByEvent(eventId: string, limit: number = 100): Promise<TelemetryRecord[]> {
        const result = await query(
            `SELECT * FROM device_telemetry 
             WHERE event_id = $1 
             ORDER BY recorded_at DESC 
             LIMIT $2`,
            [eventId, limit]
        );
        return result.rows;
    }

    /**
     * Get aggregated stats
     */
    async getStats(organizationId?: string): Promise<TelemetryStats> {
        let whereClause = '';
        const params: any[] = [];

        if (organizationId) {
            whereClause = 'WHERE organization_id = $1';
            params.push(organizationId);
        }

        const result = await query(
            `SELECT 
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE recorded_at >= CURRENT_DATE) as records_today,
                COUNT(*) FILTER (WHERE recorded_at >= NOW() - INTERVAL '1 hour') as records_this_hour,
                COUNT(DISTINCT device_id) as unique_devices
             FROM device_telemetry
             ${whereClause}`,
            params
        );

        return {
            total_records: parseInt(result.rows[0].total_records),
            records_today: parseInt(result.rows[0].records_today),
            records_this_hour: parseInt(result.rows[0].records_this_hour),
            unique_devices: parseInt(result.rows[0].unique_devices),
        };
    }

    /**
     * Delete old telemetry records (for cleanup job)
     */
    async deleteOlderThan(days: number): Promise<number> {
        const result = await query(
            `DELETE FROM device_telemetry 
             WHERE recorded_at < NOW() - INTERVAL '1 day' * $1
             RETURNING id`,
            [days]
        );
        return result.rowCount || 0;
    }

    /**
     * Get hourly averages for a device metric
     */
    async getHourlyAverages(
        deviceId: string,
        metricPath: string,
        hours: number = 24
    ): Promise<{ hour: Date; avg: number }[]> {
        const result = await query(
            `SELECT 
                date_trunc('hour', recorded_at) as hour,
                AVG((data->$2)::numeric) as avg
             FROM device_telemetry
             WHERE device_id = $1 
             AND recorded_at >= NOW() - INTERVAL '1 hour' * $3
             AND data->$2 IS NOT NULL
             GROUP BY date_trunc('hour', recorded_at)
             ORDER BY hour ASC`,
            [deviceId, metricPath, hours]
        );
        return result.rows;
    }
}
