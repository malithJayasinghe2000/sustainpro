import { Request, Response, NextFunction } from 'express';
import { DeviceService } from '../services/device.service';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'device-controller' });

const deviceService = new DeviceService();

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const orgId = user?.isSuperAdmin ? null : user?.organization_id;

        const devices = await deviceService.getAll(orgId);

        res.json({
            success: true,
            data: devices,
        });
    } catch (error) {
        next(error);
    }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const device = await deviceService.getById(id);

        if (!device) {
            res.status(404).json({
                success: false,
                error: 'Device not found',
            });
            return;
        }

        // Check organization access
        const user = (req as any).user;
        if (!user?.isSuperAdmin && device.organization_id !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        res.json({
            success: true,
            data: device,
        });
    } catch (error) {
        next(error);
    }
};

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
            data: devices,
        });
    } catch (error) {
        next(error);
    }
};

export const getByDepartmentService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { serviceId } = req.params;
        const devices = await deviceService.getByDepartmentService(serviceId);

        res.json({
            success: true,
            data: devices,
        });
    } catch (error) {
        next(error);
    }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { device_model_id, organization_id, department_service_id, name, description, metadata } = req.body;

        // Validate required fields
        if (!device_model_id || !name) {
            res.status(400).json({
                success: false,
                error: 'device_model_id and name are required',
            });
            return;
        }

        // Use user's org if not super admin
        const orgId = user?.isSuperAdmin ? (organization_id || user.organization_id) : user.organization_id;

        const { device, apiKey } = await deviceService.create({
            device_model_id,
            organization_id: orgId,
            department_service_id,
            name,
            description,
            metadata,
        });

        logger.info('Device created', { id: device.id, createdBy: user?.id });

        res.status(201).json({
            success: true,
            data: device,
            api_key: apiKey, // Only returned once at creation
            message: 'Device created. Save the API key - it will not be shown again.',
        });
    } catch (error: any) {
        if (error.message === 'Device model not found') {
            res.status(400).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, description, department_service_id, status, firmware_version, metadata } = req.body;

        // Check device exists and access
        const existing = await deviceService.getById(id);
        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Device not found',
            });
            return;
        }

        const user = (req as any).user;
        if (!user?.isSuperAdmin && existing.organization_id !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        const device = await deviceService.update(id, {
            name,
            description,
            department_service_id,
            status,
            firmware_version,
            metadata,
        });

        res.json({
            success: true,
            data: device,
        });
    } catch (error) {
        next(error);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        // Check device exists and access
        const existing = await deviceService.getById(id);
        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Device not found',
            });
            return;
        }

        const user = (req as any).user;
        if (!user?.isSuperAdmin && existing.organization_id !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        await deviceService.delete(id);

        res.json({
            success: true,
            message: 'Device deleted',
        });
    } catch (error) {
        next(error);
    }
};

export const assignToService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { department_service_id } = req.body;

        if (!department_service_id) {
            res.status(400).json({
                success: false,
                error: 'department_service_id is required',
            });
            return;
        }

        const device = await deviceService.assignToService(id, department_service_id);

        res.json({
            success: true,
            data: device,
            message: 'Device assigned to service',
        });
    } catch (error) {
        next(error);
    }
};

export const unassignFromService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const device = await deviceService.unassignFromService(id);

        res.json({
            success: true,
            data: device,
            message: 'Device unassigned from service',
        });
    } catch (error) {
        next(error);
    }
};

export const provisionIoT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        // Check device exists and access
        const existing = await deviceService.getById(id);
        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Device not found',
            });
            return;
        }

        const user = (req as any).user;
        if (!user?.isSuperAdmin && existing.organization_id !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        const result = await deviceService.provisionIoT(id);

        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
            });
            return;
        }

        res.json({
            success: true,
            provisioning_data: result.provisioning_data,
            message: 'Device provisioned for AWS IoT. Save the certificates - they will not be shown again.',
        });
    } catch (error) {
        next(error);
    }
};

export const regenerateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        // Check device exists and access
        const existing = await deviceService.getById(id);
        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Device not found',
            });
            return;
        }

        const user = (req as any).user;
        if (!user?.isSuperAdmin && existing.organization_id !== user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        const { device, apiKey } = await deviceService.regenerateApiKey(id);

        res.json({
            success: true,
            data: device,
            api_key: apiKey,
            message: 'API key regenerated. Save the new key - it will not be shown again.',
        });
    } catch (error) {
        next(error);
    }
};

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
