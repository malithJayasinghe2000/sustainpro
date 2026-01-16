-- SustainPro Comprehensive Audit Log System Migration
-- This migration modifies the sps_audit_logs table to support comprehensive tracking

-- Step 1: Rename old table if it exists with data we want to preserve
-- (We'll migrate the data if needed)
ALTER TABLE sps_audit_logs RENAME TO sps_audit_logs_old;

-- Step 2: Create new comprehensive audit log table
CREATE TABLE sps_audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- === SOURCE IDENTIFICATION ===
    source_type VARCHAR(20) NOT NULL, -- USER, DEVICE, SYSTEM, API
    actor_user_id UUID NULL,
    actor_device_id INTEGER NULL,
    actor_device_code VARCHAR(50) NULL,
    actor_api_key_id UUID NULL,
    
    -- === CONTEXT (Multi-tenant & Hierarchical) ===
    organization_id UUID NULL,
    event_id UUID NULL,
    department_id UUID NULL,
    service_id UUID NULL,
    
    -- === ACTION DETAILS ===
    category VARCHAR(50) NOT NULL, -- AUTH, USER, ORGANIZATION, EVENT, DEPARTMENT, SERVICE, DEVICE, TELEMETRY, ALERT, TASK, SETTINGS, RBAC, API
    action VARCHAR(100) NOT NULL,
    sub_action VARCHAR(100) NULL,
    
    -- === TARGET RESOURCE ===
    target_resource VARCHAR(50) NULL,
    target_id VARCHAR(100) NULL,
    target_name VARCHAR(255) NULL,
    
    -- === CHANGE TRACKING ===
    old_values JSONB NULL,
    new_values JSONB NULL,
    changes JSONB NULL,
    
    -- === REQUEST CONTEXT ===
    ip_address VARCHAR(50) NULL,
    user_agent VARCHAR(500) NULL,
    request_method VARCHAR(10) NULL,
    request_path VARCHAR(500) NULL,
    request_id VARCHAR(100) NULL,
    
    -- === RESULT ===
    status VARCHAR(20) DEFAULT 'SUCCESS' NOT NULL,
    error_message TEXT NULL,
    error_code VARCHAR(50) NULL,
    
    -- === PERFORMANCE ===
    duration_ms INTEGER NULL,
    
    -- === METADATA ===
    metadata JSONB DEFAULT '{}',
    description TEXT NULL,
    
    -- === TIMESTAMPS ===
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- === FOREIGN KEYS ===
    CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) REFERENCES sps_users(id) ON UPDATE NO ACTION,
    CONSTRAINT fk_audit_org FOREIGN KEY (organization_id) REFERENCES sps_organizations(id) ON UPDATE NO ACTION
);

-- Step 3: Create indexes for efficient querying
CREATE INDEX idx_audit_org_date ON sps_audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_source ON sps_audit_logs (source_type);
CREATE INDEX idx_audit_category ON sps_audit_logs (category);
CREATE INDEX idx_audit_action ON sps_audit_logs (action);
CREATE INDEX idx_audit_user ON sps_audit_logs (actor_user_id);
CREATE INDEX idx_audit_device ON sps_audit_logs (actor_device_code);
CREATE INDEX idx_audit_event ON sps_audit_logs (event_id);
CREATE INDEX idx_audit_department ON sps_audit_logs (department_id);
CREATE INDEX idx_audit_service ON sps_audit_logs (service_id);
CREATE INDEX idx_audit_target ON sps_audit_logs (target_resource, target_id);
CREATE INDEX idx_audit_status ON sps_audit_logs (status);
CREATE INDEX idx_audit_created ON sps_audit_logs (created_at DESC);

-- Step 4: Migrate data from old table (if any exists)
INSERT INTO sps_audit_logs (
    id,
    source_type,
    actor_user_id,
    organization_id,
    category,
    action,
    target_resource,
    target_id,
    changes,
    ip_address,
    status,
    created_at
)
SELECT 
    id,
    'USER' as source_type, -- Default to USER for existing logs
    actor_user_id,
    organization_id,
    COALESCE(
        CASE 
            WHEN action LIKE '%LOGIN%' THEN 'AUTH'
            WHEN action LIKE '%USER%' THEN 'USER'
            WHEN action LIKE '%ORGANIZATION%' THEN 'ORGANIZATION'
            WHEN action LIKE '%EVENT%' THEN 'EVENT'
            WHEN action LIKE '%DEPARTMENT%' THEN 'DEPARTMENT'
            WHEN action LIKE '%DEVICE%' THEN 'DEVICE'
            ELSE 'SYSTEM'
        END,
        'SYSTEM'
    ) as category,
    action,
    target_resource,
    target_id,
    changes,
    ip_address,
    'SUCCESS' as status, -- Default to SUCCESS for existing logs
    COALESCE(created_at, now()) as created_at
FROM sps_audit_logs_old;

-- Step 5: Drop old table
DROP TABLE sps_audit_logs_old;

-- Optional: Add comment to table
COMMENT ON TABLE sps_audit_logs IS 'Centralized audit logging for all system activities - immutable record of all actions';
COMMENT ON COLUMN sps_audit_logs.source_type IS 'Who initiated the action: USER, DEVICE, SYSTEM, or API';
COMMENT ON COLUMN sps_audit_logs.category IS 'Category of action: AUTH, USER, ORGANIZATION, EVENT, DEPARTMENT, SERVICE, DEVICE, TELEMETRY, ALERT, TASK, SETTINGS, RBAC, API, REPORT, EXPORT, NOTIFICATION';
COMMENT ON COLUMN sps_audit_logs.status IS 'Result of the action: SUCCESS, FAILURE, or PARTIAL';
