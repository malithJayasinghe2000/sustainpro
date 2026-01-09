-- =================================================================
-- RBAC SETUP SCRIPT for PgAdmin
-- Run this in the Query Tool to ensure all tables and defaults exist.
-- Compatible with the actual database schema
-- =================================================================

-- 1. Create Permissions Table (if not exists)
CREATE TABLE IF NOT EXISTS sps_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Role-Permissions Mapping Table (if not exists)
CREATE TABLE IF NOT EXISTS sps_role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL,
    permission_id UUID NOT NULL REFERENCES sps_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- 3. Seed Permissions (if not already populated)
INSERT INTO sps_permissions (name, code, description, category) VALUES
('View Dashboard', 'dashboard.view', 'View main dashboard', 'dashboard'),
('View Devices', 'devices.view', 'View device list', 'devices'),
('Manage Devices', 'devices.manage', 'Create, update, delete devices', 'devices'),
('View Events', 'events.view', 'View events', 'events'),
('Manage Events', 'events.manage', 'Create, update, delete events', 'events'),
('View Users', 'users.view', 'View user list', 'users'),
('Manage Users', 'users.manage', 'Create, update, delete users', 'users'),
('View Reports', 'reports.view', 'View analytics and reports', 'reports'),
('Manage Settings', 'settings.manage', 'Manage system settings', 'settings'),
('View Telemetry', 'telemetry.view', 'View telemetry data', 'telemetry'),
('Manage Alerts', 'alerts.manage', 'Create and manage alert rules', 'alerts')
ON CONFLICT (code) DO NOTHING;

-- 4. Seed Role Permissions

-- ORG_ADMIN gets all permissions
INSERT INTO sps_role_permissions (role, permission_id)
SELECT 'ORG_ADMIN', id FROM sps_permissions
ON CONFLICT DO NOTHING;

-- EVENT_MANAGER gets limited permissions
INSERT INTO sps_role_permissions (role, permission_id)
SELECT 'EVENT_MANAGER', id FROM sps_permissions 
WHERE code IN ('dashboard.view', 'events.view', 'events.manage', 'devices.view', 'reports.view', 'telemetry.view')
ON CONFLICT DO NOTHING;

-- DEPT_HEAD gets department-level permissions
INSERT INTO sps_role_permissions (role, permission_id)
SELECT 'DEPT_HEAD', id FROM sps_permissions 
WHERE code IN ('dashboard.view', 'events.view', 'devices.view', 'reports.view', 'telemetry.view')
ON CONFLICT DO NOTHING;

-- VIEWER gets read-only permissions
INSERT INTO sps_role_permissions (role, permission_id)
SELECT 'VIEWER', id FROM sps_permissions 
WHERE code IN ('dashboard.view', 'events.view', 'devices.view', 'reports.view', 'telemetry.view')
ON CONFLICT DO NOTHING;

-- 5. Verify Results
SELECT rp.role, p.code, p.name 
FROM sps_role_permissions rp 
JOIN sps_permissions p ON rp.permission_id = p.id 
ORDER BY rp.role, p.code;
