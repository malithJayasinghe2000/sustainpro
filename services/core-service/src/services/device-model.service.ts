import { DeviceModelRepository, DeviceModel, CreateDeviceModelInput, UpdateDeviceModelInput } from '../repositories/device-model.repository';
import { publishEvent } from '../messaging/publisher';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'device-model-service' });

const deviceModelRepository = new DeviceModelRepository();

export class DeviceModelService {
    async getAll(includeInactive: boolean = false): Promise<DeviceModel[]> {
        return deviceModelRepository.findAll(includeInactive);
    }

    async getById(id: string): Promise<DeviceModel | null> {
        return deviceModelRepository.findById(id);
    }

    async getByModelNumber(modelNumber: string): Promise<DeviceModel | null> {
        return deviceModelRepository.findByModelNumber(modelNumber);
    }

    async getByCategory(category: DeviceModel['category']): Promise<DeviceModel[]> {
        return deviceModelRepository.findByCategory(category);
    }

    async create(data: CreateDeviceModelInput): Promise<DeviceModel> {
        // Check for duplicate model number
        const existing = await deviceModelRepository.findByModelNumber(data.model_number);
        if (existing) {
            throw new Error('A device model with this model number already exists');
        }

        const model = await deviceModelRepository.create(data);

        logger.info('Device model created', { id: model.id, name: model.name });

        await publishEvent('device_model.created', {
            model_id: model.id,
            name: model.name,
            manufacturer: model.manufacturer,
        });

        return model;
    }

    async update(id: string, data: UpdateDeviceModelInput): Promise<DeviceModel> {
        // Check for duplicate model number if updating
        if (data.model_number) {
            const existing = await deviceModelRepository.findByModelNumber(data.model_number);
            if (existing && existing.id !== id) {
                throw new Error('A device model with this model number already exists');
            }
        }

        const model = await deviceModelRepository.update(id, data);

        await publishEvent('device_model.updated', {
            model_id: id,
            changes: Object.keys(data),
        });

        return model;
    }

    async delete(id: string): Promise<void> {
        // Check if any devices are using this model
        const usageCount = await deviceModelRepository.getUsageCount(id);
        if (usageCount > 0) {
            throw new Error(`Cannot delete: ${usageCount} device(s) are using this model`);
        }

        await deviceModelRepository.delete(id);

        await publishEvent('device_model.deleted', {
            model_id: id,
        });

        logger.info('Device model deleted', { id });
    }

    async getUsageCount(id: string): Promise<number> {
        return deviceModelRepository.getUsageCount(id);
    }

    async addFirmwareVersion(id: string, version: string): Promise<DeviceModel> {
        const model = await deviceModelRepository.findById(id);
        if (!model) {
            throw new Error('Device model not found');
        }

        const versions = model.firmware_versions || [];
        if (versions.includes(version)) {
            throw new Error('Firmware version already exists');
        }

        versions.push(version);

        return deviceModelRepository.update(id, {
            firmware_versions: versions,
        });
    }
}
