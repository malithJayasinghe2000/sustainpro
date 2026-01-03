-- Migration: Add department services table
-- This table links departments to service templates

CREATE TABLE IF NOT EXISTS sps_department_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES sps_departments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES sps_service_templates(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department_id, service_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dept_services_dept ON sps_department_services(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_services_service ON sps_department_services(service_id);

-- Add comment
COMMENT ON TABLE sps_department_services IS 'Links departments to service templates with configuration';
