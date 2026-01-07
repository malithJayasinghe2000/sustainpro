-- ==================================================================================
-- SustainPro Enterprise - Multi-Tenant IoT Platform Schema
-- Version: 2.0.0 (Enterprise Architecture)
-- Hierarchy: Organization -> Event -> Department -> Service -> Device
-- ==================================================================================

-- 1. CLEANUP & EXTENSIONS
-- ==================================================================================
DROP TABLE IF EXISTS sps_audit_logs CASCADE;
DROP TABLE IF EXISTS sps_role_assignments CASCADE;
DROP TABLE IF EXISTS sps_devices CASCADE;
DROP TABLE IF EXISTS sps_services CASCADE;
DROP TABLE IF EXISTS sps_service_definitions CASCADE;
DROP TABLE IF EXISTS sps_departments CASCADE;
DROP TABLE IF EXISTS sps_events CASCADE;
DROP TABLE IF EXISTS sps_users CASCADE;
DROP TABLE IF EXISTS sps_organizations CASCADE;
DROP TABLE IF EXISTS sps_system_settings CASCADE;

-- Enable UUID extension for robust IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set search path to public schema
SET search_path TO public;

-- 1.5 GLOBAL SETTINGS
-- ==================================================================================
CREATE TABLE sps_system_settings (
    id VARCHAR(100) PRIMARY KEY,        -- 'sps_main_config'
    category VARCHAR(50) DEFAULT 'global',
    
    -- General Identity
    site_title VARCHAR(100) DEFAULT 'SustainPro',
    site_logo TEXT,
    
    maintenance_mode BOOLEAN DEFAULT FALSE,
    default_timezone VARCHAR(100) DEFAULT 'Asia/Colombo',
    
    -- Security Policies
    account_lock_duration_minutes INTEGER DEFAULT 30,
    token_expire_minutes INTEGER DEFAULT 60,
    max_login_attempts INTEGER DEFAULT 5,
    session_timeout_enabled BOOLEAN DEFAULT TRUE,
    
    -- Support Info
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    global_alert_message TEXT,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. CORE ORGANIZATION & TENANCY
-- ==================================================================================

-- Table: sps_organizations
-- Represents a Tenant (Client) or the Provider (SustainPro)
CREATE TABLE sps_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE, 
    code VARCHAR(50) UNIQUE, -- "SPS-ORG-001"
    type VARCHAR(50) DEFAULT 'CLIENT', -- CLIENT, PROVIDER, PARTNER
    
    -- Identity
    description TEXT,
    industry VARCHAR(100),
    website VARCHAR(255),
    logo_url TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC', -- Organization default timezone
    
    -- Billing & Contact
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    phone VARCHAR(50),
    vat_id VARCHAR(50),
    billing_email VARCHAR(255),
    contact_email VARCHAR(255),
    
    -- SaaS Limits
    plan_tier VARCHAR(50) DEFAULT 'BASIC', -- BASIC, PRO, ENTERPRISE
    max_users INTEGER DEFAULT 5,
    max_devices INTEGER DEFAULT 10,
    subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
    
    -- Config
    theme_config JSONB DEFAULT '{}'::jsonb, -- Custom branding per org
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sps_users
-- Users belong to a primary Organization ("home" org)
CREATE TABLE sps_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES sps_organizations(id) ON DELETE CASCADE,
    
    code VARCHAR(50) UNIQUE, -- "SPS-USR-001"
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    is_active BOOLEAN DEFAULT TRUE,
    is_super_admin BOOLEAN DEFAULT FALSE, -- Platform-wide god mode (SustainPro staff)
    
    -- Security
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HIERARCHICAL PROJECT STRUCTURE
-- ==================================================================================

-- Table: sps_events
-- An Organization can have multiple isolated Events (e.g., "Music Festival 2025")
CREATE TABLE sps_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES sps_organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    status VARCHAR(50) DEFAULT 'PLANNING', -- PLANNING, ACTIVE, ARCHIVED
    
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Extended Event Details
    description TEXT,
    event_type VARCHAR(50),
    image_url TEXT,
    coordinates JSONB DEFAULT '{}'::jsonb,
    permit_authority VARCHAR(100),
    permit_license_number VARCHAR(100),
    noc_status VARCHAR(50),
    ticketing_partner VARCHAR(100),
    protocol_level VARCHAR(50),
    access_control VARCHAR(50),
    arrival_gate VARCHAR(50),
    venue_zones JSONB,
    climate_control VARCHAR(50),
    power_requirement VARCHAR(50)
);

