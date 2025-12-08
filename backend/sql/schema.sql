-- ===================================
-- SustainPro Database Schema
-- PostgreSQL + TimescaleDB
-- ===================================

-- Step 1: Enable TimescaleDB Extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ===================================
-- Table: sps_users
-- ===================================
CREATE TABLE IF NOT EXISTS sps_users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE, -- Format: SPU-00001
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    roles VARCHAR(255) DEFAULT 'user', -- Comma-separated roles
    
    -- Account security fields
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    disabled_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_sps_users_email ON sps_users(email);
CREATE INDEX idx_sps_users_username ON sps_users(username);

-- ===================================
-- Table: sps_user_profiles
-- ===================================
CREATE TABLE IF NOT EXISTS sps_user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES sps_users(id) ON DELETE CASCADE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    address1 VARCHAR(255),
    address2 VARCHAR(255),
    city VARCHAR(255),
    province VARCHAR(255),
    country VARCHAR(255),
    postal_code VARCHAR(50),
    contact_number VARCHAR(50),
    timezone VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===================================
-- Table: sps_devices
-- ===================================
CREATE TABLE IF NOT EXISTS sps_devices (
    id SERIAL PRIMARY KEY,
    device_code VARCHAR(50) UNIQUE, -- Format: SPD-00001
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255),
    model VARCHAR(255),
    manufacturer VARCHAR(255),
    type VARCHAR(100) NOT NULL,
    capabilities TEXT, -- JSON string
    location VARCHAR(255),
    category VARCHAR(100),
    user_id INTEGER REFERENCES sps_users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    enabled BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMPTZ,
    firmware_version VARCHAR(100),
    last_update_at TIMESTAMPTZ,
    api_key VARCHAR(255),
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_data TEXT, -- JSON string
    custom_fields TEXT, -- JSON string
    battery_level FLOAT,
    power_source VARCHAR(50),
    battery_status VARCHAR(50),
    data_frequency INTEGER,
    sensor_sample_interval INTEGER,
    last_data_at TIMESTAMPTZ,
    connection_type VARCHAR(50),
    signal_strength FLOAT,
    ip_address VARCHAR(50),
    mac_address VARCHAR(50),
    latitude FLOAT,
    longitude FLOAT,
    uptime INTEGER,
    error_code VARCHAR(100),
    maintenance_required BOOLEAN DEFAULT FALSE,
    
    -- Device Settings
    sensor_enabled_config TEXT DEFAULT '{}', -- JSON
    sensor_thresholds TEXT DEFAULT '{}', -- JSON
    alert_enabled BOOLEAN DEFAULT TRUE,
    notification_email VARCHAR(255),
    alert_cooldown_minutes INTEGER DEFAULT 15,
    sensor_calibration TEXT DEFAULT '{}', -- JSON
    device_description TEXT,
    installation_date TIMESTAMPTZ,
    warranty_expiry TIMESTAMPTZ,
    firmware_update_available BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_sps_devices_user_id ON sps_devices(user_id);
CREATE INDEX idx_sps_devices_device_code ON sps_devices(device_code);
CREATE INDEX idx_sps_devices_status ON sps_devices(status);

-- ===================================
-- Table: sps_system_settings
-- ===================================
CREATE TABLE IF NOT EXISTS sps_system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    data_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    is_public BOOLEAN DEFAULT FALSE, -- Whether setting is public or admin-only
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_sps_system_settings_key ON sps_system_settings(key);

-- ===================================
-- Table: sps_telemetry (TimescaleDB Hypertable)
-- ===================================
CREATE TABLE IF NOT EXISTS sps_telemetry (
    id BIGSERIAL,
    device_id INTEGER NOT NULL REFERENCES sps_devices(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES sps_users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    data TEXT NOT NULL, -- JSON string of sensor readings
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Convert to TimescaleDB hypertable (partitioned by time)
SELECT create_hypertable('sps_telemetry', 'timestamp', if_not_exists => TRUE);

-- Create indexes for faster queries
CREATE INDEX idx_sps_telemetry_device_timestamp ON sps_telemetry(device_id, timestamp DESC);
CREATE INDEX idx_sps_telemetry_user ON sps_telemetry(user_id);
CREATE INDEX idx_sps_telemetry_timestamp ON sps_telemetry(timestamp DESC);

-- ===================================
-- Triggers for updated_at Timestamps
-- ===================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sps_users_updated_at BEFORE UPDATE ON sps_users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sps_user_profiles_updated_at BEFORE UPDATE ON sps_user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sps_devices_updated_at BEFORE UPDATE ON sps_devices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sps_system_settings_updated_at BEFORE UPDATE ON sps_system_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- Optional: Sample Data
-- ===================================
-- INSERT INTO sps_system_settings (key, value, description, data_type, is_public)
-- VALUES 
--   ('app_name', 'SustainPro', 'Application name', 'string', TRUE),
--   ('max_devices_per_user', '50', 'Maximum devices per user', 'number', FALSE);

COMMENT ON TABLE sps_users IS 'User authentication and account management';
COMMENT ON TABLE sps_user_profiles IS 'Extended user information';
COMMENT ON TABLE sps_devices IS 'IoT device registry and metadata';
COMMENT ON TABLE sps_system_settings IS 'Global system configuration (key-value store)';
COMMENT ON TABLE sps_telemetry IS 'Time-series sensor data (TimescaleDB hypertable)';
