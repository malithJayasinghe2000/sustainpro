import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();

/**
 * @swagger
 * /webhook/aws-iot:
 *   post:
 *     tags: [Webhooks]
 *     summary: AWS IoT Core webhook
 *     description: Receive telemetry from AWS IoT Core
 *     responses:
 *       200:
 *         description: Data received
 */
router.post(
    '/aws-iot',
    webhookController.awsIotWebhook
);

/**
 * @swagger
 * /webhook/telemetry:
 *   post:
 *     tags: [Webhooks]
 *     summary: Generic telemetry webhook
 *     description: Receive telemetry from custom integrations
 *     responses:
 *       200:
 *         description: Data received
 */
router.post(
    '/telemetry',
    webhookController.genericTelemetryWebhook
);

export default router;
