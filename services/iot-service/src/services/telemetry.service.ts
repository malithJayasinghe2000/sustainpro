import { TelemetryRepository, CreateTelemetryInput, TelemetryRecord } from '../repositories/telemetry.repository';
import { liveDataService, LiveDataEntry } from './live-data.service';
import { emitTelemetry, emitDashboardStats } from '../socket';
import { query } from '../db';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'telemetry-service' });

const telemetryRepository = new TelemetryRepository();

export interface DeviceInfo {
    id: string;
    device_code: string;
    organization_id: string;
    event_id?: string;
    department_service_id?: string;
}

export interface IngestTelemetryInput {
    device: DeviceInfo;
    data: Record<string, any>;
    timestamp?: Date;
}

export interface WebhookTelemetryInput {
    device_code: string;
    organization_id: string;
    data: Record<string, any>;
    timestamp?: string;
}

export interface DashboardStats {
    devices_online: number;
    devices_offline: number;
    total_devices: number;
    telemetry_today: number;
    telemetry_this_hour: number;
}

export class TelemetryService {
    /**
     * Ingest telemetry from a device (via API key auth)
     */
    async ingest(input: IngestTelemetryInput): Promise<LiveDataEntry> {
        const { device, data, timestamp } = input;
        const recordedAt = timestamp || new Date();

        // Create live data entry
        const liveEntry: LiveDataEntry = {
            device_id: device.id,
            device_code: device.device_code,
            organization_id: device.organization_id,
            event_id: device.event_id,
            department_service_id: device.department_service_id,
            data,
            timestamp: recordedAt,
            status: 'online',
        };

        // Store in memory for real-time access
        liveDataService.store(device.device_code, liveEntry);

        // Store in database (async, don't block response)
        this.persistTelemetry({
            device_id: device.id,
            device_code: device.device_code,
            organization_id: device.organization_id,
            event_id: device.event_id,
            department_service_id: device.department_service_id,
            data,
            recorded_at: recordedAt,
        }).catch((err) => {
            logger.error('Failed to persist telemetry', { deviceCode: device.device_code, error: err.message });
        });

        // Emit via Socket.IO
        emitTelemetry({
            device_code: device.device_code,
            device_id: device.id,
            organization_id: device.organization_id,
            timestamp: recordedAt,
            data,
            status: 'online',
        });

        // Update device last_seen
        this.updateDeviceLastSeen(device.id).catch((err) => {
            logger.error('Failed to update device last_seen', { deviceId: device.id, error: err.message });
        });

        logger.debug('Telemetry ingested', { deviceCode: device.device_code });

        return liveEntry;
    }

    /**
     * Ingest telemetry from AWS IoT webhook
     */
    async ingestFromWebhook(input: WebhookTelemetryInput): Promise<LiveDataEntry> {
        const { device_code, organization_id, data, timestamp } = input;
        const recordedAt = timestamp ? new Date(timestamp) : new Date();

        // Look up device info
        const deviceResult = await query(
            `SELECT id, device_code, organization_id, department_service_id
             FROM devices 
             WHERE device_code = $1`,
            [device_code]
        );

        if (deviceResult.rows.length === 0) {
            throw new Error(`Device not found: ${device_code}`);
        }

        const device = deviceResult.rows[0];

        // Get event_id from department_service if exists
        let event_id: string | undefined;
        if (device.department_service_id) {
            const serviceResult = await query(
                `SELECT d.event_id 
                 FROM department_services ds
                 JOIN departments d ON ds.department_id = d.id
                 WHERE ds.id = $1`,
                [device.department_service_id]
            );
            if (serviceResult.rows.length > 0) {
                event_id = serviceResult.rows[0].event_id;
            }
        }

        return this.ingest({
            device: {
                id: device.id,
                device_code: device.device_code,
                organization_id: device.organization_id || organization_id,
                event_id,
                department_service_id: device.department_service_id,
            },
            data,
            timestamp: recordedAt,
        });
    }

