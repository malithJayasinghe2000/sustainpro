-- Fix existing sps_department_templates table to allow global templates
-- This removes the NOT NULL constraint from organization_id

ALTER TABLE sps_department_templates 
ALTER COLUMN organization_id DROP NOT NULL;

-- Add comment to clarify the change
COMMENT ON COLUMN sps_department_templates.organization_id IS 'Organization ID. NULL = Global/Platform-wide template, Non-NULL = Organization-specific template';
