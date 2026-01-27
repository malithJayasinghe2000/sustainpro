---
description: Update local environment to use TimescaleDB
---

# Update Team's Local Environment to TimescaleDB

The project has migrated from standard PostgreSQL to TimescaleDB to support high-performance IoT telemetry.

Follow these steps to update your local development environment.


### Option 2: Keep Existing Data

**Use this only if you must preserve your local database.** This requires manually patching the database configuration.

```powershell
# 1. Pull changes
git pull

# 2. Go to docker directory
cd docker

# 3. Recreate Postgres container
docker-compose stop postgres
docker-compose rm -f postgres
docker-compose up -d postgres

# 4. Patch Configuration (Required because we are reusing old Postgres config)
# Run this to enable the TimescaleDB library
docker run --rm -v sustainpro-postgres-data:/data alpine sh -c "echo shared_preload_libraries = 'timescaledb' >> /data/pgdata/postgresql.conf"

# 5. Restart Database to apply config
docker-compose restart postgres

# 6. Enable Hypertable
docker exec -i sustainpro-postgres psql -U sustainpro -d sustainpro -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE; SELECT create_hypertable('sps_telemetry', 'recorded_at', migrate_data => true, if_not_exists => true);"

# 7. Regenerate Prisma
cd ../packages/shared-database
npx prisma generate
```