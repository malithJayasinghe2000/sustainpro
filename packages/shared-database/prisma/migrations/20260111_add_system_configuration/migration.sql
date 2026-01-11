-- Migration: Add System Configuration Tables
-- Created: 2026-01-11
-- Description: Adds comprehensive system configuration tables for global settings,
--              login policies, security, email configuration, and notifications

-- ============================================================================
-- 1. Modify sps_system_settings table (remove old columns, add new ones)
-- ============================================================================

-- First, drop the old columns if they exist (safe migration)
DO $$ 
BEGIN
    -- Remove columns that are being moved to dedicated tables
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'category') THEN
        ALTER TABLE sps_system_settings DROP COLUMN category;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'account_lock_duration_minutes') THEN
        ALTER TABLE sps_system_settings DROP COLUMN account_lock_duration_minutes;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'token_expire_minutes') THEN
        ALTER TABLE sps_system_settings DROP COLUMN token_expire_minutes;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'max_login_attempts') THEN
        ALTER TABLE sps_system_settings DROP COLUMN max_login_attempts;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'session_timeout_enabled') THEN
        ALTER TABLE sps_system_settings DROP COLUMN session_timeout_enabled;
    END IF;
END $$;

-- Add new columns to sps_system_settings if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'system_name') THEN
        ALTER TABLE sps_system_settings ADD COLUMN system_name VARCHAR(100) DEFAULT 'SustainPro';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'site_tagline') THEN
        ALTER TABLE sps_system_settings ADD COLUMN site_tagline VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'site_favicon') THEN
        ALTER TABLE sps_system_settings ADD COLUMN site_favicon TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'primary_color') THEN
        ALTER TABLE sps_system_settings ADD COLUMN primary_color VARCHAR(20) DEFAULT '#3B82F6';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'secondary_color') THEN
        ALTER TABLE sps_system_settings ADD COLUMN secondary_color VARCHAR(20) DEFAULT '#10B981';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'default_language') THEN
        ALTER TABLE sps_system_settings ADD COLUMN default_language VARCHAR(10) DEFAULT 'en';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'date_format') THEN
        ALTER TABLE sps_system_settings ADD COLUMN date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'time_format') THEN
        ALTER TABLE sps_system_settings ADD COLUMN time_format VARCHAR(50) DEFAULT 'HH:mm:ss';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'datetime_format') THEN
        ALTER TABLE sps_system_settings ADD COLUMN datetime_format VARCHAR(100) DEFAULT 'DD/MM/YYYY HH:mm:ss';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'first_day_of_week') THEN
        ALTER TABLE sps_system_settings ADD COLUMN first_day_of_week INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'maintenance_message') THEN
        ALTER TABLE sps_system_settings ADD COLUMN maintenance_message TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'global_alert_type') THEN
        ALTER TABLE sps_system_settings ADD COLUMN global_alert_type VARCHAR(20) DEFAULT 'INFO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'support_url') THEN
        ALTER TABLE sps_system_settings ADD COLUMN support_url VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'meta_description') THEN
        ALTER TABLE sps_system_settings ADD COLUMN meta_description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sps_system_settings' AND column_name = 'meta_keywords') THEN
        ALTER TABLE sps_system_settings ADD COLUMN meta_keywords TEXT;
    END IF;
END $$;

-- Update default timezone to Asia/Dubai
UPDATE sps_system_settings SET default_timezone = 'Asia/Dubai' WHERE default_timezone = 'Asia/Colombo';

