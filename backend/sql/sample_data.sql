-- SustainPro Sample Data Script
-- This script populates the database with test data for development and testing

-- ============================================================================
-- 1. ORGANIZATIONS
-- ============================================================================

INSERT INTO sps_organizations (id, name, slug, code, type, description, logo_url, subscription_status, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'ACME Corporation', 'acme-corporation', 'SPS-ORG-001', 'CLIENT', 'Leading technology and innovation company', 'https://via.placeholder.com/200x200?text=ACME', 'ACTIVE', NOW()),
('22222222-2222-2222-2222-222222222222', 'TechFlow Inc', 'techflow-inc', 'SPS-ORG-002', 'CLIENT', 'Smart solutions provider', 'https://via.placeholder.com/200x200?text=TechFlow', 'ACTIVE', NOW());

-- ============================================================================
-- 2. USERS
-- ============================================================================

-- Password for all users: bcrypt hashed with 10 rounds
-- Admin@123    -> $2a$10$HHp4Drw7D0kF5KUWsWlRfeC8Bn1DKerszLUB2w9KoTwdHOVRCYqJy
-- Manager@123  -> $2a$10$Rxh1QEmmW6hRTZXlY0bueO0qjHdj4CCSU4Z18nVHyd705ugq93vay
-- Operator@123 -> $2a$10$lkzahX92mr1Df05u.fECReE7lyhnemgsqMVporIV0nQrkEICj54te

INSERT INTO sps_users (id, email, password_hash, full_name, organization_id, code, is_active, created_at) VALUES
-- Admin user (password: Admin@123)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@acme.com', '$2a$10$HHp4Drw7D0kF5KUWsWlRfeC8Bn1DKerszLUB2w9KoTwdHOVRCYqJy', 'John Admin', '11111111-1111-1111-1111-111111111111', 'USR-001', true, NOW()),

-- Manager user (password: Manager@123)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager@acme.com', '$2a$10$Rxh1QEmmW6hRTZXlY0bueO0qjHdj4CCSU4Z18nVHyd705ugq93vay', 'Jane Manager', '11111111-1111-1111-1111-111111111111', 'USR-002', true, NOW()),

-- Operator user (password: Operator@123)
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'operator@acme.com', '$2a$10$lkzahX92mr1Df05u.fECReE7lyhnemgsqMVporIV0nQrkEICj54te', 'Bob Operator', '11111111-1111-1111-1111-111111111111', 'USR-003', true, NOW()),

-- TechFlow user (password: Admin@123)
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'admin@techflow.com', '$2a$10$HHp4Drw7D0kF5KUWsWlRfeC8Bn1DKerszLUB2w9KoTwdHOVRCYqJy', 'Alice Smith', '22222222-2222-2222-2222-222222222222', 'USR-004', true, NOW());

-- ============================================================================
-- 3. PERMISSIONS
-- ============================================================================

INSERT INTO sps_permissions (id, code, name, module, description) VALUES
(uuid_generate_v4(), 'users:view', 'View Users', 'Users', 'View users list and details'),
(uuid_generate_v4(), 'users:create', 'Create Users', 'Users', 'Create new users'),
(uuid_generate_v4(), 'users:update', 'Update Users', 'Users', 'Modify user details'),
(uuid_generate_v4(), 'users:delete', 'Delete Users', 'Users', 'Remove users'),
(uuid_generate_v4(), 'organizations:view', 'View Organizations', 'Organizations', 'View organizations'),
(uuid_generate_v4(), 'organizations:update', 'Update Organizations', 'Organizations', 'Modify organizations'),
(uuid_generate_v4(), 'events:view', 'View Events', 'Events', 'View events'),
(uuid_generate_v4(), 'events:create', 'Create Events', 'Events', 'Create new events'),
(uuid_generate_v4(), 'events:update', 'Update Events', 'Events', 'Modify events'),
(uuid_generate_v4(), 'events:delete', 'Delete Events', 'Events', 'Delete events'),
(uuid_generate_v4(), 'departments:view', 'View Departments', 'Departments', 'View departments'),
(uuid_generate_v4(), 'departments:create', 'Create Departments', 'Departments', 'Create departments'),
(uuid_generate_v4(), 'departments:update', 'Update Departments', 'Departments', 'Modify departments'),
(uuid_generate_v4(), 'departments:delete', 'Delete Departments', 'Departments', 'Delete departments'),
(uuid_generate_v4(), 'devices:view', 'View Devices', 'Devices', 'View device inventory'),
(uuid_generate_v4(), 'devices:provision', 'Provision Devices', 'Devices', 'Add and setup devices'),
(uuid_generate_v4(), 'devices:update', 'Update Devices', 'Devices', 'Modify devices'),
(uuid_generate_v4(), 'devices:delete', 'Delete Devices', 'Devices', 'Remove devices'),
(uuid_generate_v4(), 'telemetry:view', 'View Telemetry', 'Telemetry', 'View telemetry data');

