import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../services/organization.service';
import { AppError } from '@sustainpro/shared-utils';

const orgService = new OrganizationService();

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
        const organization = await orgService.create(req.body, req.user?.id);

        res.status(201).json({
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
 * PUT /api/v1/organizations/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const organization = await orgService.update(req.params.id, req.body);

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
        await orgService.delete(req.params.id);

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