-- ============================================================================
-- 2. Create Password Policies Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_password_policies (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'sps_password_policy',
    min_length INTEGER DEFAULT 8,
    max_length INTEGER DEFAULT 128,
    require_uppercase BOOLEAN DEFAULT true,
    require_lowercase BOOLEAN DEFAULT true,
    require_numbers BOOLEAN DEFAULT true,
    require_special_chars BOOLEAN DEFAULT true,
    special_chars_allowed VARCHAR(100) DEFAULT '!@#$%^&*()_+-=[]{}|;:,.<>?',
    password_expires BOOLEAN DEFAULT false,
    password_expiry_days INTEGER DEFAULT 90,
    expiry_warning_days INTEGER DEFAULT 14,
    prevent_reuse BOOLEAN DEFAULT true,
    reuse_prevention_count INTEGER DEFAULT 5,
    require_change_on_first_login BOOLEAN DEFAULT true,
    min_password_age_hours INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Create Session Policies Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_session_policies (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'sps_session_policy',
    session_timeout_enabled BOOLEAN DEFAULT true,
    session_timeout_minutes INTEGER DEFAULT 60,
    idle_timeout_enabled BOOLEAN DEFAULT true,
    idle_timeout_minutes INTEGER DEFAULT 30,
    max_concurrent_sessions INTEGER DEFAULT 5,
    enforce_single_session BOOLEAN DEFAULT false,
    access_token_expire_minutes INTEGER DEFAULT 60,
    refresh_token_expire_days INTEGER DEFAULT 7,
    remember_me_expire_days INTEGER DEFAULT 30,
    bind_session_to_ip BOOLEAN DEFAULT false,
    bind_session_to_user_agent BOOLEAN DEFAULT false,
    regenerate_session_on_login BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. Create Login Policies Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_login_policies (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'sps_login_policy',
    max_login_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,
    progressive_lockout BOOLEAN DEFAULT true,
    progressive_lockout_multiplier DOUBLE PRECISION DEFAULT 2.0,
    max_lockout_duration_minutes INTEGER DEFAULT 1440,
    enable_captcha BOOLEAN DEFAULT false,
    captcha_after_attempts INTEGER DEFAULT 3,
    captcha_provider VARCHAR(50) DEFAULT 'RECAPTCHA',
    captcha_site_key TEXT,
    captcha_secret_key TEXT,
    enable_ip_blocking BOOLEAN DEFAULT true,
    ip_block_threshold INTEGER DEFAULT 10,
    ip_block_duration_minutes INTEGER DEFAULT 60,
    notify_on_lockout BOOLEAN DEFAULT true,
    notify_on_new_device_login BOOLEAN DEFAULT true,
    notify_on_password_change BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. Create Two-Factor Authentication Config Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_two_factor_config (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'sps_2fa_config',
    enabled BOOLEAN DEFAULT true,
    enforce_globally BOOLEAN DEFAULT false,
    enforce_for_admins BOOLEAN DEFAULT true,
    grace_period_days INTEGER DEFAULT 7,
    email_method_enabled BOOLEAN DEFAULT true,
    sms_method_enabled BOOLEAN DEFAULT false,
    totp_method_enabled BOOLEAN DEFAULT true,
    email_otp_length INTEGER DEFAULT 6,
    email_otp_expiry_minutes INTEGER DEFAULT 10,
    email_otp_max_attempts INTEGER DEFAULT 3,
    sms_otp_length INTEGER DEFAULT 6,
    sms_otp_expiry_minutes INTEGER DEFAULT 5,
    sms_otp_max_attempts INTEGER DEFAULT 3,
    sms_provider VARCHAR(50),
    sms_api_key TEXT,
    sms_api_secret TEXT,
    sms_sender_id VARCHAR(20),
    totp_issuer VARCHAR(100) DEFAULT 'SustainPro',
    totp_algorithm VARCHAR(10) DEFAULT 'SHA1',
    totp_digits INTEGER DEFAULT 6,
    totp_period INTEGER DEFAULT 30,
    recovery_codes_enabled BOOLEAN DEFAULT true,
    recovery_codes_count INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. Create API Security Config Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_api_security_config (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'sps_api_security',
    rate_limit_enabled BOOLEAN DEFAULT true,
    rate_limit_requests INTEGER DEFAULT 100,
    rate_limit_window_minutes INTEGER DEFAULT 1,
    rate_limit_by VARCHAR(20) DEFAULT 'IP',
    api_key_enabled BOOLEAN DEFAULT true,
    api_key_expiry_days INTEGER DEFAULT 365,
    api_key_max_per_user INTEGER DEFAULT 5,
    api_key_require_ip_whitelist BOOLEAN DEFAULT false,
    cors_enabled BOOLEAN DEFAULT true,
    cors_allowed_origins TEXT DEFAULT '*',
    cors_allowed_methods TEXT DEFAULT 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    cors_allowed_headers TEXT DEFAULT 'Content-Type,Authorization,X-API-Key',
    cors_max_age_seconds INTEGER DEFAULT 86400,
    cors_allow_credentials BOOLEAN DEFAULT true,
    api_versioning_enabled BOOLEAN DEFAULT true,
    current_api_version VARCHAR(20) DEFAULT 'v1',
    supported_versions TEXT DEFAULT 'v1',
    deprecation_warning_enabled BOOLEAN DEFAULT true,
    max_request_body_size_mb INTEGER DEFAULT 10,
    request_timeout_seconds INTEGER DEFAULT 30,
    enable_security_headers BOOLEAN DEFAULT true,
    hsts_enabled BOOLEAN DEFAULT true,
    hsts_max_age_seconds INTEGER DEFAULT 31536000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. Create SMTP Settings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_smtp_settings (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'sps_smtp_config',
    smtp_enabled BOOLEAN DEFAULT true,
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password TEXT,
    smtp_encryption VARCHAR(10) DEFAULT 'TLS',
    smtp_timeout_seconds INTEGER DEFAULT 30,
    from_email VARCHAR(255),
    from_name VARCHAR(100) DEFAULT 'SustainPro',
    reply_to_email VARCHAR(255),
    max_emails_per_hour INTEGER DEFAULT 100,
    max_emails_per_day INTEGER DEFAULT 1000,
    max_recipients_per_email INTEGER DEFAULT 50,
    test_mode BOOLEAN DEFAULT false,
    test_email_recipient VARCHAR(255),
    last_connection_test TIMESTAMPTZ,
    last_connection_status VARCHAR(50),
    last_connection_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. Create Email Templates Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'SYSTEM',
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    available_variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    is_system_template BOOLEAN DEFAULT false,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_code ON sps_email_templates(code);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON sps_email_templates(category);

-- ============================================================================
-- 9. Create Notification Settings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_notification_settings (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'sps_notification_config',
    email_notifications_enabled BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'IMMEDIATE',
    email_batch_size INTEGER DEFAULT 10,
    email_digest_time VARCHAR(10) DEFAULT '09:00',
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start VARCHAR(10) DEFAULT '22:00',
    quiet_hours_end VARCHAR(10) DEFAULT '07:00',
    quiet_hours_timezone VARCHAR(100) DEFAULT 'UTC',
    quiet_hours_override_urgent BOOLEAN DEFAULT true,
    in_app_notifications_enabled BOOLEAN DEFAULT true,
    in_app_auto_dismiss_seconds INTEGER DEFAULT 5,
    in_app_max_visible INTEGER DEFAULT 5,
    push_notifications_enabled BOOLEAN DEFAULT false,
    push_provider VARCHAR(50),
    push_api_key TEXT,
    retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. Create Password History Table (for reuse prevention)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES sps_users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON sps_password_history(user_id);

-- ============================================================================
-- 11. Create User Two-Factor Settings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_user_two_factor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES sps_users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    enabled_at TIMESTAMPTZ,
    email_enabled BOOLEAN DEFAULT false,
    sms_enabled BOOLEAN DEFAULT false,
    totp_enabled BOOLEAN DEFAULT false,
    totp_secret TEXT,
    totp_verified_at TIMESTAMPTZ,
    backup_phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT false,
    recovery_codes TEXT,
    recovery_codes_generated_at TIMESTAMPTZ,
    recovery_codes_used INTEGER DEFAULT 0,
    last_used_method VARCHAR(20),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. Create API Keys Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES sps_users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES sps_organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    scopes JSONB DEFAULT '[]',
    ip_whitelist JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_used_ip VARCHAR(50),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON sps_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON sps_api_keys(organization_id);

-- ============================================================================
-- 13. Create User Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES sps_users(id) ON DELETE CASCADE,
    session_token_hash TEXT UNIQUE NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(50),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_remember_me BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON sps_user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON sps_user_sessions(expires_at);

-- ============================================================================
-- 14. Create Login Attempts Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sps_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES sps_users(id) ON DELETE SET NULL,
    ip_address VARCHAR(50) NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    two_factor_required BOOLEAN DEFAULT false,
    two_factor_method VARCHAR(20),
    two_factor_success BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON sps_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON sps_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON sps_login_attempts(created_at);

-- ============================================================================
-- 15. Insert Default Configuration Data
-- ============================================================================

-- Insert default password policy
INSERT INTO sps_password_policies (id) VALUES ('sps_password_policy')
ON CONFLICT (id) DO NOTHING;

-- Insert default session policy
INSERT INTO sps_session_policies (id) VALUES ('sps_session_policy')
ON CONFLICT (id) DO NOTHING;

-- Insert default login policy
INSERT INTO sps_login_policies (id) VALUES ('sps_login_policy')
ON CONFLICT (id) DO NOTHING;

-- Insert default 2FA config
INSERT INTO sps_two_factor_config (id) VALUES ('sps_2fa_config')
ON CONFLICT (id) DO NOTHING;

-- Insert default API security config
INSERT INTO sps_api_security_config (id) VALUES ('sps_api_security')
ON CONFLICT (id) DO NOTHING;

-- Insert default SMTP settings
INSERT INTO sps_smtp_settings (id, from_email, reply_to_email) 
VALUES ('sps_smtp_config', 'noreply@sustainpro.io', 'support@sustainpro.io')
ON CONFLICT (id) DO NOTHING;

-- Insert default notification settings
INSERT INTO sps_notification_settings (id, quiet_hours_timezone) 
VALUES ('sps_notification_config', 'Asia/Dubai')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Migration Complete
-- ============================================================================
