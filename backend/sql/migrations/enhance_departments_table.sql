-- Add rich fields to sps_departments to match template capabilities
ALTER TABLE sps_departments
ADD COLUMN description TEXT,
ADD COLUMN icon VARCHAR(50) DEFAULT 'Layers',
ADD COLUMN color VARCHAR(20) DEFAULT '#3B82F6',
ADD COLUMN template_origin_id UUID; -- Optional: to track which template it came from

COMMENT ON COLUMN sps_departments.template_origin_id IS 'ID of the template used to create this department';
