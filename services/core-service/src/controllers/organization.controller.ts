import { Request, Response, NextFunction } from 'express';
import { OrganizationService, AuditContext } from '../services/organization.service';
import { AppError, ValidationError } from '@sustainpro/shared-utils';

const orgService = new OrganizationService();

/**
 * Extract audit context from request
 */
const getAuditContext = (req: Request): AuditContext => ({
    actorUserId: req.user?.id,
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent'],
    requestMethod: req.method,
    requestPath: req.originalUrl,
});

/**
 * GET /api/v1/organizations
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const isSuperAdmin = req.user?.isSuperAdmin;
        const orgId = req.user?.organization_id;

        // Super admin sees all, others see only their org
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;

        const { data, total } = await orgService.getAll(
            isSuperAdmin ? null : orgId,
            { page, limit, search }
        );

        res.json({
            success: true,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/organizations/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const organization = await orgService.getById(req.params.id);

        res.json({
            success: true,
            data: organization,
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
 * POST /api/v1/organizations
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, website, phone, admin_name, admin_email, admin_password } = req.body;
        const errors: { field: string; message: string }[] = [];

        if (!name || name.trim() === "") {
            errors.push({ field: 'name', message: 'Organization name is required' });
        } else if (name.length > 30) {
            errors.push({ field: 'name', message: 'Organization name cannot exceed 30 characters' });
        }

        if (website) {
            try {
                new URL(website.startsWith('http') ? website : `https://${website}`);
                if (/^\d+$/.test(website)) {
                    errors.push({ field: 'website', message: 'Website cannot be just numbers' });
                }
            } catch (e) {
                errors.push({ field: 'website', message: 'Please enter a valid website URL' });
            }
        }

        if (phone && !/^\+?[0-9\s\-\(\)\.]+$/.test(phone)) {
            errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
        }
        
        if (!admin_name || admin_name.trim() === "") {
            errors.push({ field: 'admin_full_name', message: 'Admin full name is required' });
        }
        
        if (!admin_email || admin_email.trim() === "") {
            errors.push({ field: 'contact_email', message: 'Admin email is required' });
        }
        
        if (!admin_password) {
            errors.push({ field: 'admin_password', message: 'Password is required' });
        }

        if (errors.length > 0) {
            throw new ValidationError(errors);
        }

        const auditCtx = getAuditContext(req);
        const organization = await orgService.create(req.body, req.user?.id, auditCtx);

        res.status(201).json({
            success: true,
            data: organization,
        });
    } catch (error) {
        if (error instanceof AppError) {
            const body: any = {
                success: false,
                error: error.message,
            };
            if ('errors' in error) {
                body.errors = (error as any).errors;
            }
            res.status(error.statusCode).json(body);
            return;
        }
        next(error);
    }
};

/**
 * PUT /api/v1/organizations/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auditCtx = getAuditContext(req);
        const organization = await orgService.update(req.params.id, req.body, auditCtx);

        res.json({
            success: true,
            data: organization,
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
 * DELETE /api/v1/organizations/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auditCtx = getAuditContext(req);
        await orgService.delete(req.params.id, auditCtx);

        res.json({
            success: true,
            message: 'Organization deleted',
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
 * GET /api/v1/organizations/:id/structure
 */
export const getStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const structure = await orgService.getFullStructure(req.params.id);

        res.json({
            success: true,
            data: structure,
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
 * GET /api/v1/organizations/stats/overview
 */
export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const stats = await orgService.getStats();

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};



