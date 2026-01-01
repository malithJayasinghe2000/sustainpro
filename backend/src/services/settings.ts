import { query } from '../db';

export interface SecuritySettings {
    maxLoginAttempts: number;
    accountLockDurationMinutes: number;
    tokenExpireMinutes: number;
}

export const getSecuritySettings = async (): Promise<SecuritySettings> => {
    try {
        const result = await query(
            `SELECT 
        max_login_attempts,
        account_lock_duration_minutes,
        token_expire_minutes
        FROM sps_system_settings 
        WHERE id = 'sps_main_config'
        LIMIT 1`
        );

        if (result.rows.length === 0) {
            return {
                maxLoginAttempts: 5,
                accountLockDurationMinutes: 15,
                tokenExpireMinutes: 60
            };
        }

        return {
            maxLoginAttempts: result.rows[0].max_login_attempts || 5,
            accountLockDurationMinutes: result.rows[0].account_lock_duration_minutes || 15,
            tokenExpireMinutes: result.rows[0].token_expire_minutes || 60
        };
    } catch (err) {
        console.warn('Failed to fetch security settings, using defaults', err);
        return {
            maxLoginAttempts: 5,
            accountLockDurationMinutes: 15,
            tokenExpireMinutes: 60
        };
    }
};
