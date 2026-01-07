import { Request, Response, NextFunction } from 'express';
import { deviceModelService } from '../services/device-model.service';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'device-model-controller' });

/**
 * Get all device models
 * GET /device-models
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const models = await deviceModelService.getAll();

        res.json({
            success: true,
            data: models,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get device model by ID
 * GET /device-models/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const model = await deviceModelService.getById(id);

        res.json({
            success: true,
            data: model,
        });
    } catch (error: any) {
        if (error.name === 'NotFoundError') {
            res.status(404).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * Create a new device model
 * POST /device-models
 * Body: { id, name, description?, parameters? }
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { id, name, description, parameters } = req.body;

        // Validate required fields
        if (!id || !name) {
            res.status(400).json({
                success: false,
                error: 'id and name are required',
            });
            return;
        }

        const model = await deviceModelService.create({
            id,
            name,
            description,
            parameters,
            created_by: user?.id,
        });

        logger.info('Device model created', { id: model.id, createdBy: user?.id });

        res.status(201).json({
            success: true,
            data: model,
        });
    } catch (error: any) {
        if (error.name === 'ConflictError') {
            res.status(409).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * Update a device model
 * PUT /device-models/:id
 * Body: { name?, description?, parameters? }
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, description, parameters } = req.body;

        const model = await deviceModelService.update(id, {
            name,
            description,
            parameters,
        });

        res.json({
            success: true,
            data: model,
        });
    } catch (error: any) {
        if (error.name === 'NotFoundError') {
            res.status(404).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * Delete a device model
 * DELETE /device-models/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        await deviceModelService.delete(id);

        res.json({
            success: true,
            message: 'Device model deleted successfully',
        });
    } catch (error: any) {
        if (error.name === 'NotFoundError') {
            res.status(404).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * Get device model count (for stats)
 * GET /device-models/stats/count
 */
export const getCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const count = await deviceModelService.getCount();

        res.json({
            success: true,
            data: { count },
        });
    } catch (error) {
        next(error);
    }
};
