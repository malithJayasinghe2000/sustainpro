import { Request, Response, NextFunction } from 'express';
import { EventService } from '../services/event.service';
import { AppError } from '@sustainpro/shared-utils';

const eventService = new EventService();

/**
 * GET /api/v1/events
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const isSuperAdmin = req.user?.isSuperAdmin;

        if (!isSuperAdmin) {
            res.status(403).json({
                success: false,
                error: 'Super Admin access required',
            });
            return;
        }

        const events = await eventService.getAll();

        res.json({
            success: true,
            data: events,
        });
    } catch (error) {
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

        const events = await eventService.getByOrganization(orgId);

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

        const event = await eventService.create(req.body, user.id);

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
        const event = await eventService.update(req.params.id, req.body);

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
        await eventService.delete(req.params.id);

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
        const event = await eventService.start(req.params.id);

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
        const event = await eventService.stop(req.params.id);

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
        const event = await eventService.archive(req.params.id);

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
