-- Migration: Add enhanced alert rules fields
-- Run this migration to add new fields for the alert management system

-- Add new columns to sps_alert_rules table
ALTER TABLE sps_alert_rules
ADD COLUMN IF NOT EXISTS device_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS cooldown_seconds INT DEFAULT 300,
ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trigger_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES sps_events(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES sps_department_services(id) ON DELETE CASCADE;

-- Update severity column to allow more values
ALTER TABLE sps_alert_rules 
ALTER COLUMN severity TYPE VARCHAR(50);

-- Update name column to allow longer names
ALTER TABLE sps_alert_rules 
ALTER COLUMN name TYPE VARCHAR(255);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_alert_rules_org ON sps_alert_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_service ON sps_alert_rules(service_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_event ON sps_alert_rules(event_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON sps_alert_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON sps_alert_rules(severity);

-- Add comment
COMMENT ON TABLE sps_alert_rules IS 'Alert rules for IoT device monitoring - triggers notifications when conditions are met';
COMMENT ON COLUMN sps_alert_rules.condition IS 'JSON condition with metric, operator, and threshold';
COMMENT ON COLUMN sps_alert_rules.actions IS 'Array of actions to execute when rule triggers (alert, email, webhook, etc.)';
COMMENT ON COLUMN sps_alert_rules.priority IS 'Rule priority for evaluation order (lower = higher priority)';
COMMENT ON COLUMN sps_alert_rules.cooldown_seconds IS 'Minimum seconds between consecutive triggers';
COMMENT ON COLUMN sps_alert_rules.trigger_count IS 'Number of times this rule has been triggered';
