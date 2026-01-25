import { Request, Response, NextFunction } from 'express';
import { EventService } from '../services/event.service';
import { AppError } from '@sustainpro/shared-utils';

const eventService = new EventService();

/**
 * GET /api/v1/events
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = req.user!;
        const isSuperAdmin = user.isSuperAdmin;

        console.log(`[EventController] getAll request. User: ${user.id}, SuperAdmin: ${isSuperAdmin}, Org: ${user.organization_id}`);

        // Determine organization context
        let organizationId = req.query.organization_id as string;

        if (!isSuperAdmin) {
            // Non-super admins are restricted to their own organization
            organizationId = user.organization_id!;
        }

        // Determine event access
        let allowedEventIds: string[] | undefined;
        if (!isSuperAdmin) {
            const permissions = (user as any).permissions || [];
            console.log(`[EventController] User permissions: ${permissions.join(', ')}`);

            if (!permissions.includes('events.view_all')) {
                // If cannot view all, restrict to assigned events
                allowedEventIds = (user as any).eventIds || [];
                console.log(`[EventController] Restricted to eventIds: ${allowedEventIds?.join(', ')}`);

                // If no assigned events, they can't see anything
                if (allowedEventIds && allowedEventIds.length === 0) {
                    res.json({
                        success: true,
                        data: [],
                        meta: { page: 1, limit: 20, total: 0, pages: 0 }
                    });
                    return;
                }
            }
        }

        // Pagination and filtering
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;

        console.log('[EventController] Calling service with params:', { page, limit, organizationId, allowedEventIdsCount: allowedEventIds?.length });

        const { events, total, pages } = await eventService.getAll({
            page,
            limit,
            search,
            organizationId,
            allowedEventIds
        });

        res.json({
            success: true,
            data: events,
            meta: {
                page,
                limit,
                total,
                pages
            }
        });
    } catch (error) {
        console.error('[EventController] getAll error:', error);
        next(error);
    }
};

/**
 * GET /api/v1/events/by-org/:orgId
 */
export const getByOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { orgId } = req.params;
        const user = req.user!;

        // Permission check
        if (!user.isSuperAdmin && user.organization_id !== orgId) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        let events = await eventService.getByOrganization(orgId);

        // If user is not super admin, check if they have specific event assignments
        // Users with assigned eventIds only see those events
        // If user is not super admin, apply permission-based filtering
        if (!user.isSuperAdmin) {
            const permissions = (req.user as any)?.permissions || [];
            const canViewAll = permissions.includes('events.view_all');

            if (!canViewAll) {
                const assignedEventIds = (req.user as any)?.eventIds || [];

                if (assignedEventIds.length > 0) {
                    // Filter to only assigned events
                    events = events.filter(e => assignedEventIds.includes(e.id));
                } else {
                    // No 'view all' permission AND no assigned events -> see nothing
                    events = [];
                }
            }
        }

        res.json({
            success: true,
            data: events,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/events/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const event = await eventService.getById(req.params.id);

        res.json({
            success: true,
            data: event,
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
 * GET /api/v1/events/:id/details
 */
export const getDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const details = await eventService.getFullDetails(req.params.id);

        res.json({
            success: true,
            data: details,
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
 * POST /api/v1/events
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = req.user!;

        // Permission check: Can only create events for own org unless super admin
        if (!user.isSuperAdmin && user.organization_id !== req.body.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Cannot create event for another organization',
            });
            return;
        }

        const auditCtx = {
            actorUserId: user.id,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl,
        };

        const event = await eventService.create(req.body, user.id, auditCtx);

        res.status(201).json({
            success: true,
            data: event,
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
 * PUT /api/v1/events/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = req.user!;
        const permissions = (user as any).permissions || [];
        const isSuperAdmin = user.isSuperAdmin;

        // Check if user has permission to update full event details
        const canUpdateDetails = isSuperAdmin || permissions.includes('events.update');
        const canUpdateStatus = isSuperAdmin || permissions.includes('events.status');

        if (!canUpdateDetails) {
            // If they can't update details, check if they can update status
            if (canUpdateStatus) {
                // Ensure ONLY status is being updated
                const allowedKeys = ['status'];
                const bodyKeys = Object.keys(req.body);
                const hasForbiddenKeys = bodyKeys.some(k => !allowedKeys.includes(k));

                if (hasForbiddenKeys) {
                    res.status(403).json({
                        success: false,
                        error: 'Permission denied: You can only update event status',
                    });
                    return;
                }
            } else {
                // Should be caught by middleware, but extra safeguard
                res.status(403).json({
                    success: false,
                    error: 'Permission denied',
                });
                return;
            }
        }

        const auditCtx = {
            actorUserId: user.id,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl,
        };

        const event = await eventService.update(req.params.id, req.body, auditCtx);

        res.json({
            success: true,
            data: event,
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
 * DELETE /api/v1/events/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auditCtx = {
            actorUserId: req.user?.id,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl,
        };

        await eventService.delete(req.params.id, auditCtx);

        res.json({
            success: true,
            message: 'Event deleted',
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
 * POST /api/v1/events/:id/start
 */
export const start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auditCtx = {
            actorUserId: req.user?.id,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl,
        };

        const event = await eventService.start(req.params.id, auditCtx);

        res.json({
            success: true,
            data: event,
            message: 'Event started',
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
 * POST /api/v1/events/:id/stop
 */
export const stop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auditCtx = {
            actorUserId: req.user?.id,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl,
        };

        const event = await eventService.stop(req.params.id, auditCtx);

        res.json({
            success: true,
            data: event,
            message: 'Event stopped',
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
 * POST /api/v1/events/:id/archive
 */
export const archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auditCtx = {
            actorUserId: req.user?.id,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl,
        };

        const event = await eventService.archive(req.params.id, auditCtx);

        res.json({
            success: true,
            data: event,
            message: 'Event archived',
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
 * POST /api/v1/events/:id/request-end
 * Request to end an event (for event managers)
 */
export const requestEnd = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auditCtx = {
            actorUserId: req.user?.id,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl,
        };

        const event = await eventService.requestEndEvent(req.params.id, req.user?.id!, auditCtx);

        res.json({
            success: true,
            data: event,
            message: 'Event end request submitted. Org admins will be notified.',
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
 * POST /api/v1/events/:id/request-delete
 */
export const requestDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auditCtx = {
            actorUserId: req.user?.id,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl,
        };

        const event = await eventService.requestDeleteEvent(req.params.id, req.user?.id!, auditCtx);

        res.json({
            success: true,
            data: event,
            message: 'Event delete request submitted. Org admins will be notified.',
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
 * POST /api/v1/events/:id/end
 * End an event immediately (for org admins and super admins)
 */
export const endEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auditCtx = {
            actorUserId: req.user?.id,
            ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
            userAgent: req.headers['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl,
        };

        // First clear any end request flag
        await eventService.clearEndRequest(req.params.id, auditCtx);

        // Then end the event
        const event = await eventService.update(req.params.id, { status: 'END' }, auditCtx);

        res.json({
            success: true,
            data: event,
            message: 'Event ended successfully',
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
