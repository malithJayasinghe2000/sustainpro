import { Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'device-auth' });

// Extend Express Request to include device info
declare global {
    namespace Express {
        interface Request {
            device?: {
                id: number;
                device_code: string;
                organization_id: string;
                event_id?: string;
                service_id?: string;
                name: string;
                status: string;
            };
        }
    }
}

/**
 * Authenticate device by API key
 * 
 * The schema stores plain API keys in sps_devices.api_key
 */
export const authenticateDevice = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            res.status(401).json({
                success: false,
                error: 'API key required. Use X-API-Key header.',
            });
            return;
        }

        // Look up device by API key using raw SQL for complex joins
        const result = await prisma.$queryRaw<Array<any>>`
            SELECT d.id, d.device_code, d.organization_id, d.service_id, 
                   d.name, d.status,
                   e.id as event_id
            FROM sps_devices d
            LEFT JOIN sps_department_services ds ON d.service_id = ds.id
            LEFT JOIN sps_departments dep ON ds.department_id = dep.id
            LEFT JOIN sps_events e ON dep.event_id = e.id
            WHERE d.api_key = ${apiKey} AND d.status != 'INACTIVE'
        `;

        if (result.length === 0) {
            logger.warn('Invalid device API key attempt');
            res.status(401).json({
                success: false,
                error: 'Invalid API key',
            });
            return;
        }

        const device = result[0];

        // Attach device info to request
        req.device = {
            id: device.id,
            device_code: device.device_code,
            organization_id: device.organization_id,
            event_id: device.event_id,
            service_id: device.service_id,
            name: device.name,
            status: device.status,
        };

        logger.debug('Device authenticated', { deviceCode: device.device_code });

        next();
    } catch (error: any) {
        logger.error('Device authentication error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
        });
    }
};

/**
 * Optional device auth - doesn't fail if no API key
 */
export const optionalDeviceAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        return next();
    }

    return authenticateDevice(req, res, next);
};