    /**
     * Get live data for a device
     */
    getLiveData(deviceCode: string): LiveDataEntry | null {
        return liveDataService.get(deviceCode);
    }

    /**
     * Get live data for all devices in an organization
     */
    getLiveDataByOrganization(organizationId: string): LiveDataEntry[] {
        return liveDataService.getByOrganization(organizationId);
    }

    /**
     * Get live data for all devices in an event
     */
    getLiveDataByEvent(eventId: string): LiveDataEntry[] {
        return liveDataService.getByEvent(eventId);
    }

    /**
     * Get historical telemetry for a device
     */
    async getHistory(
        deviceId: string,
        limit: number = 100,
        offset: number = 0
    ): Promise<TelemetryRecord[]> {
        return telemetryRepository.findByDevice(deviceId, limit, offset);
    }

    /**
     * Get historical telemetry within a time range
     */
    async getHistoryByTimeRange(
        deviceId: string,
        startTime: Date,
        endTime: Date
    ): Promise<TelemetryRecord[]> {
        return telemetryRepository.findByDeviceAndTimeRange(deviceId, startTime, endTime);
    }

    /**
     * Get dashboard statistics
     */
    async getDashboardStats(organizationId?: string | null): Promise<DashboardStats> {
        // Get device counts from database
        let deviceQuery = 'SELECT COUNT(*) as total FROM devices';
        const params: any[] = [];

        if (organizationId) {
            deviceQuery += ' WHERE organization_id = $1';
            params.push(organizationId);
        }

        const deviceResult = await query(deviceQuery, params);
        const totalDevices = parseInt(deviceResult.rows[0].total);

        // Get online/offline from live data
        const devicesOnline = liveDataService.getOnlineCount(organizationId || undefined);
        const devicesOffline = liveDataService.getOfflineCount(organizationId || undefined);

        // Get telemetry stats
        const telemetryStats = await telemetryRepository.getStats(organizationId || undefined);

        const stats: DashboardStats = {
            devices_online: devicesOnline,
            devices_offline: devicesOffline,
            total_devices: totalDevices,
            telemetry_today: telemetryStats.records_today,
            telemetry_this_hour: telemetryStats.records_this_hour,
        };

        // Emit to dashboard subscribers
        emitDashboardStats({
            devices_online: stats.devices_online,
            devices_offline: stats.devices_offline,
            total_telemetry_today: stats.telemetry_today,
            last_updated: new Date(),
        });

        return stats;
    }

    /**
     * Get system-wide statistics (super admin only)
     */
    async getSystemStats(): Promise<{
        total_devices: number;
        devices_online: number;
        devices_offline: number;
        total_telemetry_records: number;
        telemetry_today: number;
        unique_organizations: number;
    }> {
        const telemetryStats = await telemetryRepository.getStats();

        const deviceResult = await query('SELECT COUNT(*) as total FROM devices');
        const orgResult = await query('SELECT COUNT(DISTINCT organization_id) as count FROM devices');

        return {
            total_devices: parseInt(deviceResult.rows[0].total),
            devices_online: liveDataService.getOnlineCount(),
            devices_offline: liveDataService.getOfflineCount(),
            total_telemetry_records: telemetryStats.total_records,
            telemetry_today: telemetryStats.records_today,
            unique_organizations: parseInt(orgResult.rows[0].count),
        };
    }

    /**
     * Persist telemetry to database
     */
    private async persistTelemetry(input: CreateTelemetryInput): Promise<TelemetryRecord> {
        return telemetryRepository.create(input);
    }

    /**
     * Update device last_seen timestamp
     */
    private async updateDeviceLastSeen(deviceId: string): Promise<void> {
        await query(
            `UPDATE devices SET last_seen_at = NOW(), status = 'ACTIVE' WHERE id = $1`,
            [deviceId]
        );
    }
}

// Singleton instance
export const telemetryService = new TelemetryService();