-- Table: sps_departments
-- Functional units within an Event (e.g., "Security", "Sanitation", "Power")
CREATE TABLE sps_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES sps_events(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL, -- "Security Team", "Water Management"
    head_user_id UUID REFERENCES sps_users(id), -- Department Head
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MODULAR SERVICE ARCHITECTURE
-- ==================================================================================

-- Table: sps_service_definitions
-- The "Catalog" of available IoT modules (e.g., "Crowd Counter AI", "Smart Valve")
-- This is usually managed by Super Admins / Developers
CREATE TABLE sps_service_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,  -- "Water Wall Monitor"
    code_key VARCHAR(50) NOT NULL UNIQUE, -- "SVC_WATER_WALL_V1" (used in code)
    
    description TEXT,
    config_schema JSONB NOT NULL DEFAULT '{}'::jsonb, -- UI Schema for configuration
    required_permissions JSONB DEFAULT '[]'::jsonb, -- Capabilities required
    
    is_public BOOLEAN DEFAULT TRUE, -- Available to all orgs?
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sps_services
-- An INSTANCE of a service running in a Department
CREATE TABLE sps_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES sps_departments(id) ON DELETE CASCADE,
    definition_id UUID NOT NULL REFERENCES sps_service_definitions(id),
    
    name VARCHAR(100), -- "Main Gate Crowd Counter"
    config JSONB DEFAULT '{}'::jsonb, -- Specific settings (thresholds, etc)
    status VARCHAR(50) DEFAULT 'ACTIVE',
    
    assigned_supervisor_id UUID REFERENCES sps_users(id), -- Service Supervisor
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DEVICE INVENTORY & PROVISIONING
-- ==================================================================================

-- Table: sps_devices
-- Devices are physically provisioned entities assigned to a SERVICE.
CREATE TABLE sps_devices (
    id SERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES sps_organizations(id) ON DELETE CASCADE, -- Ownership
    service_id UUID REFERENCES sps_services(id) ON DELETE SET NULL, -- Assignment
    
    device_code VARCHAR(50) UNIQUE NOT NULL, -- "DEV-1002"
    api_key VARCHAR(100) UNIQUE, -- Device Auth
    
    name VARCHAR(100),
    type VARCHAR(50), -- "esp32-cam", "flow-sensor"
    status VARCHAR(50) DEFAULT 'OFFLINE',
    
    last_seen TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb, -- Firmware ver, battery, signal
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ADVANCED RBAC (CASCADING PERMISSIONS)
-- ==================================================================================

-- Table: sps_role_assignments
-- Defines WHO has WHAT role in WHICH context.
-- Context is polymorphic-ish, but explicit columns are safer for referential integrity.
-- We only use ONE context column per row.
CREATE TABLE sps_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES sps_users(id) ON DELETE CASCADE,
    
    role VARCHAR(50) NOT NULL, 
    -- ROLES: 'SUPER_ADMIN' (Platform Owner), 'ORG_ADMIN', 'EVENT_MANAGER', 'DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN', 'VIEWER'
    
    -- Context References (Only one should be set per row)
    org_id UUID REFERENCES sps_organizations(id) ON DELETE CASCADE,
    event_id UUID REFERENCES sps_events(id) ON DELETE CASCADE,
    dept_id UUID REFERENCES sps_departments(id) ON DELETE CASCADE,
    service_id UUID REFERENCES sps_services(id) ON DELETE CASCADE,
    
    -- Constraint: Maintain strict logic
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_context_only CHECK (
        (org_id IS NOT NULL AND event_id IS NULL AND dept_id IS NULL AND service_id IS NULL) OR
        (org_id IS NULL AND event_id IS NOT NULL AND dept_id IS NULL AND service_id IS NULL) OR
        (org_id IS NULL AND event_id IS NULL AND dept_id IS NOT NULL AND service_id IS NULL) OR
        (org_id IS NULL AND event_id IS NULL AND dept_id IS NULL AND service_id IS NOT NULL) OR
        (org_id IS NULL AND event_id IS NULL AND dept_id IS NULL AND service_id IS NULL) -- Global Role
    )
);

-- 7. AUDIT LOGGING
-- ==================================================================================

-- Table: sps_audit_logs
-- Immutable history of actions
CREATE TABLE sps_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES sps_organizations(id),
    
    actor_user_id UUID REFERENCES sps_users(id), -- Who did it
    action VARCHAR(100) NOT NULL, -- "CREATE_EVENT", "DELETE_DEVICE_PROVISION"
    
    target_resource VARCHAR(50), -- "event", "device"
    target_id VARCHAR(100), -- UUID or ID of the object
    
    changes JSONB, -- Diff { "old": ..., "new": ... }
    ip_address VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. INDEXES FOR PERFORMANCE
-- ==================================================================================
CREATE INDEX idx_users_org ON sps_users(organization_id);
CREATE INDEX idx_events_org ON sps_events(organization_id);
CREATE INDEX idx_depts_event ON sps_departments(event_id);
CREATE INDEX idx_services_dept ON sps_services(department_id);
CREATE INDEX idx_devices_service ON sps_devices(service_id);
CREATE INDEX idx_role_assign_user ON sps_role_assignments(user_id);
CREATE INDEX idx_audit_org_date ON sps_audit_logs(organization_id, created_at DESC);

-- 9. SEED DATA (BOOTSTRAP)
-- ==================================================================================

-- 1. Create Main Provider Organization
INSERT INTO sps_organizations (id, name, slug, code, type) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Sustain Pro', 'sustain-pro', 'SPS-ORG-000', 'PROVIDER');

-- 1b. Create Default System Settings
INSERT INTO sps_system_settings (
    id, category, site_title, site_logo, maintenance_mode, default_timezone,
    account_lock_duration_minutes, token_expire_minutes, max_login_attempts,
    session_timeout_enabled, support_email, support_phone, global_alert_message
) VALUES (
    'sps_main_config', 'global', 'SustainPro', NULL, false, 'Asia/Colombo',
    15, 60, 5, true,
    'help@sps.com', '+94 11 234 5678',
    NULL
);

-- 2. Create Default Service Definitions
INSERT INTO sps_service_definitions (name, code_key, description, config_schema) VALUES
('Water Wall Monitor', 'SVC_WATER_WALL', 'Monitor water flow and quality in real-time', '{"thresholds": {"flow": "number", "ph": "number"}}'),
('AI Crowd Counter', 'SVC_AI_CROWD', 'Computer vision based people counting', '{"camera_ip": "string", "max_capacity": "number"}'),
('Utility Energy Tracker', 'SVC_ENERGY_TRACK', 'Smart meter reading and anomaly detection', '{"voltage_limit": "number"}');

-- 3. Create Super Admin User (Password: admin123)
-- Note: In production hashing is done by app, here we put a placeholder or known hash
    INSERT INTO sps_users (id, organization_id, email, password_hash, full_name, is_super_admin, code, timezone)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'elcoanlanka@gmail.com',
    '$argon2id$v=19$m=65536,t=3,p=4$WqMQDbB2v4lkpAprHRq2tg$O/PxCVphD7FwSW7TD8uaLSxf+AH6LlCUzmG7lO4b0U4', 
    'Platform Admin',
    TRUE,
    'SPS-USR-000',
    'Asia/Colombo'
);

