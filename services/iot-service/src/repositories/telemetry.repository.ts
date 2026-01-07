import { query } from '../db';

export interface TelemetryRecord {
    id: number;
    device_id: number;
    device_code: string;
    organization_id: string;
    event_id?: string;
    service_id?: string;
    data: Record<string, any>;
    recorded_at: Date;
    created_at: Date;
}

export interface CreateTelemetryInput {
    device_id: number;
    device_code: string;
    organization_id: string;
    event_id?: string;
    service_id?: string;
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
            `INSERT INTO sps_telemetry (
                device_id, device_code, organization_id, event_id, 
                service_id, data, recorded_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                input.device_id,
                input.device_code,
                input.organization_id,
                input.event_id || null,
                input.service_id || null,
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
        deviceId: number,
        limit: number = 100,
        offset: number = 0
    ): Promise<TelemetryRecord[]> {
        const result = await query(
            `SELECT * FROM sps_telemetry 
             WHERE device_id = $1 
             ORDER BY recorded_at DESC 
             LIMIT $2 OFFSET $3`,
            [deviceId, limit, offset]
        );
        return result.rows;
    }

    /**
     * Get telemetry records by device code
     */
    async findByDeviceCode(
        deviceCode: string,
        limit: number = 100
    ): Promise<TelemetryRecord[]> {
        const result = await query(
            `SELECT * FROM sps_telemetry 
             WHERE device_code = $1 
             ORDER BY recorded_at DESC 
             LIMIT $2`,
            [deviceCode, limit]
        );
        return result.rows;
    }

    /**
     * Get telemetry records for an organization
     */
    async findByOrganization(
        organizationId: string,
        limit: number = 100,
        offset: number = 0
    ): Promise<TelemetryRecord[]> {
        const result = await query(
            `SELECT * FROM sps_telemetry 
             WHERE organization_id = $1 
             ORDER BY recorded_at DESC 
             LIMIT $2 OFFSET $3`,
            [organizationId, limit, offset]
        );
        return result.rows;
    }

    /**
     * Get telemetry within a time range
     */
    async findByTimeRange(
        deviceId: number,
        startTime: Date,
        endTime: Date
    ): Promise<TelemetryRecord[]> {
        const result = await query(
            `SELECT * FROM sps_telemetry 
             WHERE device_id = $1 
             AND recorded_at >= $2 
             AND recorded_at <= $3 
             ORDER BY recorded_at ASC`,
            [deviceId, startTime, endTime]
        );
        return result.rows;
    }

    /**
     * Get latest telemetry for each device in an organization
     */
    async findLatestByOrganization(organizationId: string): Promise<TelemetryRecord[]> {
        const result = await query(
            `SELECT DISTINCT ON (device_id) *
             FROM sps_telemetry 
             WHERE organization_id = $1
             ORDER BY device_id, recorded_at DESC`,
            [organizationId]
        );
        return result.rows;
    }

    /**
     * Get telemetry statistics
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
             FROM sps_telemetry ${whereClause}`,
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
     * Delete old telemetry records (for cleanup)
     */
    async deleteOlderThan(days: number): Promise<number> {
        const result = await query(
            `DELETE FROM sps_telemetry 
             WHERE recorded_at < NOW() - INTERVAL '1 day' * $1
             RETURNING id`,
            [days]
        );
        return result.rowCount || 0;
    }

    /**
     * Get aggregated stats for dashboard
     */
    async getDashboardStats(organizationId: string): Promise<{
        total: number;
        today: number;
        devices_reporting: number;
    }> {
        const result = await query(
            `SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE recorded_at >= CURRENT_DATE) as today,
                COUNT(DISTINCT device_id) as devices_reporting
             FROM sps_telemetry 
             WHERE organization_id = $1 
             AND recorded_at >= NOW() - INTERVAL '24 hours'`,
            [organizationId]
        );

        return {
            total: parseInt(result.rows[0].total),
            today: parseInt(result.rows[0].today),
            devices_reporting: parseInt(result.rows[0].devices_reporting),
        };
    }
}
