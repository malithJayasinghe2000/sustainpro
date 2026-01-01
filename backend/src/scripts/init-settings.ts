
import pool from '../db';
import fs from 'fs';
import path from 'path';

async function initSettings() {
    try {
        console.log('Initializing system settings...');

        const query = `
            INSERT INTO sps_system_settings (
                id, category, maintenance_mode, default_timezone, 
                account_lock_duration_minutes, token_expire_minutes, 
                max_login_attempts, session_timeout_enabled, 
                support_email, support_phone, global_alert_message
            ) VALUES (
                'sps_main_config', 'global', false, 'Asia/Colombo', 
                15, 60, 5, true, 'help@sps.com', '+94 11 234 5678', 
                'System maintenance scheduled for Sunday 2 AM.'
            )
            ON CONFLICT (id) DO UPDATE SET
                updated_at = NOW();
        `;

        await pool.query(query);
        console.log('System settings initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize settings:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

initSettings();
