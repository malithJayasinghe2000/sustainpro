-- Create sps_service_templates table
CREATE TABLE IF NOT EXISTS sps_service_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('GLOBAL', 'INTERNAL', 'ORG_SPECIFIC')),
    config JSONB DEFAULT '{}'::jsonb,
    is_public_dashboard_supported BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES sps_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sps_dashboard_templates table
CREATE TABLE IF NOT EXISTS sps_dashboard_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES sps_service_templates(id) ON DELETE CASCADE,
    layout JSONB NOT NULL DEFAULT '[]'::jsonb,
    widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id)
);

-- Create Junction table for Service -> Device Models
CREATE TABLE IF NOT EXISTS sps_service_device_models (
    service_id UUID REFERENCES sps_service_templates(id) ON DELETE CASCADE,
    device_model_id VARCHAR(50) REFERENCES sps_device_models(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'main', -- e.g. "Main Controller", "Sensor Node"
    min_count INTEGER DEFAULT 1,
    max_count INTEGER,
    PRIMARY KEY (service_id, device_model_id)
);

-- Create sps_service_subscriptions table (Multi-tenancy)
CREATE TABLE IF NOT EXISTS sps_service_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES sps_service_templates(id),
    organization_id UUID REFERENCES sps_organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED')),
    config_override JSONB DEFAULT '{}'::jsonb,
    valid_until TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES sps_users(id),
    UNIQUE(service_id, organization_id)
);

-- Comments
COMMENT ON TABLE sps_service_templates IS 'Definitions of reusable IoT services (e.g. Water Wall, Energy Monitor)';
COMMENT ON TABLE sps_dashboard_templates IS 'Default dashboard layout for a service';
COMMENT ON TABLE sps_service_subscriptions IS 'Links a service to an organization (Tenant), enabling access';
