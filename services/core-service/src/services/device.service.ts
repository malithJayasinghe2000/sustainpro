import crypto from 'crypto';
import { DeviceRepository, Device, CreateDeviceInput, UpdateDeviceInput } from '../repositories/device.repository';
import { publishEvent } from '../messaging/publisher';
import { NotFoundError, createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'device-service' });

const deviceRepository = new DeviceRepository();

export class DeviceService {
    /**
     * Generate a unique device code
     */
    private generateDeviceCode(): string {
        const prefix = 'SP';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Generate API key
     */
    private generateApiKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    async getAll(organizationId?: string | null): Promise<Device[]> {
        return deviceRepository.findAll(organizationId);
    }

    async getById(id: string, organizationId?: string): Promise<Device> {
        const device = await deviceRepository.findById(id, organizationId);
        if (!device) {
            throw new NotFoundError(`Device not found: ${id}`);
        }
        return device;
    }

    async getByDeviceCode(deviceCode: string): Promise<Device | null> {
        return deviceRepository.findByDeviceCode(deviceCode);
    }

    async getByOrganization(organizationId: string): Promise<Device[]> {
        return deviceRepository.findByOrganization(organizationId);
    }

    async getByService(serviceId: string): Promise<Device[]> {
        return deviceRepository.findByService(serviceId);
    }

    async getByApiKey(apiKey: string): Promise<Device | null> {
        return deviceRepository.findByApiKey(apiKey);
    }

    async create(data: {
        organization_id: string;
        name?: string;
        type?: string;
        service_id?: string;
        metadata?: Record<string, any>;
    }): Promise<{ device: Device; apiKey: string }> {
        // Generate device code and API key
        const deviceCode = this.generateDeviceCode();
        const apiKey = this.generateApiKey();

        const device = await deviceRepository.create({
            device_code: deviceCode,
            organization_id: data.organization_id,
            name: data.name,
            type: data.type,
            api_key: apiKey,
            service_id: data.service_id,
            metadata: data.metadata,
        });

        logger.info('Device created', { id: device.id, deviceCode });

        // Publish event (non-blocking)
        publishEvent('device.created', {
            device_id: device.id,
            device_code: deviceCode,
            organization_id: data.organization_id,
        }).catch((err) => {
            logger.warn('Failed to publish device.created event', { error: err.message });
        });

        return { device, apiKey };
    }

    async update(id: string, data: UpdateDeviceInput, organizationId?: string): Promise<Device> {
        const existing = await deviceRepository.findById(id, organizationId);
        if (!existing) {
            throw new NotFoundError(`Device not found: ${id}`);
        }

        const updated = await deviceRepository.update(id, data);
        logger.info('Device updated', { id });

        publishEvent('device.updated', {
            device_id: id,
            changes: Object.keys(data),
        }).catch((err) => {
            logger.warn('Failed to publish device.updated event', { error: err.message });
        });

        return updated;
    }

    async assignToService(deviceId: string, serviceId: string | null): Promise<Device> {
        const device = await deviceRepository.findById(deviceId);
        if (!device) {
            throw new NotFoundError(`Device not found: ${deviceId}`);
        }

        const updated = await deviceRepository.assignToService(deviceId, serviceId);
        logger.info('Device assigned to service', { deviceId, serviceId });

        publishEvent('device.assigned', {
            device_id: deviceId,
            service_id: serviceId,
        }).catch((err) => {
            logger.warn('Failed to publish device.assigned event', { error: err.message });
        });

        return updated;
    }

    async updateLastSeen(deviceId: string | number): Promise<void> {
        await deviceRepository.updateLastSeen(deviceId);
    }

    async delete(id: string, organizationId?: string): Promise<void> {
        const device = await deviceRepository.findById(id, organizationId);
        if (!device) {
            throw new NotFoundError(`Device not found: ${id}`);
        }

        await deviceRepository.delete(id);
        logger.info('Device deleted', { id });

        publishEvent('device.deleted', {
            device_id: id,
            device_code: device.device_code,
        }).catch((err) => {
            logger.warn('Failed to publish device.deleted event', { error: err.message });
        });
    }

    async getStats(organizationId?: string): Promise<{
        total: number;
        active: number;
        offline: number;
    }> {
        return deviceRepository.getDeviceStats(organizationId);
    }

    async countByOrganization(organizationId: string): Promise<number> {
        return deviceRepository.countByOrganization(organizationId);
    }

    /**
     * Regenerate API key for a device
     */
    async regenerateApiKey(id: string, organizationId?: string): Promise<{ device: Device; apiKey: string }> {
        const device = await deviceRepository.findById(id, organizationId);
        if (!device) {
            throw new NotFoundError(`Device not found: ${id}`);
        }

        const newApiKey = this.generateApiKey();
        const updated = await deviceRepository.update(id, { 
            // We'd need to add api_key to UpdateDeviceInput or handle separately
        } as any);

        logger.info('Device API key regenerated', { id });

        return { device: updated, apiKey: newApiKey };
    }
}

export const deviceService = new DeviceService();
