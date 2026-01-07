import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();

// AWS IoT Core webhook
// POST /api/v1/webhook/aws-iot
router.post(
    '/aws-iot',
    webhookController.awsIotWebhook
);

// Generic telemetry webhook for custom integrations
// POST /api/v1/webhook/telemetry
router.post(
    '/telemetry',
    webhookController.genericTelemetryWebhook
);

export default router;
