-- Verify system settings exist and check values
SELECT 
    id,
    category,
    max_login_attempts,
    account_lock_duration_minutes,
    token_expire_minutes,
    session_timeout_enabled
FROM sps_system_settings
WHERE id = 'sps_main_config';

-- If no results, run the init-system-settings.sql file first!
