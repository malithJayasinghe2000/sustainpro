import { Request, Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service';
import { AppError } from '@sustainpro/shared-utils';

const serviceService = new ServiceService();

/**
 * GET /api/v1/department-services/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const service = await serviceService.getDepartmentServiceById(req.params.id);

        res.json({
            success: true,
            data: service,
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
 * GET /api/v1/department-services/:id/devices
 */
export const getDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // TODO: Implement get assigned devices
        // For now returning empty array or mock
        // Ideally this should call a method in ServiceService
        // const devices = await serviceService.getAssignedDevices(req.params.id);

        res.json({
            success: true,
            data: [], // Implement actual fetching
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/department-services/:id/devices
 */
export const addDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // TODO: Implement add device
        res.json({
            success: true,
            message: 'Device added (mock)'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/v1/department-services/:id/devices/:deviceId
 */
export const removeDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // TODO: Implement remove device
        res.json({
            success: true,
            message: 'Device removed (mock)'
        });
    } catch (error) {
        next(error);
    }
};
