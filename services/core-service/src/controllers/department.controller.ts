import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service';
import { ServiceService } from '../services/service.service';
import { AppError, createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'core-service' });
const deptService = new DepartmentService();
const serviceService = new ServiceService();

/**
 * GET /api/v1/departments/by-event/:eventId
 */
export const getByEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = req.user;
        const eventId = req.params.eventId;

        // Debug logging
        logger.info('getByEvent called', {
            eventId,
            userId: user?.id,
            isSuperAdmin: user?.isSuperAdmin,
            roles: user?.roles,
            deptIds: user?.deptIds,
            eventIds: user?.eventIds,
        });

        // Get all departments for the event
        const allDepartments = await deptService.getByEvent(eventId);

        logger.info('All departments for event', {
            eventId,
            count: allDepartments.length,
            deptIds: allDepartments.map(d => d.id),
        });

        // Filter based on user role and context
        let departments = allDepartments;

        if (user) {
            // Super admin can see all departments
            if (user.isSuperAdmin) {
                departments = allDepartments;
            }
            // ORG_ADMIN and EVENT_MANAGER can see all departments in the event
            else if (user.roles?.includes('ORG_ADMIN') || user.roles?.includes('EVENT_MANAGER')) {
                departments = allDepartments;
            }
            // DEPT_HEAD, SERVICE_SUPERVISOR, TECHNICIAN should only see departments they're assigned to
            else if (user.deptIds && user.deptIds.length > 0) {
                departments = allDepartments.filter(dept => user.deptIds!.includes(dept.id));
            }
            // If no specific department assignments, return empty array (except for super admin and org admin)
            else {
                departments = [];
            }
        }

        logger.info('Filtered departments', {
            userId: user?.id,
            filteredCount: departments.length,
        });

        res.json({
            success: true,
            data: departments,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/departments/my
 * Get departments assigned to current user
 */
export const getMyDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new AppError(401, 'User authentication required');
        }

        const departments = await deptService.getByUser(userId);

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
 * PUT /api/v1/departments/:id/services/:serviceId
 */
export const updateService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const service = await serviceService.updateDepartmentService(req.params.serviceId, req.body);

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
