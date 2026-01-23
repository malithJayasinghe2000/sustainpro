import { Request, Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service';
import { AppError, createLogger } from '@sustainpro/shared-utils';
import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'department-service-controller' });
const serviceService = new ServiceService();

/**
 * GET /api/v1/department-services/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const service = await serviceService.getDepartmentServiceById(req.params.id);

        res.json({
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

/**
 * GET /api/v1/department-services/:id/devices
 * Paginated device listing with search
 */
export const getDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const serviceId = req.params.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';
        const status = req.query.status as string; // 'ONLINE', 'OFFLINE', or undefined for all
        const sortBy = (req.query.sortBy as string) || 'created_at';
        const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

        const offset = (page - 1) * limit;

        // Build where clause
        const whereClause: any = {
            service_id: serviceId,
        };

        // Add search filter
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { device_code: { contains: search, mode: 'insensitive' } },
                { type: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Add status filter
        if (status) {
            whereClause.status = status;
        }

        // Get total count
        const total = await prisma.sps_devices.count({
            where: whereClause,
        });

        // Get paginated devices
        const devices = await prisma.sps_devices.findMany({
            where: whereClause,
            orderBy: { [sortBy]: sortOrder },
            skip: offset,
            take: limit,
            include: {
                sps_organizations: {
                    select: { name: true }
                }
            }
        });

        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;

        res.json({
            success: true,
            data: devices,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore,
            },
        });
    } catch (error) {
        logger.error('Failed to get devices', { error, serviceId: req.params.id });
        next(error);
    }
};

/**
 * POST /api/v1/department-services/:id/devices
 * Add/assign a device to this service
 */
export const addDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const serviceId = req.params.id;
        const { device_id } = req.body;

        if (!device_id) {
            res.status(400).json({
                success: false,
                error: 'device_id is required',
            });
            return;
        }

        // Update device to assign it to this service
        const device = await prisma.sps_devices.update({
            where: { id: parseInt(device_id) },
            data: { service_id: serviceId },
        });

        logger.info('Device assigned to service', { deviceId: device_id, serviceId });

        res.json({
            success: true,
            data: device,
            message: 'Device assigned to service successfully',
        });
    } catch (error) {
        logger.error('Failed to add device to service', { error, serviceId: req.params.id });
        next(error);
    }
};

/**
 * DELETE /api/v1/department-services/:id/devices/:deviceId
 * Remove/unassign a device from this service
 */
export const removeDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id: serviceId, deviceId } = req.params;

        // Update device to remove it from this service
        const device = await prisma.sps_devices.update({
            where: { id: parseInt(deviceId) },
            data: { service_id: null },
        });

        logger.info('Device removed from service', { deviceId, serviceId });

        res.json({
            success: true,
            data: device,
            message: 'Device removed from service successfully',
        });
    } catch (error) {
        logger.error('Failed to remove device from service', { error });
        next(error);
    }
};
