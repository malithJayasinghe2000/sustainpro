import { Request, Response, NextFunction } from 'express';
import { query } from '../db';
import crypto from 'crypto';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'device-auth' });

// Extend Express Request to include device info
declare global {
    namespace Express {
        interface Request {
            device?: {
                id: string;
                device_code: string;
                organization_id: string;
                event_id?: string;
                department_service_id?: string;
                name: string;
                status: string;
            };
        }
    }
}

/**
 * Hash an API key for comparison
 */
function hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Authenticate device by API key
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

        // Hash the provided API key
        const apiKeyHash = hashApiKey(apiKey);

        // Look up device by API key hash
        const result = await query(
            `SELECT d.id, d.device_code, d.organization_id, d.department_service_id, 
                    d.name, d.status, ds.department_id,
                    dep.event_id
             FROM devices d
             LEFT JOIN department_services ds ON d.department_service_id = ds.id
             LEFT JOIN departments dep ON ds.department_id = dep.id
             WHERE d.api_key_hash = $1 AND d.status != 'INACTIVE'`,
            [apiKeyHash]
        );

        if (result.rows.length === 0) {
            logger.warn('Invalid device API key attempt');
            res.status(401).json({
                success: false,
                error: 'Invalid API key',
            });
            return;
        }

        const device = result.rows[0];

        // Attach device info to request
        req.device = {
            id: device.id,
            device_code: device.device_code,
            organization_id: device.organization_id,
            event_id: device.event_id,
            department_service_id: device.department_service_id,
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
