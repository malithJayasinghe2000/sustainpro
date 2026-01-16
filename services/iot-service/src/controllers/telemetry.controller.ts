import { Request, Response, NextFunction } from 'express';
import { telemetryService } from '../services/telemetry.service';
import { liveDataService } from '../services/live-data.service';
import { createLogger, auditLogger, AuditAction, AuditCategory, AuditStatus } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'telemetry-controller' });

/**
 * Ingest telemetry from device
 * POST /api/v1/telemetry
 */
export const ingest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();

    try {
        const device = req.device;

        if (!device) {
            res.status(401).json({
                success: false,
                error: 'Device not authenticated',
            });
            return;
        }

        const { data, timestamp } = req.body;

        if (!data || typeof data !== 'object') {
            res.status(400).json({
                success: false,
                error: 'data object is required',
            });
            return;
        }

        const entry = await telemetryService.ingest({
            device: {
                id: device.id,
                device_code: device.device_code,
                organization_id: device.organization_id,
                event_id: device.event_id,
                service_id: device.service_id,
            },
            data,
            timestamp: timestamp ? new Date(timestamp) : undefined,
        });

        // Log device telemetry (non-blocking, batched for performance)
        auditLogger.logDeviceAction(
            device.id,
            device.device_code,
            device.organization_id,
            AuditAction.SEND_TELEMETRY,
            {
                eventId: device.event_id || undefined,
                serviceId: device.service_id || undefined,
                category: AuditCategory.TELEMETRY,
                status: AuditStatus.SUCCESS,
                metadata: {
                    dataKeys: Object.keys(data),
                    dataPointCount: Object.keys(data).length,
                },
                durationMs: Date.now() - startTime,
            }
        );

        res.status(201).json({
            success: true,
            device_code: device.device_code,
            timestamp: entry.timestamp,
        });
    } catch (error) {
        // Log failed telemetry attempt
        if (req.device) {
            auditLogger.logDeviceAction(
                req.device.id,
                req.device.device_code,
                req.device.organization_id,
                AuditAction.SEND_TELEMETRY,
                {
                    category: AuditCategory.TELEMETRY,
                    status: AuditStatus.FAILURE,
                    errorMessage: (error as Error).message,
                    durationMs: Date.now() - startTime,
                }
            );
        }
        next(error);
    }
};

/**
 * Get live data for a device
 * GET /api/v1/telemetry/live/:deviceCode
 */
export const getLiveData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { deviceCode } = req.params;

        const liveData = telemetryService.getLiveData(deviceCode);

        if (!liveData) {
            res.json({
                success: true,
                data: null,
                status: 'offline',
            });
            return;
        }

        res.json({
            success: true,
            data: liveData,
            status: liveData.status,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get live data for organization
 * GET /api/v1/telemetry/live/organization/:orgId
 */
export const getLiveDataByOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;

        // Check access
        if (!user?.isSuperAdmin && user?.organization_id !== orgId) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        const liveData = telemetryService.getLiveDataByOrganization(orgId);

        res.json({
            success: true,
            data: liveData,
            count: liveData.length,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get live data for event
 * GET /api/v1/telemetry/live/event/:eventId
 */
export const getLiveDataByEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { eventId } = req.params;

        const liveData = telemetryService.getLiveDataByEvent(eventId);

        res.json({
            success: true,
            data: liveData,
            count: liveData.length,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get telemetry history for a device
 * GET /api/v1/telemetry/history/:deviceId
 */
export const getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const deviceId = parseInt(req.params.deviceId);
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;

        if (isNaN(deviceId)) {
            res.status(400).json({
                success: false,
                error: 'deviceId must be a valid number',
            });
            return;
        }

        const records = await telemetryService.getHistory(deviceId, limit, offset);

        res.json({
            success: true,
            data: records,
            pagination: {
                limit,
                offset,
                count: records.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get telemetry history within time range
 * GET /api/v1/telemetry/history/:deviceId/range
 */
export const getHistoryByRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const deviceId = parseInt(req.params.deviceId);
        const { start, end } = req.query;

        if (isNaN(deviceId)) {
            res.status(400).json({
                success: false,
                error: 'deviceId must be a valid number',
            });
            return;
        }

        if (!start || !end) {
            res.status(400).json({
                success: false,
                error: 'start and end query parameters are required',
            });
            return;
        }

        const startTime = new Date(start as string);
        const endTime = new Date(end as string);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            res.status(400).json({
                success: false,
                error: 'Invalid date format for start or end',
            });
            return;
        }

        const records = await telemetryService.getHistoryByTimeRange(deviceId, startTime, endTime);

        res.json({
            success: true,
            data: records,
            range: { start: startTime, end: endTime },
            count: records.length,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get dashboard statistics
 * GET /api/v1/telemetry/stats/dashboard
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const orgId = user?.isSuperAdmin ? null : user?.organization_id;

        const stats = await telemetryService.getDashboardStats(orgId);

        res.json({
            success: true,
            stats,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get system-wide statistics (super admin only)
 * GET /api/v1/telemetry/stats/system
 */
export const getSystemStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;

        if (!user?.isSuperAdmin) {
            res.status(403).json({
                success: false,
                error: 'Super admin access required',
            });
            return;
        }

        const stats = await telemetryService.getSystemStats();

        res.json({
            success: true,
            stats,
        });
    } catch (error) {
        next(error);
    }
};
