import crypto from 'crypto';
import { DeviceRepository, Device, CreateDeviceInput, UpdateDeviceInput } from '../repositories/device.repository';
import { DeviceModelRepository } from '../repositories/device-model.repository';
import { awsIotService } from './aws-iot.service';
import { publishEvent } from '../messaging/publisher';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'device-service' });

const deviceRepository = new DeviceRepository();
const deviceModelRepository = new DeviceModelRepository();

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
     * Generate API key and its hash
     */
    private generateApiKey(): { apiKey: string; apiKeyHash: string } {
        const apiKey = crypto.randomBytes(32).toString('hex');
        const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        return { apiKey, apiKeyHash };
    }

    /**
     * Hash an API key for comparison
     */
    hashApiKey(apiKey: string): string {
        return crypto.createHash('sha256').update(apiKey).digest('hex');
    }

    async getAll(organizationId?: string | null): Promise<Device[]> {
        return deviceRepository.findAll(organizationId);
    }

    async getById(id: string): Promise<Device | null> {
        return deviceRepository.findById(id);
    }

    async getByDeviceCode(deviceCode: string): Promise<Device | null> {
        return deviceRepository.findByDeviceCode(deviceCode);
    }

    async getByOrganization(organizationId: string): Promise<Device[]> {
        return deviceRepository.findByOrganization(organizationId);
    }

    async getByDepartmentService(departmentServiceId: string): Promise<Device[]> {
        return deviceRepository.findByDepartmentService(departmentServiceId);
    }

    async getByApiKey(apiKey: string): Promise<Device | null> {
        const hash = this.hashApiKey(apiKey);
        return deviceRepository.findByApiKeyHash(hash);
    }

    async create(data: {
        device_model_id: string;
        organization_id: string;
        department_service_id?: string;
        name: string;
        description?: string;
        metadata?: Record<string, any>;
    }): Promise<{ device: Device; apiKey: string }> {
        // Validate device model exists
        const model = await deviceModelRepository.findById(data.device_model_id);
        if (!model) {
            throw new Error('Device model not found');
        }

        // Generate device code and API key
        const deviceCode = this.generateDeviceCode();
        const { apiKey, apiKeyHash } = this.generateApiKey();

        const device = await deviceRepository.create({
            device_code: deviceCode,
            device_model_id: data.device_model_id,
            organization_id: data.organization_id,
            department_service_id: data.department_service_id,
            name: data.name,
            description: data.description,
            api_key_hash: apiKeyHash,
            metadata: data.metadata,
        });

        logger.info('Device created', { id: device.id, deviceCode });

        await publishEvent('device.created', {
            device_id: device.id,
            device_code: deviceCode,
            organization_id: data.organization_id,
        });

        // Return device with the API key (only time it's returned)
        return { device, apiKey };
    }

    async update(id: string, data: UpdateDeviceInput): Promise<Device> {
        const device = await deviceRepository.update(id, data);

        await publishEvent('device.updated', {
            device_id: id,
            changes: Object.keys(data),
        });

        return device;
    }

    async delete(id: string): Promise<void> {
        const device = await deviceRepository.findById(id);
        if (!device) {
            throw new Error('Device not found');
        }

        // Deprovision from AWS IoT if provisioned
        if (device.aws_thing_name) {
            try {
                await awsIotService.deprovisionDevice(
                    device.aws_thing_name,
                    device.aws_certificate_arn
                );
            } catch (error: any) {
                logger.error('Failed to deprovision device from AWS IoT', { 
                    id, 
                    error: error.message 
                });
                // Continue with deletion even if deprovision fails
            }
        }

        await deviceRepository.delete(id);

        await publishEvent('device.deleted', {
            device_id: id,
            device_code: device.device_code,
            organization_id: device.organization_id,
        });

        logger.info('Device deleted', { id, deviceCode: device.device_code });
    }

    async assignToService(
        deviceId: string,
        departmentServiceId: string
    ): Promise<Device> {
        const device = await deviceRepository.update(deviceId, {
            department_service_id: departmentServiceId,
        });

        await publishEvent('device.assigned', {
            device_id: deviceId,
            department_service_id: departmentServiceId,
        });

        return device;
    }

    async unassignFromService(deviceId: string): Promise<Device> {
        const device = await deviceRepository.update(deviceId, {
            department_service_id: undefined,
        });

        await publishEvent('device.unassigned', {
            device_id: deviceId,
        });

        return device;
    }

    async provisionIoT(id: string): Promise<{
        success: boolean;
        provisioning_data?: any;
        error?: string;
    }> {
        const device = await deviceRepository.findById(id);
        if (!device) {
            return { success: false, error: 'Device not found' };
        }

        if (device.aws_thing_name) {
            return { success: false, error: 'Device already provisioned' };
        }

        try {
            const provisioningData = await awsIotService.provisionDevice(
                device.device_code,
                device.organization_id
            );

            // Update device with provisioning info
            await deviceRepository.update(id, {
                status: 'PROVISIONED',
                aws_thing_name: provisioningData.thing_name,
                aws_certificate_arn: provisioningData.certificate_arn,
                mqtt_topics: provisioningData.topics,
                metadata: {
                    ...device.metadata,
                    iot_endpoint: provisioningData.iot_endpoint,
                    provisioned_at: new Date().toISOString(),
                },
            });

            await publishEvent('device.provisioned', {
                device_id: id,
                device_code: device.device_code,
                thing_name: provisioningData.thing_name,
            });

            logger.info('Device provisioned', { id, deviceCode: device.device_code });

            return { success: true, provisioning_data: provisioningData };
        } catch (error: any) {
            logger.error('Provisioning failed', { id, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async regenerateApiKey(id: string): Promise<{ device: Device; apiKey: string }> {
        const device = await deviceRepository.findById(id);
        if (!device) {
            throw new Error('Device not found');
        }

        const { apiKey, apiKeyHash } = this.generateApiKey();

        const updatedDevice = await deviceRepository.update(id, {
            metadata: {
                ...device.metadata,
                api_key_regenerated_at: new Date().toISOString(),
            },
        });

        // Update the API key hash directly
        await deviceRepository.update(id, { metadata: updatedDevice.metadata });

        logger.info('API key regenerated', { id, deviceCode: device.device_code });

        await publishEvent('device.api_key_regenerated', {
            device_id: id,
            device_code: device.device_code,
        });

        return { device: updatedDevice, apiKey };
    }

    async updateLastSeen(id: string): Promise<void> {
        await deviceRepository.updateLastSeen(id);
    }

    async getStats(organizationId?: string): Promise<{
        total: number;
        active: number;
        offline: number;
        provisioned: number;
    }> {
        return deviceRepository.getDeviceStats(organizationId);
    }
}
