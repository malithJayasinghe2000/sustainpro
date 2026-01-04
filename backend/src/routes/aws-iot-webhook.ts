import { Router, Request, Response } from 'express';
import { getIO } from '../socket';
import pool from '../db';

const router = Router();

// Webhook secret for validation
const WEBHOOK_SECRET = (process.env.AWS_IOT_WEBHOOK_SECRET || '').trim();

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
/**
 * POST /api/v1/aws-iot/webhook
 */
router.post('/webhook1', async (req: Request, res: Response) => {
    try {
        console.log('📡 [AWS IoT Webhook] Request received');

        // Handle AWS IoT Subscription Confirmation
        if (req.query.confirmationToken) {
            console.log('✅ AWS IoT Subscription Confirmation received');
            return res.status(200).json({
                success: true,
                message: 'Subscription confirmed',
                confirmationToken: req.query.confirmationToken
            });
        }

        // Security Check for regular telemetry requests
        const authHeader = req.headers['authorization'];
        if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
            console.warn('⚠️ Unauthorized webhook request');
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const payload = req.body;
        // Firmware now sends 'hardware_id' (Secret) instead of just 'device_code'
        const { hardware_id, organization_id, data, timestamp } = payload;

        if (!hardware_id || !data) {
            return res.status(400).json({ success: false, error: 'Missing: hardware_id, data' });
        }

        // 1. Lookup Device by Hardware ID
        // We use the Secret ID to find the Friendly Name & DB ID
        let deviceResult = await pool.query(
            'SELECT id, device_code, status FROM sps_devices WHERE hardware_id = $1',
            [hardware_id]
        );

        let device = deviceResult.rows[0];
        let device_code = device?.device_code || hardware_id; // Default to HW ID if new

        // 2. Auto-Registration (If device doesn't exist)
        if (!device) {
            console.log(`🆕 New Device Detected: ${hardware_id}. Auto-Registering...`);

            // Auto-create with status 'UNPROVISIONED' until user claims it? 
            // Or 'ACTIVE' if we trust the certs. Let's make it ACTIVE for now.
            const insertResult = await pool.query(`
                INSERT INTO sps_devices 
                (organization_id, hardware_id, device_code, name, type, status, metadata)
                VALUES ($1, $2, $3, $4, 'gateway', 'ACTIVE', $5)
                RETURNING id, device_code
            `, [
                organization_id || '00000000-0000-0000-0000-000000000000', // Warning: UUID must be valid
                hardware_id,
                hardware_id, // Initially, FriendlyName = ID
                `New Device (${hardware_id.substring(0, 6)})`,
                '{"auto_registered": true}'
            ]);
            device = insertResult.rows[0];
            device_code = device.device_code;
        }

        // 3. Validation: Check against Device Model
        // We assume device.type corresponds to sps_device_models.id (e.g. 'waterwall')
        if (device && device.type) {
            try {
                const modelResult = await pool.query(
                    'SELECT parameters FROM sps_device_models WHERE id = $1',
                    [device.type]
                );

                if (modelResult.rows.length > 0) {
                    const parameters = modelResult.rows[0].parameters; // Array of { name, type, min, max, required }

                    if (Array.isArray(parameters)) {
                        const errors: string[] = [];

                        // Check Required Fields & Types
                        for (const param of parameters) {
                            const val = data[param.name];

                            // Check Required
                            if (param.required && (val === undefined || val === null)) {
                                errors.push(`Missing required field: ${param.name}`);
                                continue;
                            }

                            // Skip check if optional and missing
                            if (val === undefined || val === null) continue;

                            // Check Type
                            if (param.type === 'number') {
                                if (typeof val !== 'number') {
                                    errors.push(`Field '${param.name}' must be a number`);
                                } else {
                                    // Range Checks
                                    if (param.min !== undefined && val < param.min) errors.push(`Field '${param.name}' < min (${param.min})`);
                                    if (param.max !== undefined && val > param.max) errors.push(`Field '${param.name}' > max (${param.max})`);
                                }
                            } else if (param.type === 'boolean') {
                                if (typeof val !== 'boolean') errors.push(`Field '${param.name}' must be a boolean`);
                            } else if (param.type === 'string') {
                                if (typeof val !== 'string') errors.push(`Field '${param.name}' must be a string`);
                            }
                        }

                        if (errors.length > 0) {
                            console.warn(`⚠️ Validation Failed for ${device_code}:`, errors);
                            // We can either simple log and continue, or Reject.
                            // User asked for "validation", usually implies rejection of bad data.
                            // However, let's tag it as 'invalid' in dashboard or separate log? 
                            // For now, allow it but add metadata flag?
                            // Or STRICT MODE:
                            return res.status(400).json({ success: false, error: 'Validation Failed', details: errors });
                        }
                    }
                }
            } catch (validationErr) {
                console.error('Validation Check Error:', validationErr);
                // Don't block flow on internal DB error, but log it
            }
        }

        // 4. Update Last Seen
        if (device) {
            await pool.query('UPDATE sps_devices SET last_seen = NOW() WHERE id = $1', [device.id]);
        }

        console.log(`✅ Telemetry Validated & Processed for ${device_code}`);

        // 5. Emit to Dashboard (use Friendly Name)
        try {
            const io = getIO();
            io.emit('dashboard:telemetry', {
                device_code, // Friendly Name
                hardware_id, // Secret ID (Optional, maybe hiding it is better?)
                organization_id,
                data,
                timestamp: timestamp || new Date().toISOString(),
                source: 'aws_iot',
            });
        } catch (socketError) {
            console.error('Socket emit error:', socketError);
        }

        res.status(200).json({ success: true, message: 'Telemetry processed' });

    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
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
