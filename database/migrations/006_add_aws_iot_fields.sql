-- Migration: Add AWS IoT Core fields to devices table
-- Purpose: Store AWS Thing name, certificate details, and provisioning status

-- Add AWS IoT fields to sps_devices
ALTER TABLE sps_devices 
ADD COLUMN IF NOT EXISTS aws_thing_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS aws_certificate_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS aws_certificate_arn TEXT,
ADD COLUMN IF NOT EXISTS aws_provisioned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS aws_certificate_status VARCHAR(50) DEFAULT 'PENDING';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_devices_aws_thing_name ON sps_devices(aws_thing_name);
CREATE INDEX IF NOT EXISTS idx_devices_aws_certificate_id ON sps_devices(aws_certificate_id);

-- Add comments for documentation
COMMENT ON COLUMN sps_devices.aws_thing_name IS 'AWS IoT Thing name (usually same as device_code)';
COMMENT ON COLUMN sps_devices.aws_certificate_id IS 'AWS IoT certificate ID';
COMMENT ON COLUMN sps_devices.aws_certificate_arn IS 'AWS IoT certificate ARN';
COMMENT ON COLUMN sps_devices.aws_provisioned_at IS 'Timestamp when device was provisioned to AWS IoT Core';
COMMENT ON COLUMN sps_devices.aws_certificate_status IS 'Certificate status: PENDING, ACTIVE, INACTIVE, REVOKED';
