-- ============================================================================
-- SustainPro Database Complete Setup
-- ============================================================================
-- This script will:
-- 1. Drop all existing tables
-- 2. Create fresh schema
-- 3. Load sample data
-- 
-- Run this entire script in pgAdmin Query Tool
-- ============================================================================

\echo '=============================================================='
\echo '     SustainPro Database Setup - Starting...'
\echo '=============================================================='
\echo ''

-- ============================================================================
-- STEP 1: CLEAN UP EXISTING TABLES
-- ============================================================================
\echo 'STEP 1: Dropping existing tables...'

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

\echo 'All existing tables dropped!'
\echo ''

-- ============================================================================
-- STEP 2: CREATE UUID EXTENSION
-- ============================================================================
\echo 'STEP 2: Creating UUID extension...'

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\echo 'UUID extension ready!'
\echo ''

-- Now you need to execute the schema file (sps_schema_clean.sql) separately
-- Then execute the sample data file (sample_data.sql)

\echo '=============================================================='
\echo '     Cleanup Complete!'
\echo '=============================================================='
\echo ''
\echo 'Next Steps:'
\echo '1. Execute: sps_schema_clean.sql'
\echo '2. Execute: sample_data.sql'
\echo ''
