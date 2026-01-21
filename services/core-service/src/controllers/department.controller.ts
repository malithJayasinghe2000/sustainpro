import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service';
import { ServiceService } from '../services/service.service';
import { AppError } from '@sustainpro/shared-utils';

const deptService = new DepartmentService();
const serviceService = new ServiceService();

/**
 * GET /api/v1/departments/by-event/:eventId
 */
export const getByEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const departments = await deptService.getByEvent(req.params.eventId);

        res.json({
            success: true,
            data: departments,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/departments/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const department = await deptService.getById(req.params.id);

        res.json({
            success: true,
            data: department,
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
 * GET /api/v1/departments/:id/services
 */
export const getServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const services = await serviceService.getByDepartment(req.params.id);

        res.json({
            success: true,
            data: services,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/departments/:id/full
 */
export const getWithServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const department = await deptService.getWithServices(req.params.id);

        res.json({
            success: true,
            data: department,
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
 * POST /api/v1/departments
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const department = await deptService.create(req.body, req.user?.id);

        res.status(201).json({
            success: true,
            data: department,
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
 * PUT /api/v1/departments/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const department = await deptService.update(req.params.id, req.body);

        res.json({
            success: true,
            data: department,
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
 * DELETE /api/v1/departments/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await deptService.delete(req.params.id);

        res.json({
            success: true,
            message: 'Department deleted',
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
 * POST /api/v1/departments/:id/services
 */
export const addService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const service = await serviceService.addToDepartment({
            department_id: req.params.id,
            service_template_id: req.body.service_template_id || req.body.service_id,
            ...req.body,
        }, req.user?.id);

        res.status(201).json({
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
 * DELETE /api/v1/departments/:id/services/:serviceId
 */
export const removeService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await serviceService.removeFromDepartment(req.params.serviceId);

        res.json({
            success: true,
            message: 'Service removed from department',
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
