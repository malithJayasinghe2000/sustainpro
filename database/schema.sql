-- ==================================================================================
-- SustainPro Enterprise - Complete Database Schema
-- Version: 3.0.0 (Microservices Architecture)
-- Hierarchy: Organization -> Event -> Department -> Service -> Device
-- Database: PostgreSQL 14+
-- ==================================================================================

-- Run this file to set up a fresh database:
-- psql -U postgres -d sustainpro -f schema.sql

-- ==================================================================================
-- 1. SETUP & EXTENSIONS
-- ==================================================================================

SET search_path TO public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================================
-- 2. DROP EXISTING TABLES (for fresh install)
-- ==================================================================================

DROP TABLE IF EXISTS sps_telemetry CASCADE;
DROP TABLE IF EXISTS sps_task_evidence CASCADE;
DROP TABLE IF EXISTS sps_tasks CASCADE;
DROP TABLE IF EXISTS sps_alerts CASCADE;
DROP TABLE IF EXISTS sps_alert_rules CASCADE;
DROP TABLE IF EXISTS sps_dashboard_templates CASCADE;
DROP TABLE IF EXISTS sps_audit_logs CASCADE;
DROP TABLE IF EXISTS sps_role_assignments CASCADE;
DROP TABLE IF EXISTS sps_role_permissions CASCADE;
DROP TABLE IF EXISTS sps_permissions CASCADE;
DROP TABLE IF EXISTS sps_department_service_devices CASCADE;
DROP TABLE IF EXISTS sps_department_services CASCADE;
DROP TABLE IF EXISTS sps_devices CASCADE;
DROP TABLE IF EXISTS sps_device_models CASCADE;
DROP TABLE IF EXISTS sps_service_device_models CASCADE;
DROP TABLE IF EXISTS sps_service_subscriptions CASCADE;
DROP TABLE IF EXISTS sps_service_templates CASCADE;
DROP TABLE IF EXISTS sps_services CASCADE;
DROP TABLE IF EXISTS sps_service_definitions CASCADE;
DROP TABLE IF EXISTS sps_departments CASCADE;
DROP TABLE IF EXISTS sps_department_templates CASCADE;
DROP TABLE IF EXISTS sps_events CASCADE;
DROP TABLE IF EXISTS sps_users CASCADE;
DROP TABLE IF EXISTS sps_organizations CASCADE;
DROP TABLE IF EXISTS sps_system_settings CASCADE;

-- ==================================================================================
-- 3. SYSTEM SETTINGS
-- ==================================================================================

CREATE TABLE sps_system_settings (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'sps_main_config',
    category VARCHAR(50) DEFAULT 'global',
    site_title VARCHAR(100) DEFAULT 'SustainPro',
    site_logo TEXT,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    default_timezone VARCHAR(100) DEFAULT 'Asia/Colombo',
    account_lock_duration_minutes INTEGER DEFAULT 30,
    token_expire_minutes INTEGER DEFAULT 60,
    max_login_attempts INTEGER DEFAULT 5,
    session_timeout_enabled BOOLEAN DEFAULT TRUE,
    support_email VARCHAR(255),
    support_phone VARCHAR(50),
    global_alert_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 4. ORGANIZATIONS
-- ==================================================================================

CREATE TABLE sps_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(50) DEFAULT 'CLIENT',
    description TEXT,
    industry VARCHAR(100),
    website VARCHAR(255),
    logo_url TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC',
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    phone VARCHAR(50),
    vat_id VARCHAR(50),
    billing_email VARCHAR(255),
    contact_email VARCHAR(255),
    plan_tier VARCHAR(50) DEFAULT 'BASIC',
    max_users INTEGER DEFAULT 5,
    max_devices INTEGER DEFAULT 10,
    subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
    theme_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 5. USERS
-- ==================================================================================

CREATE TABLE sps_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES sps_organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    is_super_admin BOOLEAN DEFAULT FALSE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 6. EVENTS
-- ==================================================================================

CREATE TABLE sps_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES sps_organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    location VARCHAR(255),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'PLANNING',
    description TEXT,
    event_type VARCHAR(50),
    image_url TEXT,
    coordinates JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 7. DEPARTMENT TEMPLATES
-- ==================================================================================

CREATE TABLE sps_department_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES sps_organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    suggested_services JSONB DEFAULT '[]'::jsonb,
    required_roles JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 8. DEPARTMENTS
-- ==================================================================================

CREATE TABLE sps_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES sps_events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    head_user_id UUID REFERENCES sps_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 9. SERVICE TEMPLATES
-- ==================================================================================

CREATE TABLE sps_service_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'MONITORING',
    description TEXT,
    config_schema JSONB DEFAULT '{}'::jsonb,
    default_config JSONB DEFAULT '{}'::jsonb,
    main_dashboard_layout JSONB DEFAULT '{"widgets": []}'::jsonb,
    public_dashboard_layout JSONB DEFAULT '{"widgets": []}'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    required_permissions JSONB DEFAULT '[]'::jsonb,
    base_price DECIMAL(10,2) DEFAULT 0,
    price_per_device DECIMAL(10,2) DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 10. SERVICE SUBSCRIPTIONS
-- ==================================================================================

CREATE TABLE sps_service_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES sps_organizations(id) ON DELETE CASCADE,
    service_template_id UUID NOT NULL REFERENCES sps_service_templates(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    config_overrides JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, service_template_id)
);

