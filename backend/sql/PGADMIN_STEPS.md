# pgAdmin Database Setup - Step by Step

Follow these exact steps in pgAdmin:

## Step 1: Open Query Tool

1. Open pgAdmin 4
2. Connect to your PostgreSQL server
3. Click on your `sustainpro` database
4. Click **Tools** → **Query Tool** (or press F5)

## Step 2: Drop All Old Tables

1. In Query Tool, click **Open File** icon (folder icon)
2. Navigate to: `D:\sustainpro\backend\sql\00_drop_all_tables.sql`
3. Click **Execute** (▶️ play button or F5)
4. You should see: "All tables dropped successfully!"

## Step 3: Create Fresh Schema

1. Click **Open File** again
2. Navigate to: `D:\sustainpro\backend\sql\sps_schema_clean.sql`
3. Click **Execute** (▶️)
4. Wait for completion (should show "Query returned successfully")
5. Check for any errors in the "Messages" tab at bottom

## Step 4: Load Sample Data

1. Click **Open File** again
2. Navigate to: `D:\sustainpro\backend\sql\sample_data.sql`
3. Click **Execute** (▶️)
4. You should see messages about data being inserted

## Step 5: Verify Setup

Run this verification query:

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'sps_%'
ORDER BY table_name;

-- Check data counts
SELECT 
  'organizations' as table_name, COUNT(*) as records FROM sps_organizations
UNION ALL SELECT 'users', COUNT(*) FROM sps_users
UNION ALL SELECT 'events', COUNT(*) FROM sps_events
UNION ALL SELECT 'departments', COUNT(*) FROM sps_departments
UNION ALL SELECT 'devices', COUNT(*) FROM sps_devices
UNION ALL SELECT 'device_models', COUNT(*) FROM sps_device_models
ORDER BY table_name;
```

Expected results:
- organizations: 2
- users: 4
- events: 3
- departments: 4
- devices: 9
- device_models: 4

## Step 6: Test Login

Try logging in with:
- Email: `admin@acme.com`
- Password: `Admin@123`

## Common Issues

### Error: "relation already exists"
Solution: Run `00_drop_all_tables.sql` again

### Error: "column does not exist"
Solution: Make sure you're using `sps_schema_clean.sql` not `sps_schema.sql`

### Error: "permission denied"
Solution: Make sure you're connected as the `postgres` user or database owner

## Files Summary

| Order | File | Purpose |
|-------|------|---------|
| 1 | `00_drop_all_tables.sql` | Clean up old tables |
| 2 | `sps_schema_clean.sql` | Create new schema |
| 3 | `sample_data.sql` | Load test data |

---

**Ready?** Start with Step 1 above! I'm here to help if you encounter any errors.
