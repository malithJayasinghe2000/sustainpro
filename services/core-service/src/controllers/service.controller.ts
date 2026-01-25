import { Request, Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service';
import { AppError, BadRequestError } from '@sustainpro/shared-utils';

const serviceService = new ServiceService();

/**
 * GET /api/v1/services
 * Get all service templates
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { category } = req.query;
        const templates = await serviceService.getAllTemplates(category as string);

        res.json({
            success: true,
            data: templates,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/services/my
 * Get services assigned to current user
 */
export const getMyServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            throw new AppError(401, 'User authentication required');
        }

        const services = await serviceService.getByUser(userId);

        res.json({
            success: true,
            data: services,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/services/:id
 * Get a single service template by ID
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
 * Create a new service template (Super Admin only)
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            name,
            description,
            category,
            image_url,
            service_type,
            has_public_dashboard,
            service_parameters,
            device_dashboard_layout,
            main_dashboard_layout,
            public_dashboard_layout,
            config_schema,
            default_config,
            features,
            is_public,
            device_models
        } = req.body;

        if (!name) {
            throw new BadRequestError('Service name is required');
        }

        const template = await serviceService.createTemplate({
            name,
            description,
            category,
            image_url,
            service_type,
            has_public_dashboard,
            service_parameters,
            device_dashboard_layout,
            main_dashboard_layout,
            public_dashboard_layout,
            config_schema,
            default_config,
            features,
            is_public,
            device_models,
        }, (req as any).user?.id);

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
 * Update a service template (Super Admin only)
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
 * PUT /api/v1/services/:id/dashboards/:type
 * Update a specific dashboard layout
 * - Super Admin: Can update any dashboard type
 * - Service Supervisor: Can only update public dashboard for assigned services
 */
export const updateDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id, type } = req.params;
        const { layout } = req.body;
        const user = (req as any).user;

        if (!['device', 'service', 'public'].includes(type)) {
            throw new BadRequestError('Invalid dashboard type. Must be: device, service, or public');
        }

        if (!layout) {
            throw new BadRequestError('Dashboard layout is required');
        }

        const template = await serviceService.updateDashboard(
            id,
            type as 'device' | 'service' | 'public',
            layout,
            user?.id,
            user?.isSuperAdmin // Use camelCase to match JwtPayload interface
        );

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
 * GET /api/v1/services/:id/dashboards/:type
 * Get a specific dashboard layout
 */
export const getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id, type } = req.params;

        if (!['device', 'service', 'public'].includes(type)) {
            throw new BadRequestError('Invalid dashboard type. Must be: device, service, or public');
        }

        const template = await serviceService.getTemplateById(id);

        const dashboardMap: Record<string, any> = {
            device: template.device_dashboard_layout,
            service: template.main_dashboard_layout,
            public: template.public_dashboard_layout,
        };

        res.json({
            success: true,
            data: {
                template_id: template.id,
                template_name: template.name,
                dashboard_type: type,
                layout: dashboardMap[type],
            },
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
 * Delete a service template (soft delete)
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

/**
 * POST /api/v1/services/:id/assign
 * Assign a service to a department
 */
export const assignToDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { department_id, name, config, assigned_supervisor_id } = req.body;

        if (!department_id) {
            throw new BadRequestError('department_id is required');
        }

        const service = await serviceService.addToDepartment({
            service_template_id: id,
            department_id,
            name,
            config,
            assigned_supervisor_id,
        }, (req as any).user?.id);

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
