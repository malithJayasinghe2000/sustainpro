import { TelemetryRepository, CreateTelemetryInput, TelemetryRecord } from '../repositories/telemetry.repository';
import { liveDataService, LiveDataEntry } from './live-data.service';
import { emitTelemetry, emitDashboardStats } from '../socket';
import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'telemetry-service' });

const telemetryRepository = new TelemetryRepository();

export interface DeviceInfo {
    id: number;  // Changed from string to number to match database SERIAL type
    device_code: string;
    organization_id: string;
    event_id?: string;
    service_id?: string;  // Changed from department_service_id to service_id
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
            service_id: device.service_id,
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
            service_id: device.service_id,
            data,
            recorded_at: recordedAt,
        }).catch((err) => {
            logger.error('Failed to persist telemetry', { deviceCode: device.device_code, error: err.message });
        });

        // Emit via Socket.IO
        emitTelemetry({
            device_code: device.device_code,
            device_id: String(device.id),
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
        const device = await prisma.sps_devices.findFirst({
            where: { device_code },
            select: {
                id: true,
                device_code: true,
                organization_id: true,
                service_id: true,
            },
        });

        if (!device) {
            throw new Error(`Device not found: ${device_code}`);
        }

        // Get event_id from service if exists
        let event_id: string | undefined;
        if (device.service_id) {
            const service = await prisma.sps_department_services.findUnique({
                where: { id: device.service_id },
                include: {
                    sps_departments: {
                        select: { event_id: true },
                    },
                },
            });
            if (service?.sps_departments?.event_id) {
                event_id = service.sps_departments.event_id;
            }
        }

        return this.ingest({
            device: {
                id: device.id,
                device_code: device.device_code,
                organization_id: device.organization_id || organization_id,
                event_id,
                service_id: device.service_id || undefined,
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
        deviceId: number,
        limit: number = 100,
        offset: number = 0
    ): Promise<TelemetryRecord[]> {
        return telemetryRepository.findByDevice(deviceId, limit, offset);
    }

    /**
     * Get historical telemetry within a time range
     */
    async getHistoryByTimeRange(
        deviceId: number,
        startTime: Date,
        endTime: Date
    ): Promise<TelemetryRecord[]> {
        return telemetryRepository.findByTimeRange(deviceId, startTime, endTime);
    }

    /**
     * Get dashboard statistics
     */
    async getDashboardStats(organizationId?: string | null): Promise<DashboardStats> {
        // Get device counts from database
        const totalDevices = organizationId
            ? await prisma.sps_devices.count({ where: { organization_id: organizationId } })
            : await prisma.sps_devices.count();

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

        const totalDevices = await prisma.sps_devices.count();
        const uniqueOrgs = await prisma.sps_devices.findMany({
            distinct: ['organization_id'],
            select: { organization_id: true },
        });

        return {
            total_devices: totalDevices,
            devices_online: liveDataService.getOnlineCount(),
            devices_offline: liveDataService.getOfflineCount(),
            total_telemetry_records: telemetryStats.total_records,
            telemetry_today: telemetryStats.records_today,
            unique_organizations: uniqueOrgs.length,
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
    private async updateDeviceLastSeen(deviceId: number): Promise<void> {
        await prisma.sps_devices.update({
            where: { id: deviceId },
            data: {
                last_seen: new Date(),
                status: 'ACTIVE',
            },
        });
    }
}

// Singleton instance
export const telemetryService = new TelemetryService();
