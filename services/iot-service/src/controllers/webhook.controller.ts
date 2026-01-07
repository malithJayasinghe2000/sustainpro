import { Request, Response, NextFunction } from 'express';
import { telemetryService } from '../services/telemetry.service';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'webhook-controller' });

/**
 * AWS IoT Core webhook endpoint
 * POST /api/v1/webhook/aws-iot
 */
export const awsIotWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Validate webhook secret
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');

        if (token !== config.awsIot.webhookSecret) {
            logger.warn('Invalid AWS IoT webhook secret');
            res.status(401).json({
                success: false,
                error: 'Invalid webhook secret',
            });
            return;
        }

        const { device_code, organization_id, data, timestamp } = req.body;

        if (!device_code) {
            res.status(400).json({
                success: false,
                error: 'device_code is required',
            });
            return;
        }

        if (!data || typeof data !== 'object') {
            res.status(400).json({
                success: false,
                error: 'data object is required',
            });
            return;
        }

        logger.debug('Received AWS IoT webhook', { deviceCode: device_code });

        const entry = await telemetryService.ingestFromWebhook({
            device_code,
            organization_id,
            data,
            timestamp,
        });

        res.status(200).json({
            success: true,
            device_code: entry.device_code,
            timestamp: entry.timestamp,
        });
    } catch (error: any) {
        logger.error('AWS IoT webhook error', { error: error.message });

        if (error.message.includes('Device not found')) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
            return;
        }

        next(error);
    }
};

/**
 * Generic webhook endpoint for custom integrations
 * POST /api/v1/webhook/telemetry
 */
export const genericTelemetryWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { device_code, organization_id, data, timestamp, secret } = req.body;

        // Validate secret
        if (secret !== config.awsIot.webhookSecret) {
            res.status(401).json({
                success: false,
                error: 'Invalid secret',
            });
            return;
        }

        if (!device_code) {
            res.status(400).json({
                success: false,
                error: 'device_code is required',
            });
            return;
        }

        if (!data) {
            res.status(400).json({
                success: false,
                error: 'data is required',
            });
            return;
        }

        const entry = await telemetryService.ingestFromWebhook({
            device_code,
            organization_id,
            data,
            timestamp,
        });

        res.status(200).json({
            success: true,
            device_code: entry.device_code,
            timestamp: entry.timestamp,
        });
    } catch (error: any) {
        if (error.message.includes('Device not found')) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};
