# SustainPro Backend - Setup Instructions

## ✅ What's Done
- ✅ Removed Prisma ORM
- ✅ Installed `pg` (node-postgres) library
- ✅ Created database connection pool (`src/db.ts`)
- ✅ Created example route files with SQL placeholders
- ✅ Created complete SQL schema file

## 📝 Setup Steps

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sustainpro;

# Connect to the database
\c sustainpro
```

### 2. Run SQL Schema

Execute the schema file to create all tables:

```bash
psql -U postgres -d sustainpro -f sql/schema.sql
```

This will create:
- `sps_users` table with indexes
- `sps_user_profiles` table
- `sps_devices` table with indexes
- `sps_system_settings` table
- `sps_telemetry` table (TimescaleDB hypertable)
- Triggers for `updated_at` columns

### 3. Update Environment Variables

Edit `.env` file with your database credentials:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/sustainpro
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 4. Test the Backend

```bash
# Build TypeScript
npm run build

# Start server
npm start

# Or run in development mode
npm run dev
```

### 5. Test API Endpoints

```bash
# Health check
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api/v1

# Get all users
curl http://localhost:5000/api/v1/users

# Get all devices
curl http://localhost:5000/api/v1/devices
```

## 📁 File Structure

```
backend/
├── sql/
│   └── schema.sql          ← Run this to create tables
├── src/
│   ├── db.ts              ← PostgreSQL connection pool
│   ├── index.ts           ← Express server
│   └── routes/
│       ├── user.routes.ts     ← User CRUD with SQL
│       ├── device.routes.ts   ← Device CRUD with SQL
│       └── telemetry.routes.ts← Telemetry with TimescaleDB queries
└── .env                   ← Database credentials

```

## 🔧 Customize SQL Queries

All route files have `// TODO: Add your SQL query here` comments.

**Example locations:**
- [src/routes/user.routes.ts](file:///d:/SustainPro/backend/src/routes/user.routes.ts) - Lines 13, 36, 70, 94, 122
- [src/routes/device.routes.ts](file:///d:/SustainPro/backend/src/routes/device.routes.ts) - Lines 12, 39, 72, 101
- [src/routes/telemetry.routes.ts](file:///d:/SustainPro/backend/src/routes/telemetry.routes.ts) - Lines 12, 40, 86, 123

You can modify or replace the SQL queries as needed!

## 🕐 TimescaleDB Query Examples

```sql
-- Hourly aggregation
SELECT
  time_bucket('1 hour', timestamp) AS hour,
  device_id,
  COUNT(*) as reading_count
FROM sps_telemetry
WHERE device_id = $1
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour, device_id
ORDER BY hour DESC;

-- Last 100 readings
SELECT * FROM sps_telemetry
WHERE device_id = $1
ORDER BY timestamp DESC
LIMIT 100;
```

## 🎯 Next Steps
1. Run `sql/schema.sql` in your PostgreSQL database
2. Update `.env` with your database URL
3. Run `npm run dev` to start the server
4. Customize SQL queries in route files as needed
