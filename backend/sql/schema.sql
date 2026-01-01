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
VALUES ('11111111-1111-1111-1111-111111111111', 'Sustain Pro', 'sustain-pro', 'SPS-ORG-000', 'PROVIDER');

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
