-- ==================================================================================
-- SustainPro Enterprise - Seed Data
-- Version: 3.0.0
-- Run after schema.sql
-- ==================================================================================

SET search_path TO public;

-- ==================================================================================
-- 1. SYSTEM SETTINGS
-- ==================================================================================

INSERT INTO sps_system_settings (id, category, site_title, default_timezone, support_email, support_phone)
VALUES ('sps_main_config', 'global', 'SustainPro', 'Asia/Colombo', 'support@sustainpro.io', '+94 11 234 5678')
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================
-- 2. PROVIDER ORGANIZATION
-- ==================================================================================

INSERT INTO sps_organizations (id, name, slug, code, type, description)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'SustainPro Platform',
    'sustainpro',
    'SPS-ORG-000',
    'PROVIDER',
    'SustainPro IoT Platform Provider'
) ON CONFLICT (id) DO NOTHING;

-- ==================================================================================
-- 3. DEMO CLIENT ORGANIZATION
-- ==================================================================================

INSERT INTO sps_organizations (id, name, slug, code, type, description, logo_url, plan_tier, max_users, max_devices)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'ACME Corporation',
    'acme-corporation',
    'SPS-ORG-001',
    'CLIENT',
    'Leading technology and innovation company',
    'https://via.placeholder.com/200x200?text=ACME',
    'ENTERPRISE',
    50,
    100
) ON CONFLICT (id) DO NOTHING;

-- ==================================================================================
-- 4. USERS (Password for all: Admin@123)
-- Hash generated with argon2id
-- ==================================================================================

-- Super Admin (Platform Owner)
INSERT INTO sps_users (id, organization_id, code, email, password_hash, full_name, is_super_admin, timezone)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    NULL,
    'SPS-USR-000',
    'superadmin@sustainpro.io',
    '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$Xq5qFNJZmVrIPJ5YLy9BHlqLMpKxz7dJ8/OKzZXwZ5w',
    'Platform Super Admin',
    TRUE,
    'UTC'
) ON CONFLICT (id) DO NOTHING;

-- Org Admin for ACME
INSERT INTO sps_users (id, organization_id, code, email, password_hash, full_name, is_super_admin, timezone)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'USR-001',
    'admin@acme.com',
    '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$Xq5qFNJZmVrIPJ5YLy9BHlqLMpKxz7dJ8/OKzZXwZ5w',
    'John Admin',
    FALSE,
    'UTC'
) ON CONFLICT (id) DO NOTHING;

-- Manager for ACME
INSERT INTO sps_users (id, organization_id, code, email, password_hash, full_name, is_super_admin, timezone)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'USR-002',
    'manager@acme.com',
    '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$Xq5qFNJZmVrIPJ5YLy9BHlqLMpKxz7dJ8/OKzZXwZ5w',
    'Jane Manager',
    FALSE,
    'UTC'
) ON CONFLICT (id) DO NOTHING;

-- Operator for ACME
INSERT INTO sps_users (id, organization_id, code, email, password_hash, full_name, is_super_admin, timezone)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'USR-003',
    'operator@acme.com',
    '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0c2FsdA$Xq5qFNJZmVrIPJ5YLy9BHlqLMpKxz7dJ8/OKzZXwZ5w',
    'Bob Operator',
    FALSE,
    'UTC'
) ON CONFLICT (id) DO NOTHING;

-- ==================================================================================
-- 5. EVENTS
-- ==================================================================================

