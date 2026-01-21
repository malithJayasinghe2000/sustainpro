import { Request, Response, NextFunction } from 'express';
import { deviceService } from '../services/device.service';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'device-controller' });

/**
 * GET /devices - Get all devices
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const orgId = user?.isSuperAdmin ? null : user?.organization_id;

        const devices = await deviceService.getAll(orgId);

        res.json({
            success: true,
            count: devices.length,
            data: devices,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /devices/:id - Get device by ID
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const orgId = user?.isSuperAdmin ? undefined : user?.organization_id;

        const device = await deviceService.getById(id, orgId);

        res.json({
            success: true,
            data: device,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /devices/organization/:orgId - Get devices by organization
 */
export const getByOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;

        // Check organization access
        if (!user?.isSuperAdmin && orgId !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        const devices = await deviceService.getByOrganization(orgId);

        res.json({
            success: true,
            count: devices.length,
            data: devices,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /devices/service/:serviceId - Get devices by service
 */
export const getByService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { serviceId } = req.params;
        const devices = await deviceService.getByService(serviceId);

        res.json({
            success: true,
            count: devices.length,
            data: devices,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /devices - Create a new device
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { organization_id, name, type, service_id, metadata } = req.body;

        // Use user's org if not super admin
        const orgId = user?.isSuperAdmin ? (organization_id || user.organization_id) : user.organization_id;

        const { device, apiKey } = await deviceService.create({
            organization_id: orgId,
            name,
            type,
            service_id,
            metadata,
        });

        logger.info('Device created', { id: device.id, createdBy: user?.id });

        res.status(201).json({
            success: true,
            data: device,
            api_key: apiKey, // Only returned once at creation
            message: 'Device created. Save the API key - it will not be shown again.',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /devices/:id - Update a device
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const orgId = user?.isSuperAdmin ? undefined : user?.organization_id;

        const { name, type, service_id, status, metadata } = req.body;

        const device = await deviceService.update(id, {
            name,
            type,
            service_id,
            status,
            metadata,
        }, orgId);

        res.json({
            success: true,
            data: device,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /devices/:id - Delete a device
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const orgId = user?.isSuperAdmin ? undefined : user?.organization_id;

        await deviceService.delete(id, orgId);

        res.json({
            success: true,
            message: 'Device deleted',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /devices/:id/assign - Assign device to a service
 */
export const assignToService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { service_id } = req.body;

        const device = await deviceService.assignToService(id, service_id);

        res.json({
            success: true,
            data: device,
            message: 'Device assigned to service',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /devices/:id/unassign - Unassign device from service
 */
export const unassignFromService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const device = await deviceService.assignToService(id, null);

        res.json({
            success: true,
            data: device,
            message: 'Device unassigned from service',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /devices/stats - Get device statistics
 */
export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const orgId = user?.isSuperAdmin ? undefined : user?.organization_id;

        const stats = await deviceService.getStats(orgId);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /devices/:id/regenerate-key - Regenerate API key
 */
export const regenerateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const orgId = user?.isSuperAdmin ? undefined : user?.organization_id;

        const { device, apiKey } = await deviceService.regenerateApiKey(id, orgId);

        logger.info('Device API key regenerated', { id, regeneratedBy: user?.id });

        res.json({
            success: true,
            data: device,
            api_key: apiKey,
            message: 'API key regenerated. Save the new API key - it will not be shown again.',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /devices/register - Register a device via USB provisioning
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { hardware_id, device_code, location, service_id, organization_id } = req.body;

        // Validate required fields
        if (!hardware_id) {
            res.status(400).json({
                success: false,
                error: 'hardware_id is required',
            });
            return;
        }

        // Use provided org_id or user's org
        const orgId = organization_id || user?.organization_id;

        if (!orgId) {
            res.status(400).json({
                success: false,
                error: 'organization_id is required',
            });
            return;
        }

        // Check organization access
        if (!user?.isSuperAdmin && orgId !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied: Cannot register device for another organization',
            });
            return;
        }

        const { device, apiKey, isNew } = await deviceService.register({
            hardware_id,
            device_code: device_code || hardware_id,
            location,
            service_id,
            organization_id: orgId,
        });

        logger.info('Device registered via USB provisioning', {
            id: device.id,
            hardware_id,
            isNew,
            registeredBy: user?.id
        });

        res.status(isNew ? 201 : 200).json({
            success: true,
            data: device,
            api_key: apiKey,
            is_new: isNew,
            message: isNew
                ? 'Device registered successfully. Save the API key - it will not be shown again.'
                : 'Device already registered. API key has been regenerated.',
        });
    } catch (error) {
        next(error);
    }
};