-- 4. Assign SUPER_ADMIN Role to Platform Owner
INSERT INTO sps_role_assignments (user_id, role, org_id)
VALUES ('22222222-2222-2222-2222-222222222222', 'SUPER_ADMIN', NULL);


-- ==================================================================================
-- SAMPLE DATA
-- ==================================================================================

-- SustainPro Sample Data Script
-- This script populates the database with test data for development and testing

-- ============================================================================
-- 1. ORGANIZATIONS
-- ============================================================================

INSERT INTO sps_organizations (id, name, slug, code, type, description, logo_url, subscription_status, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'ACME Corporation', 'acme-corporation', 'SPS-ORG-001', 'CLIENT', 'Leading technology and innovation company', 'https://via.placeholder.com/200x200?text=ACME', 'ACTIVE', NOW()),
('22222222-2222-2222-2222-222222222222', 'TechFlow Inc', 'techflow-inc', 'SPS-ORG-002', 'CLIENT', 'Smart solutions provider', 'https://via.placeholder.com/200x200?text=TechFlow', 'ACTIVE', NOW());

-- ============================================================================
-- 2. USERS
-- ============================================================================

-- Password for all users: bcrypt hashed with 10 rounds
-- Admin@123    -> $2a$10$HHp4Drw7D0kF5KUWsWlRfeC8Bn1DKerszLUB2w9KoTwdHOVRCYqJy
-- Manager@123  -> $2a$10$Rxh1QEmmW6hRTZXlY0bueO0qjHdj4CCSU4Z18nVHyd705ugq93vay
-- Operator@123 -> $2a$10$lkzahX92mr1Df05u.fECReE7lyhnemgsqMVporIV0nQrkEICj54te