INSERT INTO sps_events (id, organization_id, name, code, location, status, start_date, end_date, description)
VALUES (
    'e1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Tech Summit 2026',
    'EVT-001',
    'Convention Center',
    'ACTIVE',
    '2026-01-15',
    '2026-01-20',
    'Annual technology summit and exhibition'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sps_events (id, organization_id, name, code, location, status, start_date, end_date, description)
VALUES (
    'e2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Music Festival 2026',
    'EVT-002',
    'City Park',
    'PLANNING',
    '2026-06-01',
    '2026-06-03',
    'Summer music festival'
) ON CONFLICT (id) DO NOTHING;

-- ==================================================================================
-- 6. GLOBAL DEPARTMENT TEMPLATES
-- ==================================================================================

INSERT INTO sps_department_templates (id, organization_id, name, description, icon, color, is_active)
VALUES 
    (uuid_generate_v4(), NULL, 'Operations', 'General operations and logistics', 'Settings', '#3B82F6', true),
    (uuid_generate_v4(), NULL, 'Security', 'Security and access control', 'Shield', '#EF4444', true),
    (uuid_generate_v4(), NULL, 'Maintenance', 'Facility maintenance and repairs', 'Wrench', '#F59E0B', true),
    (uuid_generate_v4(), NULL, 'Medical', 'Medical and first aid services', 'Heart', '#EC4899', true),
    (uuid_generate_v4(), NULL, 'Catering', 'Food and beverage services', 'Utensils', '#10B981', true),
    (uuid_generate_v4(), NULL, 'Logistics', 'Transport and supply chain', 'Truck', '#8B5CF6', true);

-- ==================================================================================
-- 7. DEPARTMENTS
-- ==================================================================================

INSERT INTO sps_departments (id, event_id, name, description, icon, color, head_user_id)
VALUES (
    'd1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'Operations',
    'Main event operations',
    'Settings',
    '#3B82F6',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sps_departments (id, event_id, name, description, icon, color, head_user_id)
VALUES (
    'd2222222-2222-2222-2222-222222222222',
    'e1111111-1111-1111-1111-111111111111',
    'Security',
    'Event security',
    'Shield',
    '#EF4444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sps_departments (id, event_id, name, description, icon, color, head_user_id)
VALUES (
    'd3333333-3333-3333-3333-333333333333',
    'e1111111-1111-1111-1111-111111111111',
    'Maintenance',
    'Technical maintenance',
    'Wrench',
    '#F59E0B',
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
) ON CONFLICT (id) DO NOTHING;

-- ==================================================================================
-- 8. DEVICE MODELS
-- ==================================================================================

INSERT INTO sps_device_models (id, name, description, parameters, created_by) VALUES
('ENERGY_MONITOR_V2', 'Energy Monitor v2', 'Advanced energy consumption monitoring device', 
 '[{"key":"voltage","name":"Voltage","type":"number","unit":"V"},{"key":"current","name":"Current","type":"number","unit":"A"},{"key":"power","name":"Power","type":"number","unit":"W"},{"key":"energy","name":"Energy","type":"number","unit":"kWh"},{"key":"frequency","name":"Frequency","type":"number","unit":"Hz"}]', 
 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sps_device_models (id, name, description, parameters, created_by) VALUES
('WATER_FLOW_SENSOR', 'Water Flow Sensor', 'Water consumption and flow rate monitoring',
 '[{"key":"flow_rate","name":"Flow Rate","type":"number","unit":"L/min"},{"key":"total_volume","name":"Total Volume","type":"number","unit":"L"},{"key":"pressure","name":"Pressure","type":"number","unit":"bar"},{"key":"temperature","name":"Temperature","type":"number","unit":"°C"}]',
 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sps_device_models (id, name, description, parameters, created_by) VALUES
('TEMP_SENSOR_PRO', 'Temperature Sensor Pro', 'High-precision temperature and humidity monitoring',
 '[{"key":"temperature","name":"Temperature","type":"number","unit":"°C"},{"key":"humidity","name":"Humidity","type":"number","unit":"%"},{"key":"dew_point","name":"Dew Point","type":"number","unit":"°C"},{"key":"heat_index","name":"Heat Index","type":"number","unit":"°C"}]',
 'system')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sps_device_models (id, name, description, parameters, created_by) VALUES
('AIR_QUALITY_MONITOR', 'Air Quality Monitor', 'Indoor air quality monitoring system',
 '[{"key":"pm25","name":"PM2.5","type":"number","unit":"μg/m³"},{"key":"pm10","name":"PM10","type":"number","unit":"μg/m³"},{"key":"co2","name":"CO2","type":"number","unit":"ppm"},{"key":"voc","name":"VOC","type":"number","unit":"ppb"},{"key":"aqi","name":"AQI","type":"number","unit":""}]',
 'system')
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================
-- 9. SERVICE TEMPLATES
-- ==================================================================================

INSERT INTO sps_service_templates (id, name, code, category, description, is_public) VALUES
(uuid_generate_v4(), 'Energy Monitoring', 'SVC_ENERGY', 'MONITORING', 'Real-time energy consumption tracking and analytics', true),
(uuid_generate_v4(), 'Water Management', 'SVC_WATER', 'MONITORING', 'Water flow and quality monitoring', true),
(uuid_generate_v4(), 'Environmental Control', 'SVC_ENVIRONMENT', 'MONITORING', 'Temperature, humidity and air quality monitoring', true),
(uuid_generate_v4(), 'Security & Access', 'SVC_SECURITY', 'SECURITY', 'Access control and security monitoring', true),
(uuid_generate_v4(), 'Crowd Analytics', 'SVC_CROWD', 'ANALYTICS', 'AI-powered crowd counting and flow analysis', true);

-- ==================================================================================
-- 10. DEVICES
-- ==================================================================================

INSERT INTO sps_devices (organization_id, device_code, api_key, name, type, status, metadata)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'ENERGY-001', 'api_energy001_secret', 'Main Hall Energy Monitor', 'ENERGY_MONITOR_V2', 'active', '{"location": "Main Hall"}'),
    ('11111111-1111-1111-1111-111111111111', 'WATER-001', 'api_water001_secret', 'North Wing Water Flow', 'WATER_FLOW_SENSOR', 'active', '{"location": "North Wing"}'),
    ('11111111-1111-1111-1111-111111111111', 'TEMP-001', 'api_temp001_secret', 'Conference Room A Temp', 'TEMP_SENSOR_PRO', 'active', '{"location": "Conference Room A"}'),
    ('11111111-1111-1111-1111-111111111111', 'AIR-001', 'api_air001_secret', 'Main Hall Air Quality', 'AIR_QUALITY_MONITOR', 'active', '{"location": "Main Hall"}'),
    ('11111111-1111-1111-1111-111111111111', 'TEMP-002', 'api_temp002_secret', 'Security Office Temp', 'TEMP_SENSOR_PRO', 'active', '{"location": "Security Office"}'),
    ('11111111-1111-1111-1111-111111111111', 'ENERGY-002', 'api_energy002_secret', 'Stage Energy Monitor', 'ENERGY_MONITOR_V2', 'active', '{"location": "Stage"}'),
    ('11111111-1111-1111-1111-111111111111', 'TEMP-003', 'api_temp003_secret', 'Backstage Temperature', 'TEMP_SENSOR_PRO', 'active', '{"location": "Backstage"}');

-- ==================================================================================
-- 11. PERMISSIONS
-- ==================================================================================

INSERT INTO sps_permissions (id, name, code, description, category) VALUES
(uuid_generate_v4(), 'View Dashboard', 'dashboard.view', 'View main dashboard', 'dashboard'),
(uuid_generate_v4(), 'View Devices', 'devices.view', 'View device list', 'devices'),
(uuid_generate_v4(), 'Manage Devices', 'devices.manage', 'Create, update, delete devices', 'devices'),
(uuid_generate_v4(), 'View Events', 'events.view', 'View events', 'events'),
(uuid_generate_v4(), 'Manage Events', 'events.manage', 'Create, update, delete events', 'events'),
(uuid_generate_v4(), 'View Users', 'users.view', 'View user list', 'users'),
(uuid_generate_v4(), 'Manage Users', 'users.manage', 'Create, update, delete users', 'users'),
(uuid_generate_v4(), 'View Reports', 'reports.view', 'View analytics and reports', 'reports'),
(uuid_generate_v4(), 'Manage Settings', 'settings.manage', 'Manage system settings', 'settings'),
(uuid_generate_v4(), 'View Telemetry', 'telemetry.view', 'View telemetry data', 'telemetry'),
(uuid_generate_v4(), 'Manage Alerts', 'alerts.manage', 'Create and manage alert rules', 'alerts');

-- ==================================================================================
-- 12. ROLE ASSIGNMENTS
-- ==================================================================================

-- Super Admin role
INSERT INTO sps_role_assignments (id, user_id, role, org_id)
VALUES (uuid_generate_v4(), '00000000-0000-0000-0000-000000000002', 'SUPER_ADMIN', NULL);

-- Org Admin role for ACME admin
INSERT INTO sps_role_assignments (id, user_id, role, org_id)
VALUES (uuid_generate_v4(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ORG_ADMIN', '11111111-1111-1111-1111-111111111111');

-- Event Manager role
INSERT INTO sps_role_assignments (id, user_id, role, event_id)
VALUES (uuid_generate_v4(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'EVENT_MANAGER', 'e1111111-1111-1111-1111-111111111111');

-- Dept Head role
INSERT INTO sps_role_assignments (id, user_id, role, dept_id)
VALUES (uuid_generate_v4(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'DEPT_HEAD', 'd2222222-2222-2222-2222-222222222222');

-- ==================================================================================
-- SEED DATA COMPLETE
-- ==================================================================================

-- Test login credentials:
-- superadmin@sustainpro.io / Admin@123 (Super Admin)
-- admin@acme.com / Admin@123 (Org Admin)
-- manager@acme.com / Admin@123 (Event Manager)
-- operator@acme.com / Admin@123 (Operator)
