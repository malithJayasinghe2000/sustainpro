-- =============================================
-- ENHANCED SERVICE CREATION MIGRATION
-- =============================================
-- Adds support for:
-- 1. Service image (image_url)
-- 2. Service type (GLOBAL/INTERNAL)
-- 3. Device dashboard layout
-- 4. Service-level aggregation parameters
-- 5. Enhanced device model linking (role, min/max devices)
-- 6. Device model icon

-- =============================================
-- 1. ENHANCE sps_service_templates
-- =============================================

-- Add image_url for service branding
ALTER TABLE sps_service_templates
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add service_type (GLOBAL = any org can use, INTERNAL = only sustainpro)
ALTER TABLE sps_service_templates
ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) DEFAULT 'GLOBAL';

-- Add has_public_dashboard flag (distinct from is_public)
ALTER TABLE sps_service_templates
ADD COLUMN IF NOT EXISTS has_public_dashboard BOOLEAN DEFAULT false;

-- Add service_parameters for aggregation definitions
-- Format: [{ key: "total_liters", name: "Total Liters", icon: "droplet", 
--            dataType: "number", unit: "L", aggregation: "SUM", sourceParam: "liters" }]
ALTER TABLE sps_service_templates
ADD COLUMN IF NOT EXISTS service_parameters JSONB DEFAULT '[]'::jsonb;

-- Add device_dashboard_layout (separate from main_dashboard_layout for individual device view)
ALTER TABLE sps_service_templates
ADD COLUMN IF NOT EXISTS device_dashboard_layout JSONB DEFAULT '{"widgets": []}'::jsonb;

-- Add created_by reference to track who created the template
ALTER TABLE sps_service_templates
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES sps_users(id);

-- Rename main_dashboard_layout to service_dashboard_layout for clarity (if it exists)
-- Note: We keep main_dashboard_layout for backward compatibility and add alias
-- ALTER TABLE sps_service_templates 
-- RENAME COLUMN main_dashboard_layout TO service_dashboard_layout;

-- =============================================
-- 2. ENHANCE sps_service_device_models
-- =============================================

-- Add role field (primary, secondary, optional)
ALTER TABLE sps_service_device_models
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'primary';

-- Add min_devices constraint
ALTER TABLE sps_service_device_models
ADD COLUMN IF NOT EXISTS min_devices INTEGER DEFAULT 1;

-- Note: max_devices already exists in the schema

-- =============================================
-- 3. ENHANCE sps_device_models
-- =============================================

-- Add icon field for UI display
ALTER TABLE sps_device_models
ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

-- =============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_service_templates_type 
ON sps_service_templates(service_type);

CREATE INDEX IF NOT EXISTS idx_service_templates_active 
ON sps_service_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_service_templates_public_dashboard 
ON sps_service_templates(has_public_dashboard);

-- =============================================
-- 5. UPDATE EXISTING RECORDS WITH DEFAULTS
-- =============================================

-- Set default service_type for existing records
UPDATE sps_service_templates 
SET service_type = 'GLOBAL' 
WHERE service_type IS NULL;

-- Initialize device_dashboard_layout for existing records
UPDATE sps_service_templates 
SET device_dashboard_layout = '{"widgets": []}'::jsonb 
WHERE device_dashboard_layout IS NULL;

-- Initialize service_parameters for existing records
UPDATE sps_service_templates 
SET service_parameters = '[]'::jsonb 
WHERE service_parameters IS NULL;

-- Set has_public_dashboard based on existing is_public flag
UPDATE sps_service_templates 
SET has_public_dashboard = COALESCE(is_public, false)
WHERE has_public_dashboard IS NULL;
