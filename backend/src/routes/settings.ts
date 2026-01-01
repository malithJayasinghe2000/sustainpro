import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getCurrentSystemTime, clearSystemTimezoneCache } from '../utils/timezone';

const router = Router();

// GET /api/v1/settings - Get system settings (Public for site config)
router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT * FROM sps_system_settings WHERE id = 'sps_main_config'`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'System settings not found',
                hint: 'Run backend/sql/init-system-settings.sql to initialize'
            });
        }

        res.json({ settings: result.rows[0] });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// GET /api/v1/settings/security - Get security settings (Public for login page)
router.get('/security', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT 
        max_login_attempts,
        account_lock_duration_minutes,
        token_expire_minutes
      FROM sps_system_settings 
      WHERE id = 'sps_main_config'`
        );

        if (result.rows.length === 0) {
            // Return defaults if not configured
            return res.json({
                max_login_attempts: 5,
                account_lock_duration_minutes: 15,
                token_expire_minutes: 60,
                warning: 'Using default values - database not configured'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get security settings error:', error);
        res.status(500).json({ error: 'Failed to fetch security settings' });
    }
});

// PUT /api/v1/settings - Update system settings (Admin only)
router.put('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
    try {
        const {
            site_title,
            site_logo,
            maintenance_mode,
            default_timezone,
            account_lock_duration_minutes,
            token_expire_minutes,
            max_login_attempts,
            session_timeout_enabled,
            support_email,
            support_phone,
            global_alert_message,
            device_api_url
        } = req.body;

        const result = await pool.query(
            `UPDATE sps_system_settings 
      SET 
        site_title = COALESCE($1, site_title),
        site_logo = COALESCE($2, site_logo),
        maintenance_mode = COALESCE($3, maintenance_mode),
        default_timezone = COALESCE($4, default_timezone),
        account_lock_duration_minutes = COALESCE($5, account_lock_duration_minutes),
        token_expire_minutes = COALESCE($6, token_expire_minutes),
        max_login_attempts = COALESCE($7, max_login_attempts),
        session_timeout_enabled = COALESCE($8, session_timeout_enabled),
        support_email = COALESCE($9, support_email),
        support_phone = COALESCE($10, support_phone),
        global_alert_message = COALESCE($11, global_alert_message),
        device_api_url = COALESCE($13, device_api_url),
        updated_at = $12
      WHERE id = 'sps_main_config'
      RETURNING *`,
            [
                site_title,
                site_logo,
                maintenance_mode,
                default_timezone,
                account_lock_duration_minutes,
                token_expire_minutes,
                max_login_attempts,
                session_timeout_enabled,
                support_email,
                support_phone,
                global_alert_message,
                await getCurrentSystemTime(),
                device_api_url
            ]
        );

        // Clear cache if timezone changed
        if (default_timezone) {
            clearSystemTimezoneCache();
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'System settings not found' });
        }

        res.json({
            message: 'Settings updated successfully',
            settings: result.rows[0]
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
