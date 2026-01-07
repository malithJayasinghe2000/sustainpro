-- ============================================================================
-- Verification Query - Run AFTER loading schema and data
-- ============================================================================

SELECT '=============================================================' as message
UNION ALL SELECT '     Database Verification Report'
UNION ALL SELECT '=============================================================';

-- 1. Check all tables exist
SELECT table_name, 
       (SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name LIKE 'sps_%'
ORDER BY table_name;

-- 2. Record Counts
SELECT 'sps_organizations' as table_name, COUNT(*) as records FROM sps_organizations
UNION ALL SELECT 'sps_users', COUNT(*) FROM sps_users
UNION ALL SELECT 'sps_events', COUNT(*) FROM sps_events
UNION ALL SELECT 'sps_departments', COUNT(*) FROM sps_departments
UNION ALL SELECT 'sps_device_models', COUNT(*) FROM sps_device_models
UNION ALL SELECT 'sps_devices', COUNT(*) FROM sps_devices
UNION ALL SELECT 'sps_permissions', COUNT(*) FROM sps_permissions
UNION ALL SELECT 'sps_service_templates', COUNT(*) FROM sps_service_templates
UNION ALL SELECT 'sps_system_settings', COUNT(*) FROM sps_system_settings
ORDER BY table_name;

-- 3. Sample Organizations
SELECT name, subscription_status FROM sps_organizations ORDER BY name;

-- 4. Sample Users
SELECT email, full_name, is_active FROM sps_users ORDER BY email;

-- 5. Sample Events
SELECT name, status, start_date::date FROM sps_events ORDER BY name;

-- Final message
SELECT '=============================================================' as message
UNION ALL SELECT '     Setup Complete!'
UNION ALL SELECT '     Test with: admin@acme.com / Admin@123'
UNION ALL SELECT '=============================================================';
