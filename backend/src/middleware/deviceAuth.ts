import { Request, Response, NextFunction } from 'express';
import { query } from '../db';

// Extend Express Request to include device
declare global {
    namespace Express {
        interface Request {
            device?: any;
        }
    }
}

/**
 * Middleware to authenticate devices using API key
 * Accepts: 
 *   - Authorization: Bearer <api_key>
 *   - X-API-Key: <api_key>
 */
export const authenticateDevice = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // DEBUG LOGGING
        console.log('[DeviceAuth] Incoming headers:', req.headers);

        let apiKey: string | undefined;

        // Method 1: Authorization: Bearer <api_key>
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            apiKey = authHeader.substring(7);
        }

        // Method 2: X-API-Key header (common for IoT devices)
        if (!apiKey) {
            apiKey = req.headers['x-api-key'] as string;
        }

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'Missing API key. Use Authorization: Bearer <key> or X-API-Key header'
            });
        }

        // Validate API key against database
        const sql = `
            SELECT id, device_code, name, status, metadata
            FROM sps_devices
            WHERE api_key = $1
        `;

        const result = await query(sql, [apiKey]);

        if (result.rows.length === 0) {
            console.log('[DeviceAuth] Invalid API key attempt');
            return res.status(401).json({
                success: false,
                error: 'Invalid API key'
            });
        }

        const device = result.rows[0];

        // Check if device is enabled
        if (!device.is_enabled) {
            return res.status(403).json({
                success: false,
                error: 'Device is disabled'
            });
        }

        // Attach device to request
        req.device = device;
        // console.log(`[DeviceAuth] Authenticated: ${device.device_code}`);
        next();
    } catch (error) {
        console.error('Device authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};
