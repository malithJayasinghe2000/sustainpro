import { DeviceModelRepository, DeviceModel, CreateDeviceModelInput, UpdateDeviceModelInput } from '../repositories/device-model.repository';
import { NotFoundError, ConflictError, createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'device-model-service' });

const deviceModelRepository = new DeviceModelRepository();

export class DeviceModelService {
    /**
     * Get all device models
     */
    async getAll(): Promise<DeviceModel[]> {
        return deviceModelRepository.findAll();
    }

    /**
     * Get a device model by ID
     */
    async getById(id: string): Promise<DeviceModel> {
        const model = await deviceModelRepository.findById(id);
        if (!model) {
            throw new NotFoundError(`Device model not found: ${id}`);
        }
        return model;
    }

    /**
     * Create a new device model
     */
    async create(input: CreateDeviceModelInput): Promise<DeviceModel> {
        // Check if ID already exists
        const existing = await deviceModelRepository.findById(input.id);
        if (existing) {
            throw new ConflictError(`Device model with ID ${input.id} already exists`);
        }

        logger.info('Creating device model', { id: input.id, name: input.name });
        return deviceModelRepository.create(input);
    }

    /**
     * Update a device model
     */
    async update(id: string, input: UpdateDeviceModelInput): Promise<DeviceModel> {
        const existing = await deviceModelRepository.findById(id);
        if (!existing) {
            throw new NotFoundError(`Device model not found: ${id}`);
        }

        logger.info('Updating device model', { id });
        return deviceModelRepository.update(id, input);
    }

    /**
     * Delete a device model
     */
    async delete(id: string): Promise<void> {
        const existing = await deviceModelRepository.findById(id);
        if (!existing) {
            throw new NotFoundError(`Device model not found: ${id}`);
        }

        logger.info('Deleting device model', { id });
        await deviceModelRepository.delete(id);
    }

    /**
     * Get device model count
     */
    async getCount(): Promise<number> {
        return deviceModelRepository.count();
    }
}

export const deviceModelService = new DeviceModelService();
