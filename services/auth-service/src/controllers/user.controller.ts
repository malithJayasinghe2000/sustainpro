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
        const userRoles = (req.user as any)?.roles || [];

        // Super admin sees all, others see only their org
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const role = req.query.role as string;
        const eventId = req.query.event_id as string;

        // Determine organization filter
        let targetOrgId = orgId;
        if (isSuperAdmin) {
            targetOrgId = (req.query.organization_id as string) || null;
        }

        // TODO: Add department filtering for DEPT_HEAD users
        // Department heads should only see users in their department
        // This requires: 1) Getting the department ID where user is head
        //               2) Filtering users by that department
        // For now, DEPT_HEAD users can see all users in their organization

        const { users, total, pages } = await userService.getAll(
            targetOrgId,
            page,
            limit,
            search,
            role,
            eventId
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

        // Assign roles if provided (Array format - preferred)
        if (req.body.roles && Array.isArray(req.body.roles) && req.body.roles.length > 0) {
            for (const roleData of req.body.roles) {
                // Determine role name (handle string or object)
                const roleName = typeof roleData === 'string' ? roleData : roleData.role;

                // Determine context from role object or fallback to body
                const rOrgId = roleData.organization_id || req.body.organizationId || req.body.organization_id;
                const rEventId = roleData.event_id || req.body.event_id;
                const rDeptId = roleData.department_id || req.body.department_id;
                const rServiceId = roleData.service_id || req.body.service_id;

                if (roleName) {
                    await userService.assignRole(user.id, roleName, {
                        org_id: rOrgId,
                        event_id: rEventId,
                        dept_id: rDeptId,
                        service_id: rServiceId,
                    });
                }
            }
        }
        // Fallback: Single role in body (Legacy/Simple)
        else if (req.body.role) {
            const orgId = req.body.organizationId || req.body.organization_id;
            const eventId = req.body.event_id || req.body.context_id;
            const deptId = req.body.department_id || req.body.dept_id;
            const serviceId = req.body.service_id;

            await userService.assignRole(user.id, req.body.role, {
                org_id: orgId,
                event_id: eventId,
                dept_id: deptId,
                service_id: serviceId,
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
