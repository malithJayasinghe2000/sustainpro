import { Router, Request, Response } from 'express';
import { getIO } from '../socket';

const router = Router();

// Webhook secret for validation
const WEBHOOK_SECRET = process.env.AWS_IOT_WEBHOOK_SECRET || '';

/**
 * POST /api/v1/aws-iot/webhook
 * Webhook endpoint to receive telemetry data from AWS IoT Core via IoT Rules
 * 
 * AWS IoT Rule should be configured to send data to this endpoint with:
 * - URL: https://your-domain.com/api/v1/aws-iot/webhook
 * - Authorization header with secret token
 * 
 * Expected payload from IoT Rule:
 * {
 *   "device_code": "SPS_001",
 *   "organization_id": "uuid",
 *   "data": { ... telemetry data ... },
 *   "timestamp": "ISO 8601"
 * }
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        // Debug logging
        console.log('📡 [AWS IoT Webhook] Request received');

        // Handle AWS Destination Confirmation (sent without custom headers)
        if (req.headers['x-amz-rules-engine-message-type'] === 'DestinationConfirmation') {
            console.log('✅ AWS Destination Confirmation received');
            console.log('Confirmation URL:', req.body.enableUrl);
            return res.status(200).json({ success: true, message: 'Confirmed' });
        }

        console.log('Headers:', req.headers);

        // Validate webhook secret
        const authHeader = req.headers['authorization'];
        console.log('Auth Header:', authHeader);
        console.log('Expected:', `Bearer ${WEBHOOK_SECRET}`);

        if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
            console.warn('⚠️ Unauthorized webhook request');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        const payload = req.body;
        const { device_code, organization_id, data, timestamp } = payload;

        if (!device_code || !data) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: device_code, data',
            });
        }

        console.log(`📡 [AWS IoT Webhook] Received telemetry from ${device_code}`);

        // Emit real-time update via Socket.IO
        try {
            const io = getIO();

            // Emit to dashboard
            io.emit('dashboard:telemetry', {
                device_code,
                organization_id,
                data,
                timestamp: timestamp || new Date().toISOString(),
                source: 'aws_iot',
            });

            console.log(`✅ Emitted telemetry data via Socket.IO`);
        } catch (socketError) {
            console.error('Socket emit error:', socketError);
            // Don't fail the request if socket fails
        }

        // TODO: Optional - store telemetry in database if needed
        // For now, we're keeping it in-memory only via Socket.IO

        res.status(200).json({
            success: true,
            message: 'Telemetry received and broadcast',
        });
    } catch (error) {
        console.error('❌ Error processing AWS IoT webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process telemetry data',
        });
    }
});

/**
 * GET /api/v1/aws-iot/webhook/health
 * Health check endpoint for AWS IoT webhook
 */
router.get('/webhook/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        service: 'AWS IoT Webhook',
        status: 'operational',
        timestamp: new Date().toISOString(),
    });
});

export default router;
