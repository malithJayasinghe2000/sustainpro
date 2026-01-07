-- Migration: Add Department Templates Table
-- Created: 2026-01-01
-- Description: Adds organization-level department templates for reuse across events

-- Create department templates table
CREATE TABLE IF NOT EXISTS sps_department_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES sps_organizations(id) ON DELETE CASCADE, -- NULL = Global/Platform template
    
    -- Template identification
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- lucide-react icon name (e.g., 'Shield', 'Heart', 'Zap')
    color VARCHAR(20), -- HEX color for UI branding (e.g., '#3B82F6')
    
    -- Default configuration (optional metadata)
    suggested_services JSONB DEFAULT '[]'::jsonb, -- Array of service_definition_ids
    required_roles JSONB DEFAULT '[]'::jsonb, -- ["SECURITY_CHIEF", "MEDIC"]
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    
    -- Note: No unique constraint on (organization_id, name) because NULL organization_id
    -- represents global templates, and multiple global templates can have same name
);

-- Create indexes for performance
CREATE INDEX idx_dept_templates_org ON sps_department_templates(organization_id);
CREATE INDEX idx_dept_templates_active ON sps_department_templates(is_active);

-- Add comment
COMMENT ON TABLE sps_department_templates IS 'Reusable department templates at organization level';
