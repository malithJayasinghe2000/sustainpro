import { Request, Response, NextFunction } from 'express';
import { DeviceModelService } from '../services/device-model.service';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'device-model-controller' });

const deviceModelService = new DeviceModelService();

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const includeInactive = user?.isSuperAdmin && req.query.include_inactive === 'true';

        const models = await deviceModelService.getAll(includeInactive);

        res.json({
            success: true,
            data: models,
        });
    } catch (error) {
        next(error);
    }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const model = await deviceModelService.getById(id);

        if (!model) {
            res.status(404).json({
                success: false,
                error: 'Device model not found',
            });
            return;
        }

        // Get usage count
        const usageCount = await deviceModelService.getUsageCount(id);

        res.json({
            success: true,
            data: {
                ...model,
                usage_count: usageCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { category } = req.params;
        const validCategories = ['SENSOR', 'DISPLAY', 'CONTROLLER', 'GATEWAY', 'OTHER'];

        if (!validCategories.includes(category.toUpperCase())) {
            res.status(400).json({
                success: false,
                error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
            });
            return;
        }

        const models = await deviceModelService.getByCategory(category.toUpperCase() as any);

        res.json({
            success: true,
            data: models,
        });
    } catch (error) {
        next(error);
    }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, manufacturer, model_number, description, category, specifications, firmware_versions, image_url } = req.body;

        // Validate required fields
        if (!name || !manufacturer || !model_number || !category) {
            res.status(400).json({
                success: false,
                error: 'name, manufacturer, model_number, and category are required',
            });
            return;
        }

        const validCategories = ['SENSOR', 'DISPLAY', 'CONTROLLER', 'GATEWAY', 'OTHER'];
        if (!validCategories.includes(category.toUpperCase())) {
            res.status(400).json({
                success: false,
                error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
            });
            return;
        }

        const model = await deviceModelService.create({
            name,
            manufacturer,
            model_number,
            description,
            category: category.toUpperCase(),
            specifications,
            firmware_versions,
            image_url,
        });

        const user = (req as any).user;
        logger.info('Device model created', { id: model.id, createdBy: user?.id });

        res.status(201).json({
            success: true,
            data: model,
        });
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            res.status(409).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, manufacturer, model_number, description, category, specifications, firmware_versions, image_url, is_active } = req.body;

        // Check model exists
        const existing = await deviceModelService.getById(id);
        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Device model not found',
            });
            return;
        }

        // Validate category if provided
        if (category) {
            const validCategories = ['SENSOR', 'DISPLAY', 'CONTROLLER', 'GATEWAY', 'OTHER'];
            if (!validCategories.includes(category.toUpperCase())) {
                res.status(400).json({
                    success: false,
                    error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
                });
                return;
            }
        }

        const model = await deviceModelService.update(id, {
            name,
            manufacturer,
            model_number,
            description,
            category: category?.toUpperCase(),
            specifications,
            firmware_versions,
            image_url,
            is_active,
        });

        res.json({
            success: true,
            data: model,
        });
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            res.status(409).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        // Check model exists
        const existing = await deviceModelService.getById(id);
        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Device model not found',
            });
            return;
        }

        await deviceModelService.delete(id);

        res.json({
            success: true,
            message: 'Device model deleted (soft delete - marked as inactive)',
        });
    } catch (error: any) {
        if (error.message.includes('Cannot delete')) {
            res.status(409).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

export const addFirmwareVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { version } = req.body;

        if (!version) {
            res.status(400).json({
                success: false,
                error: 'version is required',
            });
            return;
        }

        const model = await deviceModelService.addFirmwareVersion(id, version);

        res.json({
            success: true,
            data: model,
            message: `Firmware version ${version} added`,
        });
    } catch (error: any) {
        if (error.message === 'Device model not found') {
            res.status(404).json({
                success: false,
                error: error.message,
            });
            return;
        }
        if (error.message === 'Firmware version already exists') {
            res.status(409).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};