-- ============================================================================
-- 4. ROLES (from RBAC system)
-- ============================================================================

-- Note: Role IDs should match the roles defined in your backend RBAC system
-- These are example UUIDs - adjust based on your actual role IDs

-- ============================================================================
-- 5. EVENTS
-- ============================================================================

INSERT INTO sps_events (id, organization_id, name, description, location, start_date, end_date, status, created_at) VALUES
('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Tech Summit 2026', 'Annual technology conference and exhibition', 'Convention Center, San Francisco', '2026-06-15 09:00:00+00', '2026-06-17 18:00:00+00', 'ACTIVE', NOW()),
('e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Product Launch 2026', 'New product line launch event', 'Innovation Hub, New York', '2026-08-20 10:00:00+00', '2026-08-20 16:00:00+00', 'PLANNING', NOW()),
('e3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'TechFlow Expo', 'Smart solutions showcase', 'Tech Park, Austin', '2026-09-10 08:00:00+00', '2026-09-12 20:00:00+00', 'PLANNING', NOW());

-- ============================================================================
-- 6. DEPARTMENTS
-- ============================================================================

INSERT INTO sps_departments (id, event_id, name, description, head_user_id, icon, color, created_at) VALUES
('d1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'Operations', 'Event operations and logistics management', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Settings', '#3B82F6', NOW()),
('d2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'Security', 'Event security and access control', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Shield', '#EF4444', NOW()),
('d3333333-3333-3333-3333-333333333333', 'e1111111-1111-1111-1111-111111111111', 'Maintenance', 'Equipment and facility maintenance', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Wrench', '#F59E0B', NOW()),
('d4444444-4444-4444-4444-444444444444', 'e2222222-2222-2222-2222-222222222222', 'Staging', 'Product staging and display', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Package', '#8B5CF6', NOW());

-- ============================================================================
-- 7. DEVICE MODELS
-- ============================================================================

INSERT INTO sps_device_models (id, name, description, parameters, created_by, created_at) VALUES
('ENERGY_MONITOR_V2', 'Energy Monitor v2', 'Advanced energy consumption monitoring device', 
'[
  {"key": "voltage", "name": "Voltage", "unit": "V", "type": "number"},
  {"key": "current", "name": "Current", "unit": "A", "type": "number"},
  {"key": "power", "name": "Power", "unit": "W", "type": "number"},
  {"key": "energy", "name": "Energy", "unit": "kWh", "type": "number"},
  {"key": "frequency", "name": "Frequency", "unit": "Hz", "type": "number"}
]'::jsonb, 'system', NOW()),

('WATER_FLOW_SENSOR', 'Water Flow Sensor', 'Water consumption and flow rate monitoring', 
'[
  {"key": "flow_rate", "name": "Flow Rate", "unit": "L/min", "type": "number"},
  {"key": "total_volume", "name": "Total Volume", "unit": "L", "type": "number"},
  {"key": "pressure", "name": "Pressure", "unit": "bar", "type": "number"},
  {"key": "temperature", "name": "Temperature", "unit": "°C", "type": "number"}
]'::jsonb, 'system', NOW()),

('TEMP_SENSOR_PRO', 'Temperature Sensor Pro', 'High-precision temperature and humidity monitoring', 
'[
  {"key": "temperature", "name": "Temperature", "unit": "°C", "type": "number"},
  {"key": "humidity", "name": "Humidity", "unit": "%", "type": "number"},
  {"key": "dew_point", "name": "Dew Point", "unit": "°C", "type": "number"},
  {"key": "heat_index", "name": "Heat Index", "unit": "°C", "type": "number"}
]'::jsonb, 'system', NOW()),

('AIR_QUALITY_MONITOR', 'Air Quality Monitor', 'Indoor air quality monitoring system', 
'[
  {"key": "pm25", "name": "PM2.5", "unit": "μg/m³", "type": "number"},
  {"key": "pm10", "name": "PM10", "unit": "μg/m³", "type": "number"},
  {"key": "co2", "name": "CO2", "unit": "ppm", "type": "number"},
  {"key": "voc", "name": "VOC", "unit": "ppb", "type": "number"},
  {"key": "aqi", "name": "AQI", "unit": "", "type": "number"}
]'::jsonb, 'system', NOW());

-- ============================================================================
-- 8. DEVICES
-- ============================================================================

INSERT INTO sps_devices (id, organization_id, device_code, api_key, name, type, status, last_seen, metadata, created_at) VALUES
-- Tech Summit 2026 Devices
(1, '11111111-1111-1111-1111-111111111111', 'ENERGY-001', 'api_key_energy_001_' || md5(random()::text), 'Main Hall Energy Monitor', 'ENERGY_MONITOR_V2', 'active', NOW() - INTERVAL '5 minutes', '{"location": "Main Hall"}'::jsonb, NOW()),
(2, '11111111-1111-1111-1111-111111111111', 'WATER-001', 'api_key_water_001_' || md5(random()::text), 'North Wing Water Flow', 'WATER_FLOW_SENSOR', 'active', NOW() - INTERVAL '3 minutes', '{"location": "North Wing"}'::jsonb, NOW()),
(3, '11111111-1111-1111-1111-111111111111', 'TEMP-001', 'api_key_temp_001_' || md5(random()::text), 'Conference Room A Temp', 'TEMP_SENSOR_PRO', 'active', NOW() - INTERVAL '2 minutes', '{"location": "Conference Room A"}'::jsonb, NOW()),
(4, '11111111-1111-1111-1111-111111111111', 'AIR-001', 'api_key_air_001_' || md5(random()::text), 'Main Hall Air Quality', 'AIR_QUALITY_MONITOR', 'active', NOW() - INTERVAL '1 minute', '{"location": "Main Hall"}'::jsonb, NOW()),
(5, '11111111-1111-1111-1111-111111111111', 'TEMP-002', 'api_key_temp_002_' || md5(random()::text), 'Security Office Temp', 'TEMP_SENSOR_PRO', 'active', NOW() - INTERVAL '4 minutes', '{"location": "Security Office"}'::jsonb, NOW()),

-- Product Launch 2026 Devices
(6, '11111111-1111-1111-1111-111111111111', 'ENERGY-002', 'api_key_energy_002_' || md5(random()::text), 'Stage Energy Monitor', 'ENERGY_MONITOR_V2', 'active', NOW() - INTERVAL '10 minutes', '{"location": "Stage"}'::jsonb, NOW()),
(7, '11111111-1111-1111-1111-111111111111', 'TEMP-003', 'api_key_temp_003_' || md5(random()::text), 'Backstage Temperature', 'TEMP_SENSOR_PRO', 'active', NOW() - INTERVAL '6 minutes', '{"location": "Backstage"}'::jsonb, NOW()),

-- TechFlow Expo Devices
(8, '22222222-2222-2222-2222-222222222222', 'ENERGY-003', 'api_key_energy_003_' || md5(random()::text), 'Booth 1 Energy Monitor', 'ENERGY_MONITOR_V2', 'active', NOW() - INTERVAL '15 minutes', '{"location": "Booth 1"}'::jsonb, NOW()),
(9, '22222222-2222-2222-2222-222222222222', 'AIR-002', 'api_key_air_002_' || md5(random()::text), 'Exhibition Hall Air', 'AIR_QUALITY_MONITOR', 'active', NOW() - INTERVAL '8 minutes', '{"location": "Exhibition Hall"}'::jsonb, NOW());

-- ============================================================================
-- 9. SERVICE TEMPLATES
-- ============================================================================

INSERT INTO sps_service_templates (id, name, description, scope, config, is_public_dashboard_supported, main_dashboard_layout, created_at) VALUES
(uuid_generate_v4(), 'Energy Monitoring', 'Real-time energy consumption tracking and analytics', 'GLOBAL', 
'{"refresh_interval": 30, "alert_threshold": 1000}'::jsonb,
true,
'{"widgets": [{"type": "line_chart", "title": "Power Consumption"}, {"type": "gauge", "title": "Current Load"}]}'::jsonb,
NOW()),

(uuid_generate_v4(), 'Environmental Monitoring', 'Temperature, humidity, and air quality tracking', 'GLOBAL',
'{"refresh_interval": 60, "temp_unit": "celsius"}'::jsonb,
true,
'{"widgets": [{"type": "multi_line", "title": "Temperature & Humidity"}, {"type": "aqi_gauge", "title": "Air Quality"}]}'::jsonb,
NOW()),

(uuid_generate_v4(), 'Water Management', 'Water flow and consumption monitoring', 'GLOBAL',
'{"refresh_interval": 45, "volume_unit": "liters"}'::jsonb,
true,
'{"widgets": [{"type": "area_chart", "title": "Water Usage"}, {"type": "counter", "title": "Total Volume"}]}'::jsonb,
NOW());

-- ============================================================================
-- 10. SYSTEM SETTINGS
-- ============================================================================

INSERT INTO sps_system_settings (
    id, category, site_title, maintenance_mode, default_timezone,
    account_lock_duration_minutes, token_expire_minutes, max_login_attempts,
    session_timeout_enabled, support_email, support_phone, created_at
) VALUES (
    'sps_main_config', 
    'global', 
    'SustainPro Platform', 
    false, 
    'UTC',
    30, 
    60, 
    5, 
    true,
    'support@sustainpro.com', 
    '+1-800-SUSTAIN', 
    NOW()
);

-- ============================================================================
-- 11. ALERT RULES
-- ============================================================================

INSERT INTO sps_alert_rules (id, organization_id, name, device_type, condition, severity, is_active, created_at) VALUES
(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'High Power Consumption', 'ENERGY_MONITOR_V2', 
'{"parameter": "power", "operator": ">", "value": 5000}'::jsonb, 'HIGH', true, NOW()),

(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'High Temperature', 'TEMP_SENSOR_PRO',
'{"parameter": "temperature", "operator": ">", "value": 30}'::jsonb, 'MEDIUM', true, NOW()),

(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Poor Air Quality', 'AIR_QUALITY_MONITOR',
'{"parameter": "aqi", "operator": ">", "value": 150}'::jsonb, 'HIGH', true, NOW()),

(uuid_generate_v4(), '22222222-2222-2222-2222-222222222222', 'Water Leak Detection', 'WATER_FLOW_SENSOR',
'{"parameter": "flow_rate", "operator": ">", "value": 100}'::jsonb, 'CRITICAL', true, NOW());

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to verify data was inserted

-- SELECT 'Organizations', COUNT(*) FROM sps_organizations
-- UNION ALL SELECT 'Users', COUNT(*) FROM sps_users
-- UNION ALL SELECT 'Events', COUNT(*) FROM sps_events
-- UNION ALL SELECT 'Departments', COUNT(*) FROM sps_departments
-- UNION ALL SELECT 'Device Models', COUNT(*) FROM sps_device_models
-- UNION ALL SELECT 'Devices', COUNT(*) FROM sps_devices
-- UNION ALL SELECT 'Permissions', COUNT(*) FROM sps_permissions
-- UNION ALL SELECT 'System Settings', COUNT(*) FROM sps_system_settings
-- UNION ALL SELECT 'Alert Rules', COUNT(*) FROM sps_alert_rules;

COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Sample data loaded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Users:';
  RAISE NOTICE '  Admin:    admin@acme.com / Admin@123';
  RAISE NOTICE '  Manager:  manager@acme.com / Manager@123';
  RAISE NOTICE '  Operator: operator@acme.com / Operator@123';
  RAISE NOTICE '';
  RAISE NOTICE 'Organizations: ACME Corporation, TechFlow Inc';
  RAISE NOTICE 'Events: 3 events created';
  RAISE NOTICE 'Devices: 9 IoT devices registered';
END $$;
