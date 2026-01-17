import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { UserService } from '../services/user.service';
import { AppError } from '@sustainpro/shared-utils';

const userService = new UserService();

/**
 * GET /api/v1/users
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const isSuperAdmin = req.user?.isSuperAdmin;
        const orgId = req.user?.organization_id;

        // Super admin sees all, others see only their org
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const role = req.query.role as string;

        // Determine organization filter
        let targetOrgId = orgId;
        if (isSuperAdmin) {
            targetOrgId = (req.query.organization_id as string) || null;
        }

        const { users, total, pages } = await userService.getAll(
            targetOrgId,
            page,
            limit,
            search,
            role
        );

        res.json({
            success: true,
            data: users,
            meta: {
                page,
                limit,
                total,
                pages
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/users/managers/candidates
 */
export const getManagerCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const organizationId = req.query.organization_id as string | undefined;
        const candidates = await userService.getManagerCandidates(organizationId);

        res.json({
            success: true,
            data: candidates,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/users/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await userService.getById(req.params.id);

        res.json({
            success: true,
            data: user,
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
 * POST /api/v1/users
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                errors: errors.array(),
            });
            return;
        }

        const user = await userService.create({
            email: req.body.email,
            password: req.body.password,
            full_name: req.body.full_name,
            organizationId: req.body.organizationId || req.body.organization_id,
            timezone: req.body.timezone,
        });

        // Assign role if provided
        if (req.body.role) {
            await userService.assignRole(user.id, req.body.role, {
                org_id: req.body.organizationId || req.body.organization_id,
            });
        }

        res.status(201).json({
            success: true,
            data: user,
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
 * PUT /api/v1/users/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Extract role separately (not a direct user field)
        const { role, ...updateData } = req.body;
        
        const user = await userService.update(req.params.id, updateData);

        // If role is provided, update the role assignment
        if (role) {
            await userService.assignRole(user.id, role, {
                org_id: user.organization_id || undefined,
            });
        }

        res.json({
            success: true,
            data: user,
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
 * DELETE /api/v1/users/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await userService.delete(req.params.id);

        res.json({
            success: true,
            message: 'User deleted',
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
