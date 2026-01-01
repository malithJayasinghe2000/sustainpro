-- 1. Create Permissions Table
CREATE TABLE IF NOT EXISTS sps_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g. 'events:create'
    name VARCHAR(100) NOT NULL,        -- e.g. 'Create Events'
    module VARCHAR(50) NOT NULL,       -- e.g. 'Event Management'
    description TEXT
);

-- 2. Create Role-Permissions Mapping Table
CREATE TABLE IF NOT EXISTS sps_role_permissions (
    role_code VARCHAR(50) NOT NULL,      -- e.g. 'ORG_ADMIN'
    permission_code VARCHAR(100) NOT NULL REFERENCES sps_permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_code, permission_code)
);

-- 3. Seed Initial Permissions
INSERT INTO sps_permissions (code, name, module, description) VALUES
-- Event Management
('events:view', 'View Events', 'Events', 'View list and details of events'),
('events:create', 'Create Events', 'Events', 'Create new events'),
('events:edit', 'Edit Events', 'Events', 'Modify event details'),
('events:delete', 'Delete Events', 'Events', 'Remove events permanently'),
('events:manage_manager', 'Manage Event Manager', 'Events', 'Assign managers to events'),

-- User Management
('users:view', 'View Users', 'Users', 'View list and profiles of users'),
('users:create', 'Create Users', 'Users', 'Invite or create new users'),
('users:edit', 'Edit Users', 'Users', 'Modify user details and roles'),
('users:delete', 'Delete Users', 'Users', 'Remove users'),

-- Organizational
('org:settings', 'Manage Settings', 'Organization', 'Manage main organization settings'),
('reports:view', 'View Reports', 'Reports', 'Access system reports and analytics'),

-- Devices
('devices:view', 'View Devices', 'Devices', 'View device inventory'),
('devices:provision', 'Provision Devices', 'Devices', 'Add and setup new devices'),
('devices:control', 'Control Devices', 'Devices', 'Execute remote commands')

ON CONFLICT (code) DO NOTHING;

-- 4. Seed Default Mappings (Backward Compatibility)

-- ORG_ADMIN: Gets everything related to their Org
INSERT INTO sps_role_permissions (role_code, permission_code)
SELECT 'ORG_ADMIN', code FROM sps_permissions
ON CONFLICT DO NOTHING;

-- EVENT_MANAGER: Event specific + limited user actions
INSERT INTO sps_role_permissions (role_code, permission_code) VALUES
('EVENT_MANAGER', 'events:view'),
('EVENT_MANAGER', 'events:edit'),
('EVENT_MANAGER', 'devices:view'),
('EVENT_MANAGER', 'devices:control'),
('EVENT_MANAGER', 'reports:view')
ON CONFLICT DO NOTHING;

-- VIEWER: Read-only
INSERT INTO sps_role_permissions (role_code, permission_code) VALUES
('VIEWER', 'events:view'),
('VIEWER', 'devices:view'),
('VIEWER', 'reports:view')
ON CONFLICT DO NOTHING;