INSERT INTO sps_users (id, email, password_hash, full_name, organization_id, code, is_active, created_at) VALUES
-- Admin user (password: Admin@123)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@acme.com', '$2a$10$HHp4Drw7D0kF5KUWsWlRfeC8Bn1DKerszLUB2w9KoTwdHOVRCYqJy', 'John Admin', '11111111-1111-1111-1111-111111111111', 'USR-001', true, NOW()),

-- Manager user (password: Manager@123)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager@acme.com', '$2a$10$Rxh1QEmmW6hRTZXlY0bueO0qjHdj4CCSU4Z18nVHyd705ugq93vay', 'Jane Manager', '11111111-1111-1111-1111-111111111111', 'USR-002', true, NOW()),

-- Operator user (password: Operator@123)
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'operator@acme.com', '$2a$10$lkzahX92mr1Df05u.fECReE7lyhnemgsqMVporIV0nQrkEICj54te', 'Bob Operator', '11111111-1111-1111-1111-111111111111', 'USR-003', true, NOW()),

-- TechFlow user (password: Admin@123)
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'admin@techflow.com', '$2a$10$HHp4Drw7D0kF5KUWsWlRfeC8Bn1DKerszLUB2w9KoTwdHOVRCYqJy', 'Alice Smith', '22222222-2222-2222-2222-222222222222', 'USR-004', true, NOW());

-- ============================================================================
-- 3. PERMISSIONS
-- ============================================================================

INSERT INTO sps_permissions (id, code, name, module, description) VALUES
(uuid_generate_v4(), 'users:view', 'View Users', 'Users', 'View users list and details'),
(uuid_generate_v4(), 'users:create', 'Create Users', 'Users', 'Create new users'),
(uuid_generate_v4(), 'users:update', 'Update Users', 'Users', 'Modify user details'),
(uuid_generate_v4(), 'users:delete', 'Delete Users', 'Users', 'Remove users'),
(uuid_generate_v4(), 'organizations:view', 'View Organizations', 'Organizations', 'View organizations'),
(uuid_generate_v4(), 'organizations:update', 'Update Organizations', 'Organizations', 'Modify organizations'),
(uuid_generate_v4(), 'events:view', 'View Events', 'Events', 'View events'),
(uuid_generate_v4(), 'events:create', 'Create Events', 'Events', 'Create new events'),
(uuid_generate_v4(), 'events:update', 'Update Events', 'Events', 'Modify events'),
(uuid_generate_v4(), 'events:delete', 'Delete Events', 'Events', 'Delete events'),
(uuid_generate_v4(), 'departments:view', 'View Departments', 'Departments', 'View departments'),
(uuid_generate_v4(), 'departments:create', 'Create Departments', 'Departments', 'Create departments'),
(uuid_generate_v4(), 'departments:update', 'Update Departments', 'Departments', 'Modify departments'),
(uuid_generate_v4(), 'departments:delete', 'Delete Departments', 'Departments', 'Delete departments'),
(uuid_generate_v4(), 'devices:view', 'View Devices', 'Devices', 'View device inventory'),
(uuid_generate_v4(), 'devices:provision', 'Provision Devices', 'Devices', 'Add and setup devices'),
(uuid_generate_v4(), 'devices:update', 'Update Devices', 'Devices', 'Modify devices'),
(uuid_generate_v4(), 'devices:delete', 'Delete Devices', 'Devices', 'Remove devices'),
(uuid_generate_v4(), 'telemetry:view', 'View Telemetry', 'Telemetry', 'View telemetry data');

