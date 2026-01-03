-- Add support for multiple dashboard templates
ALTER TABLE sps_service_templates 
ADD COLUMN IF NOT EXISTS main_dashboard_layout JSONB DEFAULT '{"widgets": []}'::jsonb,
ADD COLUMN IF NOT EXISTS public_dashboard_layout JSONB DEFAULT '{"widgets": []}'::jsonb;
