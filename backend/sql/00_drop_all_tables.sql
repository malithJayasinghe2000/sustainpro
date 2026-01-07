-- ============================================================================
-- STEP 1: DROP ALL EXISTING TABLES
-- ============================================================================
-- Run this first to clean up your database completely
-- This will remove ALL existing tables

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS sps_task_evidence CASCADE;
DROP TABLE IF EXISTS sps_tasks CASCADE;
DROP TABLE IF EXISTS sps_alerts CASCADE;
DROP TABLE IF EXISTS sps_alert_rules CASCADE;
DROP TABLE IF EXISTS sps_audit_logs CASCADE;
DROP TABLE IF EXISTS sps_role_permissions CASCADE;
DROP TABLE IF EXISTS sps_role_assignments CASCADE;
DROP TABLE IF EXISTS sps_permissions CASCADE;
DROP TABLE IF EXISTS sps_department_service_devices CASCADE;
DROP TABLE IF EXISTS sps_department_services CASCADE;
DROP TABLE IF EXISTS sps_service_device_models CASCADE;
DROP TABLE IF EXISTS sps_service_subscriptions CASCADE;
DROP TABLE IF EXISTS sps_service_templates CASCADE;
DROP TABLE IF EXISTS sps_dashboard_templates CASCADE;
DROP TABLE IF EXISTS sps_devices CASCADE;
DROP TABLE IF EXISTS sps_devices_id_seq CASCADE;
DROP TABLE IF EXISTS sps_device_models CASCADE;
DROP TABLE IF EXISTS sps_services CASCADE;
DROP TABLE IF EXISTS sps_service_definitions CASCADE;
DROP TABLE IF EXISTS sps_departments CASCADE;
DROP TABLE IF EXISTS sps_department_templates CASCADE;
DROP TABLE IF EXISTS sps_events CASCADE;
DROP TABLE IF EXISTS sps_users CASCADE;
DROP TABLE IF EXISTS sps_organizations CASCADE;
DROP TABLE IF EXISTS sps_system_settings CASCADE;

-- Verify all tables are dropped
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'sps_%'
ORDER BY table_name;

-- This should return 0 rows if successful

\echo 'All tables dropped successfully!'
