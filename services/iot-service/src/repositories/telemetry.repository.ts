import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

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
        const record = await prisma.sps_telemetry.create({
            data: {
                device_id: input.device_id,
                device_code: input.device_code,
                organization_id: input.organization_id,
                event_id: input.event_id || null,
                service_id: input.service_id || null,
                data: input.data as any,
                recorded_at: input.recorded_at || new Date(),
            },
        });
        return record as any as TelemetryRecord;
    }

    /**
     * Get telemetry records for a device with pagination
     */
    async findByDevice(
        deviceId: number,
        limit: number = 100,
        offset: number = 0
    ): Promise<TelemetryRecord[]> {
        const records = await prisma.sps_telemetry.findMany({
            where: { device_id: deviceId },
            orderBy: { recorded_at: 'desc' },
            take: limit,
            skip: offset,
        });
        return records as any as TelemetryRecord[];
    }

    /**
     * Get telemetry records by device code
     */
    async findByDeviceCode(
        deviceCode: string,
        limit: number = 100
    ): Promise<TelemetryRecord[]> {
        const records = await prisma.sps_telemetry.findMany({
            where: { device_code: deviceCode },
            orderBy: { recorded_at: 'desc' },
            take: limit,
        });
        return records as any as TelemetryRecord[];
    }

    /**
     * Get telemetry records for an organization
     */
    async findByOrganization(
        organizationId: string,
        limit: number = 100,
        offset: number = 0
    ): Promise<TelemetryRecord[]> {
        const records = await prisma.sps_telemetry.findMany({
            where: { organization_id: organizationId },
            orderBy: { recorded_at: 'desc' },
            take: limit,
            skip: offset,
        });
        return records as any as TelemetryRecord[];
    }

    /**
     * Get telemetry within a time range
     */
    async findByTimeRange(
        deviceId: number,
        startTime: Date,
        endTime: Date
    ): Promise<TelemetryRecord[]> {
        const records = await prisma.sps_telemetry.findMany({
            where: {
                device_id: deviceId,
                recorded_at: {
                    gte: startTime,
                    lte: endTime,
                },
            },
            orderBy: { recorded_at: 'asc' },
        });
        return records as any as TelemetryRecord[];
    }

    /**
     * Get latest telemetry for each device in an organization
     */
    async findLatestByOrganization(organizationId: string): Promise<TelemetryRecord[]> {
        // Use raw SQL for DISTINCT ON which Prisma doesn't support natively
        const records = await prisma.$queryRaw<TelemetryRecord[]>`
            SELECT DISTINCT ON (device_id) *
            FROM sps_telemetry 
            WHERE organization_id = ${organizationId}::uuid
            ORDER BY device_id, recorded_at DESC
        `;
        return records;
    }

    /**
     * Get telemetry statistics
     */
    async getStats(organizationId?: string): Promise<TelemetryStats> {
        const result = organizationId
            ? await prisma.$queryRaw<Array<any>>`
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(*) FILTER (WHERE recorded_at >= CURRENT_DATE) as records_today,
                    COUNT(*) FILTER (WHERE recorded_at >= NOW() - INTERVAL '1 hour') as records_this_hour,
                    COUNT(DISTINCT device_id) as unique_devices
                FROM sps_telemetry 
                WHERE organization_id = ${organizationId}::uuid
            `
            : await prisma.$queryRaw<Array<any>>`
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(*) FILTER (WHERE recorded_at >= CURRENT_DATE) as records_today,
                    COUNT(*) FILTER (WHERE recorded_at >= NOW() - INTERVAL '1 hour') as records_this_hour,
                    COUNT(DISTINCT device_id) as unique_devices
                FROM sps_telemetry
            `;

        return {
            total_records: parseInt(result[0].total_records),
            records_today: parseInt(result[0].records_today),
            records_this_hour: parseInt(result[0].records_this_hour),
            unique_devices: parseInt(result[0].unique_devices),
        };
    }

    /**
     * Delete old telemetry records (for cleanup)
     */
    async deleteOlderThan(days: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const result = await prisma.sps_telemetry.deleteMany({
            where: {
                recorded_at: {
                    lt: cutoffDate,
                },
            },
        });
        return result.count;
    }

    /**
     * Get aggregated stats for dashboard
     */
    async getDashboardStats(organizationId: string): Promise<{
        total: number;
        today: number;
        devices_reporting: number;
    }> {
        const result = await prisma.$queryRaw<Array<any>>`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE recorded_at >= CURRENT_DATE) as today,
                COUNT(DISTINCT device_id) as devices_reporting
            FROM sps_telemetry 
            WHERE organization_id = ${organizationId}::uuid
            AND recorded_at >= NOW() - INTERVAL '24 hours'
        `;

        return {
            total: parseInt(result[0].total),
            today: parseInt(result[0].today),
            devices_reporting: parseInt(result[0].devices_reporting),
        };
    }
}
