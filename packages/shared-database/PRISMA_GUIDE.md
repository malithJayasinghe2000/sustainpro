# SustainPro - Prisma Database Guide

A complete guide for managing the database in development and production environments.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Workflow](#development-workflow)
3. [Production Deployment](#production-deployment)
4. [Common Commands](#common-commands)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database running
- Environment variables configured

### First Time Setup

```bash
# Navigate to shared-database package
cd packages/shared-database

# Install dependencies
npm install

# Setup database (generates client, pushes schema, seeds data)
npm run db:setup
```

---

## Development Workflow

### 1. Starting Fresh (New Developer)

```bash
# Clone repo and install dependencies
git clone <repo-url>
cd sustainpro
npm install

# Navigate to database package
cd packages/shared-database

# Create .env file with your DATABASE_URL
echo "DATABASE_URL=postgresql://username:password@localhost:5432/sustainpro" > .env

# Setup database
npm run db:setup
```

### 2. Making Schema Changes

When you need to modify the database structure:

```bash
# Step 1: Edit the schema file
# Open: prisma/schema.prisma

# Step 2: Push changes to database
npm run prisma:push

# Step 3: Regenerate Prisma Client
npm run prisma:generate

# Step 4: Update seed file if needed
# Edit: prisma/seed.ts

# Step 5: Re-seed database
npm run prisma:seed
```

### 3. After Pulling New Code

When someone else has made schema changes:

```bash
# Regenerate Prisma Client to match new schema
npm run prisma:generate

# If database structure changed, push changes
npm run prisma:push

# Re-seed if needed
npm run prisma:seed
```

### 4. Viewing Database (Prisma Studio)

```bash
# Open visual database browser
npm run prisma:studio

# Opens at http://localhost:5555
```

### 5. Resetting Database (Clean Slate)

```bash
# WARNING: This deletes all data!
npm run prisma:migrate:reset

# Then re-seed
npm run prisma:seed
```

---

## Production Deployment

### Method 1: Using NPM Scripts (Recommended)

```bash
# SSH into your server
ssh user@your-server.com

# Navigate to project
cd /path/to/sustainpro/packages/shared-database

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Deploy database changes safely
npm run db:deploy
```

### Method 2: Docker Deployment

Add to your service's startup command in `docker-compose.yml`:

```yaml
services:
  auth-service:
    command: sh -c "cd /app && npx prisma migrate deploy && node dist/index.js"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/sustainpro
```

Or in Dockerfile:

```dockerfile
# Generate Prisma Client during build
RUN npx prisma generate

# Apply migrations on container start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

### Method 3: Manual SQL Deployment

For full control or when Prisma isn't available:

```bash
# Connect to database and run migration SQL
psql $DATABASE_URL -f prisma/migrations/20260111_add_system_configuration/migration.sql

# Verify tables exist
psql $DATABASE_URL -c "\dt sps_*"
```

### Method 4: CI/CD Pipeline (GitHub Actions Example)

```yaml
# .github/workflows/deploy.yml
name: Deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd packages/shared-database && npm install
      
      - name: Deploy database
        run: cd packages/shared-database && npm run db:deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Common Commands

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run db:setup` | Full setup: generate + push + seed |
| `npm run prisma:generate` | Regenerate Prisma Client |
| `npm run prisma:push` | Push schema changes to database |
| `npm run prisma:push:force` | Force push (accepts data loss) |
| `npm run prisma:seed` | Run seed script |
| `npm run prisma:studio` | Open visual database browser |
| `npm run prisma:migrate:reset` | Reset database (deletes all data) |

### Production Commands

| Command | Description |
|---------|-------------|
| `npm run db:deploy` | Safe deployment: generate + migrate + seed |
| `npm run prisma:migrate:deploy` | Apply pending migrations only |
| `npm run prisma:generate` | Regenerate client after code pull |

### Direct Prisma Commands

```bash
# Check migration status
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name your_migration_name

# Mark migration as applied (fixing sync issues)
npx prisma migrate resolve --applied migration_name

# Validate schema
npx prisma validate

# Format schema file
npx prisma format
```

---

## Troubleshooting

### Error: Column does not exist

**Problem:** Prisma Client is out of sync with the database.

```
The column `sps_system_settings.category` does not exist
```

**Solution:**
```bash
npm run prisma:generate
```

### Error: File is locked (Windows)

**Problem:** Another process is using Prisma files.

```
EPERM: operation not permitted, rename '...query_engine-windows.dll.node'
```

**Solution:**
```bash
# Close all terminals, VS Code, and Node processes
# Then reopen and run:
npm run prisma:generate
```

Or force kill Node:
```powershell
taskkill /f /im node.exe
npm run prisma:generate
```

### Error: Database does not exist

**Problem:** PostgreSQL database wasn't created.

```
error: database "sustainpro" does not exist
```

**Solution:**
```bash
# Create database manually
psql -U postgres -c "CREATE DATABASE sustainpro;"
```

### Error: Connection refused

**Problem:** PostgreSQL is not running or wrong connection details.

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
1. Check if PostgreSQL is running
2. Verify DATABASE_URL in .env file
3. Check if port is correct (default: 5432)

### Error: Migration failed

**Problem:** Migration couldn't be applied.

**Solution:**
```bash
# Check what went wrong
npx prisma migrate status

# If migration is stuck, mark as applied
npx prisma migrate resolve --applied migration_name

# Or reset and start fresh (dev only!)
npm run prisma:migrate:reset
```

### Error: Seed failed

**Problem:** Seed script has errors.

**Solution:**
```bash
# Run seed with verbose output
npx ts-node prisma/seed.ts

# Check for TypeScript errors
npx tsc --noEmit
```

---

## Best Practices

### DO ✅

1. **Always regenerate client after schema changes**
   ```bash
   npm run prisma:generate
   ```

2. **Use `db:setup` for development**
   ```bash
   npm run db:setup
   ```

3. **Use `db:deploy` for production**
   ```bash
   npm run db:deploy
   ```

4. **Backup before production migrations**
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

5. **Test migrations on staging first**

6. **Keep seed data idempotent (use upsert)**
   ```typescript
   await prisma.table.upsert({
     where: { id: 'unique-id' },
     update: {},
     create: { ... }
   });
   ```

### DON'T ❌

1. **Never use `prisma:push:force` in production**
   - It can delete data without warning

2. **Never skip `prisma:generate` after pulling code**
   - Client will be out of sync

3. **Never run `prisma:migrate:reset` in production**
   - It deletes ALL data

4. **Don't edit migration files after they're applied**
   - Create a new migration instead

5. **Don't commit sensitive data in seed files**
   - Use environment variables

---

## Environment Variables

### Required

```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

### Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

### Examples

**Local Development:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sustainpro"
```

**Docker:**
```env
DATABASE_URL="postgresql://sustainpro:sustainpro_dev@postgres:5432/sustainpro"
```

**Production (DigitalOcean):**
```env
DATABASE_URL="postgresql://doadmin:xxx@db-xxx.ondigitalocean.com:25060/sustainpro?sslmode=require"
```

---

## File Structure

```
packages/shared-database/
├── prisma/
│   ├── schema.prisma           # Database schema definition
│   ├── seed.ts                 # Seed data script
│   └── migrations/             # Migration files
│       └── 20260111_.../
│           └── migration.sql   # SQL migration
├── src/
│   └── index.ts               # Prisma client export
├── package.json               # Scripts and dependencies
├── .env                       # Environment variables (local only)
└── PRISMA_GUIDE.md           # This file
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                               │
├─────────────────────────────────────────────────────────────┤
│  First time setup:     npm run db:setup                     │
│  After schema change:  npm run prisma:push                  │
│  After code pull:      npm run prisma:generate              │
│  View database:        npm run prisma:studio                │
│  Reset everything:     npm run prisma:migrate:reset         │
├─────────────────────────────────────────────────────────────┤
│                    PRODUCTION                                │
├─────────────────────────────────────────────────────────────┤
│  Deploy changes:       npm run db:deploy                    │
│  Apply migrations:     npm run prisma:migrate:deploy        │
│  Check status:         npx prisma migrate status            │
└─────────────────────────────────────────────────────────────┘
```

---

*Last Updated: 2026-01-11*
