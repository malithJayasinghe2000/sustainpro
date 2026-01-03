-- Migration: Add department service devices table
-- This table links devices to department service instances

CREATE TABLE IF NOT EXISTS sps_department_service_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_service_id UUID NOT NULL REFERENCES sps_department_services(id) ON DELETE CASCADE,
    device_id INTEGER NOT NULL REFERENCES sps_devices(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'primary', -- e.g., 'primary', 'backup', 'sensor_1'
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department_service_id, device_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dept_service_devices_dept_service ON sps_department_service_devices(department_service_id);
CREATE INDEX IF NOT EXISTS idx_dept_service_devices_device ON sps_department_service_devices(device_id);

-- Add comment
COMMENT ON TABLE sps_department_service_devices IS 'Links devices to department service instances for monitoring';
