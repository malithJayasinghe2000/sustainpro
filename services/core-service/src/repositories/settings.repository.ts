import { query } from '../db';
import { SystemSettings } from '@sustainpro/shared-types';

const SETTINGS_ID = 'sps_main_config';

export class SettingsRepository {
    /**
     * Get system settings
     */
    async get(): Promise<SystemSettings | null> {
        const result = await query<SystemSettings>(
            `SELECT * FROM sps_system_settings WHERE id = $1`,
            [SETTINGS_ID]
        );
        return result.rows[0] || null;
    }

    /**
     * Get security settings (public)
     */
    async getSecuritySettings(): Promise<{
        max_login_attempts: number;
        account_lock_duration_minutes: number;
        token_expire_minutes: number;
    }> {
        const result = await query(
            `SELECT max_login_attempts, account_lock_duration_minutes, token_expire_minutes
             FROM sps_system_settings WHERE id = $1`,
            [SETTINGS_ID]
        );

        if (result.rows.length === 0) {
            return {
                max_login_attempts: 5,
                account_lock_duration_minutes: 15,
                token_expire_minutes: 60,
            };
        }

        return result.rows[0];
    }

    /**
     * Update system settings
     */
    async update(data: Partial<SystemSettings>): Promise<SystemSettings | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const allowedFields = [
            'site_title', 'site_logo', 'maintenance_mode', 'default_timezone',
            'account_lock_duration_minutes', 'token_expire_minutes', 'max_login_attempts',
            'session_timeout_enabled', 'support_email', 'support_phone',
            'global_alert_message', 'device_api_url'
        ];

        for (const field of allowedFields) {
            if ((data as any)[field] !== undefined) {
                fields.push(`${field} = $${paramIndex++}`);
                values.push((data as any)[field]);
            }
        }

        if (fields.length === 0) return this.get();

        fields.push(`updated_at = NOW()`);

        const result = await query<SystemSettings>(
            `UPDATE sps_system_settings SET ${fields.join(', ')} WHERE id = '${SETTINGS_ID}' RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    /**
     * Get public settings (for unauthenticated users)
     */
    async getPublicSettings(): Promise<{
        site_title: string;
        site_logo: string | null;
        maintenance_mode: boolean;
        support_email: string | null;
        support_phone: string | null;
        global_alert_message: string | null;
    } | null> {
        const result = await query(
            `SELECT site_title, site_logo, maintenance_mode, support_email, support_phone, global_alert_message
             FROM sps_system_settings WHERE id = $1`,
            [SETTINGS_ID]
        );
        return result.rows[0] || null;
    }
}
