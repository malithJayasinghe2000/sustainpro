import { Request, Response, NextFunction } from 'express';
import { departmentTemplateService } from '../services/department-template.service';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'department-template-controller' });

/**
 * GET /department-templates
 * Get all department templates (global + organization-specific)
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        
        // Super Admins can filter by organization
        const targetOrgId = user?.isSuperAdmin && req.query.organization_id
            ? req.query.organization_id as string
            : user?.organization_id;

        const templates = await departmentTemplateService.getAll(targetOrgId);

        res.json({
            success: true,
            data: templates,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /department-templates/:id
 * Get a specific department template
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const template = await departmentTemplateService.getById(id);

        // Permission check - can access global templates or own org's templates
        if (!user?.isSuperAdmin && 
            template.organization_id !== null && 
            template.organization_id !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        res.json({
            success: true,
            data: template,
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
 * POST /department-templates
 * Create a new department template
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { name, description, icon, color, suggested_services, required_roles, organization_id } = req.body;

        if (!name) {
            res.status(400).json({
                success: false,
                error: 'Name is required',
            });
            return;
        }

        // Determine target organization
        let targetOrgId: string | null = null;
        if (user?.isSuperAdmin) {
            // Super Admin can create global templates (null) or org-specific
            targetOrgId = organization_id || null;
        } else if (user?.organization_id) {
            targetOrgId = user.organization_id;
        } else {
            res.status(400).json({
                success: false,
                error: 'Your account must be associated with an organization to create templates',
            });
            return;
        }

        const template = await departmentTemplateService.create({
            organization_id: targetOrgId,
            name,
            description,
            icon,
            color,
            suggested_services,
            required_roles,
        });

        logger.info('Department template created', { id: template.id, createdBy: user?.id });

        res.status(201).json({
            success: true,
            data: template,
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
 * PUT /department-templates/:id
 * Update a department template
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const { name, description, icon, color, suggested_services, required_roles } = req.body;

        // Check ownership first
        const existing = await departmentTemplateService.getById(id);
        if (!user?.isSuperAdmin && 
            existing.organization_id !== null && 
            existing.organization_id !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        const template = await departmentTemplateService.update(id, {
            name,
            description,
            icon,
            color,
            suggested_services,
            required_roles,
        });

        res.json({
            success: true,
            data: template,
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
 * DELETE /department-templates/:id
 * Delete a department template (soft delete)
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        // Check ownership first
        const existing = await departmentTemplateService.getById(id);
        if (!user?.isSuperAdmin && 
            existing.organization_id !== null && 
            existing.organization_id !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        await departmentTemplateService.delete(id);

        res.json({
            success: true,
            message: 'Department template deleted successfully',
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