-- ============================================================================
-- 4. ROLES (from RBAC system)
-- ============================================================================

-- Note: Role IDs should match the roles defined in your backend RBAC system
-- These are example UUIDs - adjust based on your actual role IDs

-- ============================================================================
-- 5. EVENTS
-- ============================================================================

INSERT INTO sps_events (id, organization_id, name, description, location, start_date, end_date, status, created_at) VALUES
('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Tech Summit 2026', 'Annual technology conference and exhibition', 'Convention Center, San Francisco', '2026-06-15 09:00:00+00', '2026-06-17 18:00:00+00', 'ACTIVE', NOW()),
('e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Product Launch 2026', 'New product line launch event', 'Innovation Hub, New York', '2026-08-20 10:00:00+00', '2026-08-20 16:00:00+00', 'PLANNING', NOW()),
('e3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'TechFlow Expo', 'Smart solutions showcase', 'Tech Park, Austin', '2026-09-10 08:00:00+00', '2026-09-12 20:00:00+00', 'PLANNING', NOW());

-- ============================================================================
-- 6. DEPARTMENTS
-- ============================================================================

INSERT INTO sps_departments (id, event_id, name, head_user_id, created_at) VALUES
('d1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'Operations', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),
('d2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'Security', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW()),
('d3333333-3333-3333-3333-333333333333', 'e1111111-1111-1111-1111-111111111111', 'Maintenance', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW()),
('d4444444-4444-4444-4444-444444444444', 'e2222222-2222-2222-2222-222222222222', 'Staging', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW());

-- ============================================================================
-- 7. DEVICE MODELS
-- ============================================================================

INSERT INTO sps_device_models (id, name, description, parameters, created_by, created_at) VALUES
('ENERGY_MONITOR_V2', 'Energy Monitor v2', 'Advanced energy consumption monitoring device', 
'[
  {"key": "voltage", "name": "Voltage", "unit": "V", "type": "number"},
  {"key": "current", "name": "Current", "unit": "A", "type": "number"},
  {"key": "power", "name": "Power", "unit": "W", "type": "number"},
  {"key": "energy", "name": "Energy", "unit": "kWh", "type": "number"},
  {"key": "frequency", "name": "Frequency", "unit": "Hz", "type": "number"}
]'::jsonb, 'system', NOW()),

('WATER_FLOW_SENSOR', 'Water Flow Sensor', 'Water consumption and flow rate monitoring', 
'[
  {"key": "flow_rate", "name": "Flow Rate", "unit": "L/min", "type": "number"},
  {"key": "total_volume", "name": "Total Volume", "unit": "L", "type": "number"},
  {"key": "pressure", "name": "Pressure", "unit": "bar", "type": "number"},
  {"key": "temperature", "name": "Temperature", "unit": "°C", "type": "number"}
]'::jsonb, 'system', NOW()),

('TEMP_SENSOR_PRO', 'Temperature Sensor Pro', 'High-precision temperature and humidity monitoring', 
'[
  {"key": "temperature", "name": "Temperature", "unit": "°C", "type": "number"},
  {"key": "humidity", "name": "Humidity", "unit": "%", "type": "number"},
  {"key": "dew_point", "name": "Dew Point", "unit": "°C", "type": "number"},
  {"key": "heat_index", "name": "Heat Index", "unit": "°C", "type": "number"}
]'::jsonb, 'system', NOW()),

('AIR_QUALITY_MONITOR', 'Air Quality Monitor', 'Indoor air quality monitoring system', 
'[
  {"key": "pm25", "name": "PM2.5", "unit": "μg/m³", "type": "number"},
  {"key": "pm10", "name": "PM10", "unit": "μg/m³", "type": "number"},
  {"key": "co2", "name": "CO2", "unit": "ppm", "type": "number"},
  {"key": "voc", "name": "VOC", "unit": "ppb", "type": "number"},
  {"key": "aqi", "name": "AQI", "unit": "", "type": "number"}
]'::jsonb, 'system', NOW());

-- ============================================================================
-- 8. DEVICES
-- ============================================================================

INSERT INTO sps_devices (id, organization_id, device_code, api_key, name, type, status, last_seen, metadata, created_at) VALUES
-- Tech Summit 2026 Devices
(1, '11111111-1111-1111-1111-111111111111', 'ENERGY-001', 'api_key_energy_001_' || md5(random()::text), 'Main Hall Energy Monitor', 'ENERGY_MONITOR_V2', 'active', NOW() - INTERVAL '5 minutes', '{"location": "Main Hall"}'::jsonb, NOW()),
(2, '11111111-1111-1111-1111-111111111111', 'WATER-001', 'api_key_water_001_' || md5(random()::text), 'North Wing Water Flow', 'WATER_FLOW_SENSOR', 'active', NOW() - INTERVAL '3 minutes', '{"location": "North Wing"}'::jsonb, NOW()),
(3, '11111111-1111-1111-1111-111111111111', 'TEMP-001', 'api_key_temp_001_' || md5(random()::text), 'Conference Room A Temp', 'TEMP_SENSOR_PRO', 'active', NOW() - INTERVAL '2 minutes', '{"location": "Conference Room A"}'::jsonb, NOW()),
(4, '11111111-1111-1111-1111-111111111111', 'AIR-001', 'api_key_air_001_' || md5(random()::text), 'Main Hall Air Quality', 'AIR_QUALITY_MONITOR', 'active', NOW() - INTERVAL '1 minute', '{"location": "Main Hall"}'::jsonb, NOW()),
(5, '11111111-1111-1111-1111-111111111111', 'TEMP-002', 'api_key_temp_002_' || md5(random()::text), 'Security Office Temp', 'TEMP_SENSOR_PRO', 'active', NOW() - INTERVAL '4 minutes', '{"location": "Security Office"}'::jsonb, NOW()),

-- Product Launch 2026 Devices
(6, '11111111-1111-1111-1111-111111111111', 'ENERGY-002', 'api_key_energy_002_' || md5(random()::text), 'Stage Energy Monitor', 'ENERGY_MONITOR_V2', 'active', NOW() - INTERVAL '10 minutes', '{"location": "Stage"}'::jsonb, NOW()),
(7, '11111111-1111-1111-1111-111111111111', 'TEMP-003', 'api_key_temp_003_' || md5(random()::text), 'Backstage Temperature', 'TEMP_SENSOR_PRO', 'active', NOW() - INTERVAL '6 minutes', '{"location": "Backstage"}'::jsonb, NOW()),

-- TechFlow Expo Devices
(8, '22222222-2222-2222-2222-222222222222', 'ENERGY-003', 'api_key_energy_003_' || md5(random()::text), 'Booth 1 Energy Monitor', 'ENERGY_MONITOR_V2', 'active', NOW() - INTERVAL '15 minutes', '{"location": "Booth 1"}'::jsonb, NOW()),
(9, '22222222-2222-2222-2222-222222222222', 'AIR-002', 'api_key_air_002_' || md5(random()::text), 'Exhibition Hall Air', 'AIR_QUALITY_MONITOR', 'active', NOW() - INTERVAL '8 minutes', '{"location": "Exhibition Hall"}'::jsonb, NOW());

-- ============================================================================
-- 9. SERVICE TEMPLATES
-- ============================================================================

INSERT INTO sps_service_templates (id, name, description, scope, config, is_public_dashboard_supported, main_dashboard_layout, created_at) VALUES
(uuid_generate_v4(), 'Energy Monitoring', 'Real-time energy consumption tracking and analytics', 'GLOBAL', 
'{"refresh_interval": 30, "alert_threshold": 1000}'::jsonb,
true,
'{"widgets": [{"type": "line_chart", "title": "Power Consumption"}, {"type": "gauge", "title": "Current Load"}]}'::jsonb,
NOW()),

(uuid_generate_v4(), 'Environmental Monitoring', 'Temperature, humidity, and air quality tracking', 'GLOBAL',
'{"refresh_interval": 60, "temp_unit": "celsius"}'::jsonb,
true,
'{"widgets": [{"type": "multi_line", "title": "Temperature & Humidity"}, {"type": "aqi_gauge", "title": "Air Quality"}]}'::jsonb,
NOW()),

(uuid_generate_v4(), 'Water Management', 'Water flow and consumption monitoring', 'GLOBAL',
'{"refresh_interval": 45, "volume_unit": "liters"}'::jsonb,
true,
'{"widgets": [{"type": "area_chart", "title": "Water Usage"}, {"type": "counter", "title": "Total Volume"}]}'::jsonb,
NOW());

-- ============================================================================
-- 10. SYSTEM SETTINGS (Already inserted in main schema section)
-- ============================================================================

-- ============================================================================
-- 11. ALERT RULES
-- ============================================================================

INSERT INTO sps_alert_rules (id, organization_id, name, device_type, condition, severity, is_active, created_at) VALUES
(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'High Power Consumption', 'ENERGY_MONITOR_V2', 
'{"parameter": "power", "operator": ">", "value": 5000}'::jsonb, 'HIGH', true, NOW()),

(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'High Temperature', 'TEMP_SENSOR_PRO',
'{"parameter": "temperature", "operator": ">", "value": 30}'::jsonb, 'MEDIUM', true, NOW()),

(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Poor Air Quality', 'AIR_QUALITY_MONITOR',
'{"parameter": "aqi", "operator": ">", "value": 150}'::jsonb, 'HIGH', true, NOW()),

(uuid_generate_v4(), '22222222-2222-2222-2222-222222222222', 'Water Leak Detection', 'WATER_FLOW_SENSOR',
'{"parameter": "flow_rate", "operator": ">", "value": 100}'::jsonb, 'CRITICAL', true, NOW());

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to verify data was inserted

-- SELECT 'Organizations', COUNT(*) FROM sps_organizations
-- UNION ALL SELECT 'Users', COUNT(*) FROM sps_users
-- UNION ALL SELECT 'Events', COUNT(*) FROM sps_events
-- UNION ALL SELECT 'Departments', COUNT(*) FROM sps_departments
-- UNION ALL SELECT 'Device Models', COUNT(*) FROM sps_device_models
-- UNION ALL SELECT 'Devices', COUNT(*) FROM sps_devices
-- UNION ALL SELECT 'Permissions', COUNT(*) FROM sps_permissions
-- UNION ALL SELECT 'System Settings', COUNT(*) FROM sps_system_settings
-- UNION ALL SELECT 'Alert Rules', COUNT(*) FROM sps_alert_rules;

COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Sample data loaded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Users:';
  RAISE NOTICE '  Admin:    admin@acme.com / Admin@123';
  RAISE NOTICE '  Manager:  manager@acme.com / Manager@123';
  RAISE NOTICE '  Operator: operator@acme.com / Operator@123';
  RAISE NOTICE '';
  RAISE NOTICE 'Organizations: ACME Corporation, TechFlow Inc';
  RAISE NOTICE 'Events: 3 events created';
  RAISE NOTICE 'Devices: 9 IoT devices registered';
END $$;

