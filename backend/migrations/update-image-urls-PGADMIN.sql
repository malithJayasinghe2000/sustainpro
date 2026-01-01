-- =====================================================
-- COPY THIS ENTIRE CODE INTO PGADMIN QUERY TOOL
-- =====================================================
-- Migration: Update image URLs from /uploads/ to /api/v1/images/
-- This updates all existing image URLs to use the new protected API endpoint

-- Update organization logos
UPDATE sps_organizations 
SET logo_url = REPLACE(logo_url, '/uploads/', '/api/v1/images/public/') 
WHERE logo_url LIKE '%/uploads/%';

-- Also update if already using /api/v1/images/ (without public)
UPDATE sps_organizations 
SET logo_url = REPLACE(logo_url, '/api/v1/images/', '/api/v1/images/public/') 
WHERE logo_url LIKE '%/api/v1/images/%' AND logo_url NOT LIKE '%/public/%';

-- Update event images (if column exists)
UPDATE sps_events 
SET image_url = REPLACE(image_url, '/uploads/', '/api/v1/images/public/') 
WHERE image_url LIKE '%/uploads/%';

UPDATE sps_events 
SET image_url = REPLACE(image_url, '/api/v1/images/', '/api/v1/images/public/') 
WHERE image_url LIKE '%/api/v1/images/%' AND image_url NOT LIKE '%/public/%';

-- Update system settings logo
UPDATE sps_system_settings 
SET site_logo = REPLACE(site_logo, '/uploads/', '/api/v1/images/public/') 
WHERE site_logo LIKE '%/uploads/%';

UPDATE sps_system_settings 
SET site_logo = REPLACE(site_logo, '/api/v1/images/', '/api/v1/images/public/') 
WHERE site_logo LIKE '%/api/v1/images/%' AND site_logo NOT LIKE '%/public/%';

-- Verify the changes
SELECT 'Organizations with logos' as table_name, COUNT(*) as count 
FROM sps_organizations WHERE logo_url IS NOT NULL
UNION ALL
SELECT 'Events with images', COUNT(*) 
FROM sps_events WHERE image_url IS NOT NULL;

-- =====================================================
-- INSTRUCTIONS:
-- 1. Open pgAdmin
-- 2. Connect to your database (sustainpro_db)
-- 3. Right-click on the database → Query Tool
-- 4. Copy and paste this entire code
-- 5. Click Execute (F5) or the Play button
-- 6. Check the output to see how many records were updated
-- =====================================================