-- ==================================================================================
-- 11. DEPARTMENT SERVICES
-- ==================================================================================

CREATE TABLE sps_department_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES sps_departments(id) ON DELETE CASCADE,
    service_template_id UUID NOT NULL REFERENCES sps_service_templates(id),
    name VARCHAR(100),
    config JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    assigned_supervisor_id UUID REFERENCES sps_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 12. DEVICE MODELS
-- ==================================================================================

CREATE TABLE sps_device_models (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parameters JSONB DEFAULT '[]'::jsonb,
    created_by VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 13. SERVICE DEVICE MODELS
-- ==================================================================================

CREATE TABLE sps_service_device_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_template_id UUID NOT NULL REFERENCES sps_service_templates(id) ON DELETE CASCADE,
    device_model_id VARCHAR(50) NOT NULL REFERENCES sps_device_models(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT FALSE,
    max_devices INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_template_id, device_model_id)
);

-- ==================================================================================
-- 14. DEVICES
-- ==================================================================================

CREATE TABLE sps_devices (
    id SERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES sps_organizations(id) ON DELETE CASCADE,
    service_id UUID REFERENCES sps_department_services(id) ON DELETE SET NULL,
    event_id UUID REFERENCES sps_events(id) ON DELETE SET NULL,
    device_code VARCHAR(50) UNIQUE NOT NULL,
    api_key VARCHAR(100) UNIQUE,
    name VARCHAR(100),
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'OFFLINE',
    last_seen TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 15. TELEMETRY
-- ==================================================================================

CREATE TABLE sps_telemetry (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES sps_devices(id) ON DELETE CASCADE,
    device_code VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL,
    event_id UUID,
    service_id UUID,
    data JSONB NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 16. RBAC
-- ==================================================================================

CREATE TABLE sps_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sps_role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL,
    permission_id UUID NOT NULL REFERENCES sps_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

CREATE TABLE sps_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES sps_users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES sps_organizations(id) ON DELETE CASCADE,
    event_id UUID REFERENCES sps_events(id) ON DELETE CASCADE,
    dept_id UUID REFERENCES sps_departments(id) ON DELETE CASCADE,
    service_id UUID REFERENCES sps_department_services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 17. ALERTS
-- ==================================================================================

CREATE TABLE sps_alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES sps_organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    condition JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'WARNING',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sps_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES sps_alert_rules(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES sps_organizations(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES sps_devices(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'WARNING',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    acknowledged_by UUID REFERENCES sps_users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 18. TASKS
-- ==================================================================================

CREATE TABLE sps_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES sps_organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES sps_departments(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(20) DEFAULT 'PENDING',
    assigned_to UUID REFERENCES sps_users(id),
    created_by UUID REFERENCES sps_users(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sps_task_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES sps_tasks(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    uploaded_by UUID REFERENCES sps_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 19. DASHBOARD TEMPLATES
-- ==================================================================================

CREATE TABLE sps_dashboard_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES sps_organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    layout JSONB NOT NULL DEFAULT '{"widgets": []}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES sps_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 20. AUDIT LOGS
-- ==================================================================================

CREATE TABLE sps_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES sps_organizations(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES sps_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_resource VARCHAR(50),
    target_id VARCHAR(100),
    changes JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================================================
-- 21. INDEXES
-- ==================================================================================

CREATE INDEX idx_users_org ON sps_users(organization_id);
CREATE INDEX idx_users_email ON sps_users(email);
CREATE INDEX idx_events_org ON sps_events(organization_id);
CREATE INDEX idx_events_status ON sps_events(status);
CREATE INDEX idx_depts_event ON sps_departments(event_id);
CREATE INDEX idx_dept_services_dept ON sps_department_services(department_id);
CREATE INDEX idx_devices_org ON sps_devices(organization_id);
CREATE INDEX idx_devices_service ON sps_devices(service_id);
CREATE INDEX idx_devices_code ON sps_devices(device_code);
CREATE INDEX idx_telemetry_device ON sps_telemetry(device_id);
CREATE INDEX idx_telemetry_org ON sps_telemetry(organization_id);
CREATE INDEX idx_telemetry_recorded ON sps_telemetry(recorded_at DESC);
CREATE INDEX idx_role_assign_user ON sps_role_assignments(user_id);
CREATE INDEX idx_audit_org_date ON sps_audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_alerts_org ON sps_alerts(organization_id);
CREATE INDEX idx_tasks_org ON sps_tasks(organization_id);
CREATE INDEX idx_dept_templates_org ON sps_department_templates(organization_id);

-- ==================================================================================
-- SCHEMA COMPLETE - Run seed-data.sql next
-- ==================================================================================

