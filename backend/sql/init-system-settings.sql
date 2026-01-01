-- Insert default system settings for authentication
INSERT INTO sps_system_settings (
    id,
    category,
    maintenance_mode,
    default_timezone,
    account_lock_duration_minutes,
    token_expire_minutes,
    max_login_attempts,
    session_timeout_enabled,
    support_email,
    support_phone,
    global_alert_message
) VALUES (
    'sps_main_config',
    'global',
    false,
    'Asia/Colombo',
    15,          -- Lock for 15 minutes
    60,          -- Token expires in 60 minutes
    5,           -- Max 5 login attempts
    true,
    'help@sps.com',
    '+94 11 234 5678',
    'System maintenance scheduled for Sunday 2 AM.'
)
ON CONFLICT (id) DO UPDATE SET
    account_lock_duration_minutes = EXCLUDED.account_lock_duration_minutes,
    token_expire_minutes = EXCLUDED.token_expire_minutes,
    max_login_attempts = EXCLUDED.max_login_attempts,
    updated_at = NOW();
