import { Request, Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service';
import { AppError } from '@sustainpro/shared-utils';

const serviceService = new ServiceService();

/**
 * GET /api/v1/services
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { scope } = req.query;
        const templates = await serviceService.getAllTemplates(scope as string);

        res.json({
            success: true,
            data: templates,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/services/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const template = await serviceService.getTemplateById(req.params.id);

        res.json({
            success: true,
            data: template,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * POST /api/v1/services
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const template = await serviceService.createTemplate(req.body);

        res.status(201).json({
            success: true,
            data: template,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * PUT /api/v1/services/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const template = await serviceService.updateTemplate(req.params.id, req.body);

        res.json({
            success: true,
            data: template,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * DELETE /api/v1/services/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await serviceService.deleteTemplate(req.params.id);

        res.json({
            success: true,
            message: 'Service template deleted',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};
