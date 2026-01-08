# 🚀 SustainPro - Complete Developer Setup Guide

> **Complete setup guide for new developers** - From zero to running application in 30 minutes!

This guide covers everything you need to get SustainPro running locally, including the latest Prisma ORM and Swagger API documentation features.

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Initial Setup](#-initial-setup)
3. [Database Setup with Prisma](#-database-setup-with-prisma)
4. [Running the Application](#-running-the-application)
5. [Swagger API Documentation](#-swagger-api-documentation)
6. [Testing Authentication](#-testing-authentication)
7. [Development Workflow](#-development-workflow)
8. [Troubleshooting](#-troubleshooting)
9. [Next Steps](#-next-steps)

---

## 📦 Prerequisites

### Required Software

Before starting, install the following:

| Software | Version | Installation | Purpose |
|----------|---------|--------------|---------|
| **Node.js** | 20.x LTS | [Download](https://nodejs.org/) | JavaScript runtime |
| **npm** | 10.x+ | Comes with Node.js | Package manager |
| **Docker Desktop** | Latest | [Download](https://www.docker.com/products/docker-desktop/) | PostgreSQL, RabbitMQ, Redis |
| **Git** | Latest | [Download](https://git-scm.com/) | Version control |
| **VS Code** | Latest | [Download](https://code.visualstudio.com/) | Recommended IDE |

### Installation Commands

#### Windows (PowerShell):
```powershell
# Install Node.js (using winget)
winget install OpenJS.NodeJS.LTS

# Install Docker Desktop
winget install Docker.DockerDesktop

# Install Git
winget install Git.Git

# Verify installations
node --version    # Should be v20.x.x
npm --version     # Should be 10.x.x
docker --version  # Should show Docker version
```

#### macOS (Terminal):
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install Docker Desktop (download from website)
# Or use: brew install --cask docker

# Verify installations
node --version
npm --version
docker --version
```

#### Linux (Ubuntu/Debian):
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify installations
node --version
npm --version
docker --version
```

### VS Code Extensions (Recommended)

Install these extensions for the best development experience:

- **Prisma** (`Prisma.prisma`) - Syntax highlighting for Prisma schema
- **ESLint** (`dbaeumer.vscode-eslint`) - Code linting
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting
- **Docker** (`ms-azuretools.vscode-docker`) - Docker management
- **Thunder Client** (`rangav.vscode-thunder-client`) - API testing (alternative to Postman)
- **Turbo Console Log** (`ChakrounAnas.turbo-console-log`) - Quick console.log generation

---

## 🎯 Initial Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/sustainpro.git
cd sustainpro
```

### Step 2: Install Dependencies

```bash
# Install all dependencies for entire monorepo
npm install
```

This will install:
- Root dependencies (Turbo, TypeScript)
- All package dependencies (shared-database, shared-types, etc.)
- All service dependencies (auth-service, core-service, iot-service)
- Frontend dependencies (Next.js)

**Expected Output:**
```
✓ Packages: +1234 packages installed
✓ Dependencies resolved
```

### Step 3: Environment Configuration

#### Copy Environment Files

```bash
# Copy root environment file
cp .env.example .env

# Copy Docker environment file
cp docker/.env.example docker/.env
```

#### Configure Environment Variables

**Important Variables to Verify:**

**`docker/.env`:**
```env
# PostgreSQL Configuration
POSTGRES_USER=sustainpro
POSTGRES_PASSWORD=sustainpro123
POSTGRES_DB=sustainpro
POSTGRES_PORT=5432

# RabbitMQ Configuration
RABBITMQ_USER=sustainpro
RABBITMQ_PASSWORD=sustainpro123

# Redis Configuration
REDIS_PASSWORD=sustainpro123
```

**Service Environment Files** (auto-configured):
- `services/auth-service/.env`
- `services/core-service/.env`
- `services/iot-service/.env`

**⚠️ Critical:** All services **MUST** use the same `JWT_SECRET`. This is pre-configured.

### Step 4: Start Docker Infrastructure

```bash
# Navigate to docker directory
cd docker

# Start PostgreSQL, RabbitMQ, Redis, nginx
docker-compose up -d

# Verify all containers are running
docker-compose ps
```

**Expected Containers:**
- `sustainpro-postgres` - PostgreSQL database
- `sustainpro-rabbitmq` - Message broker
- `sustainpro-redis` - Cache store
- `sustainpro-nginx` - API Gateway

**Verify Services:**
```bash
# Check if PostgreSQL is accepting connections
docker exec sustainpro-postgres pg_isready -U sustainpro

# Should output: /var/run/postgresql:5432 - accepting connections
```

---

## 🗄️ Database Setup with Prisma

SustainPro uses **Prisma ORM** for type-safe database access. Follow these steps carefully:

### Step 1: Verify Database Connection

```bash
# Return to project root
cd ..

# Test database connection
cd packages/shared-database
npm run prisma:studio
```

If Prisma Studio opens in your browser (http://localhost:5555), your database connection is working! Close it (Ctrl+C) and continue.

### Step 2: Generate Prisma Client

```bash
# Generate Prisma client from schema
npm run prisma:generate
```

**What this does:**
- Reads `prisma/schema.prisma`
- Generates TypeScript types for all database tables
- Creates type-safe query methods
- Enables auto-completion in your IDE

**Expected Output:**
```
✔ Generated Prisma Client (v5.22.0)
```

### Step 3: Initialize Database Schema

Choose **ONE** of these methods:

#### **Method A: Using Prisma Migrate (Recommended for Development)**

```bash
# Create and apply migration
npm run prisma:migrate

# When prompted, enter migration name:
# → "init"
```

This will:
- Create migration file in `prisma/migrations/`
- Apply schema to database
- Track migration history

#### **Method B: Using SQL Schema (Quick Start)**

```bash
# Go back to root
cd ../..

# Apply SQL schema
docker exec -i sustainpro-postgres psql -U sustainpro -d sustainpro < database/schema.sql
```

### Step 4: Seed Database with Test Data

**This is CRITICAL** - Seeds users, roles, permissions, and test organizations:

```bash
# Navigate to shared-database package
cd packages/shared-database

# Run Prisma seeder
npm run prisma:seed
```

**What gets seeded:**

| Category | Details |
|----------|---------|
| **Organizations** | 2 organizations (SustainPro, ACME Corporation) |
| **Users** | 4 users with proper Argon2id hashed passwords |
| **Permissions** | 11 granular permissions (dashboard.view, devices.manage, etc.) |
| **Settings** | System configuration |

**Test User Credentials:**

| Email | Password | Role | Organization |
|-------|----------|------|--------------|
| `superadmin@sustainpro.io` | `Admin@123` | Super Admin | SustainPro |
| `admin@acme.com` | `Admin@123` | Org Admin | ACME Corporation |
| `manager@acme.com` | `Admin@123` | Event Manager | ACME Corporation |
| `operator@acme.com` | `Admin@123` | Operator | ACME Corporation |

**Expected Output:**
```
✅ System settings created
✅ Organizations created (2)
✅ Users created (4) with hashed passwords
✅ Permissions created (11)
✅ Role assignments created
🌱 Database seeded successfully!
```

### Step 5: Verify Database Setup

```bash
# Open Prisma Studio to view data
npm run prisma:studio
```

Browse to http://localhost:5555 and verify:
- ✅ `sps_users` table has 4 users
- ✅ `sps_organizations` table has 2 organizations
- ✅ `sps_permissions` table has 11 permissions

---

## ▶️ Running the Application

### Method 1: Run All Services (Recommended)

```bash
# From project root
npm run dev
```

This starts **all services in parallel** using Turbo:
- ✅ Auth Service (port 5000)
- ✅ Core Service (port 5001)
- ✅ IoT Service (port 5002)
- ✅ Frontend (port 3000)

**Expected Output:**
```
@sustainpro/auth-service:dev: Server running on port 5000
@sustainpro/core-service:dev: Server running on port 5001
@sustainpro/iot-service:dev: Server running on port 5002
frontend:dev: Local: http://localhost:3000
```

### Method 2: Run Services Individually

Useful for debugging specific services:

#### Terminal 1 - Auth Service
```bash
npm run dev --filter=@sustainpro/auth-service
```

#### Terminal 2 - Core Service
```bash
npm run dev --filter=@sustainpro/core-service
```

#### Terminal 3 - IoT Service
```bash
npm run dev --filter=@sustainpro/iot-service
```

#### Terminal 4 - Frontend
```bash
npm run dev:frontend
```

### Method 3: Run Only Backend

```bash
# Run all backend services only (no frontend)
npm run dev:backend
```

---

## 📚 Swagger API Documentation

All services come with **interactive Swagger UI** for API exploration and testing.

### Access Swagger UI

| Service | URL | Purpose |
|---------|-----|---------|
| **Auth Service** | http://localhost:5000/api/v1/docs | Authentication, Users, RBAC |
| **Core Service** | http://localhost:5001/api/v1/docs | Organizations, Events, Devices |
| **IoT Service** | http://localhost:5002/api/v1/docs | Telemetry, Real-time Data |

### Features Available

- 📖 **Complete API documentation** - All endpoints documented
- 🧪 **Try it out** - Execute requests directly from browser
- 🔐 **Authentication testing** - Test protected endpoints with JWT tokens
- 📝 **Request/Response examples** - See data structures
- ⚡ **Schema validation** - Auto-complete and type checking

### Using Swagger UI

#### 1. Open Swagger UI
```
http://localhost:5000/api/v1/docs
```

#### 2. Test Login Endpoint

1. Expand **POST /api/v1/auth/login**
2. Click **"Try it out"**
3. Enter request body:
```json
{
  "email": "admin@acme.com",
  "password": "Admin@123"
}
```
4. Click **"Execute"**
5. Copy the `token` from the response (NOT `access_token`)

#### 3. Authorize Swagger

1. Click 🔒 **"Authorize"** button (top right)
2. Enter: `Bearer YOUR_TOKEN_HERE`
3. Click **"Authorize"**
4. Click **"Close"**

#### 4. Test Protected Endpoints

Now you can test any protected endpoint! Try:
- **GET /api/v1/users/me** - Get current user info
- **GET /api/v1/organizations** - List organizations (requires permission)

---

## 🔐 Testing Authentication

### Quick Test with PowerShell

```powershell
# Step 1: Login
$body = '{"email":"admin@acme.com","password":"Admin@123"}'
$login = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" `
  -Method POST -Body $body -ContentType "application/json"

# Step 2: Extract token (NOTE: field is 'token' not 'access_token')
$token = $login.token
Write-Host "Token: $token"

# Step 3: Test protected endpoint
$headers = @{ Authorization = "Bearer $token" }
$user = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/users/me" `
  -Headers $headers

# View user info
$user.data | Format-List
```

### Quick Test with cURL

```bash
# Step 1: Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin@123"}'

# Copy the token from response

# Step 2: Test protected endpoint
curl -X GET http://localhost:5000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test via Frontend

1. Open http://localhost:3000
2. Click **"Login"**
3. Enter credentials:
   - Email: `admin@acme.com`
   - Password: `Admin@123`
4. You should be redirected to the dashboard

---

## 🔄 Development Workflow

### Daily Workflow

```bash
# 1. Start Docker infrastructure (if not running)
cd docker
docker-compose up -d

# 2. Return to root and start all services
cd ..
npm run dev

# 3. Open your browser
# - Frontend: http://localhost:3000
# - Swagger (Auth): http://localhost:5000/api/v1/docs
# - Swagger (Core): http://localhost:5001/api/v1/docs
# - Prisma Studio: npm run prisma:studio (in separate terminal)
```

### Common Tasks

#### View Database Content
```bash
cd packages/shared-database
npm run prisma:studio
```
Opens Prisma Studio at http://localhost:5555

#### Reset Database
```bash
cd packages/shared-database

# ⚠️ WARNING: This deletes all data!
npm run prisma:migrate:reset

# Re-seed database
npm run prisma:seed
```

#### Update Database Schema

When you modify `packages/shared-database/prisma/schema.prisma`:

```bash
cd packages/shared-database

# Create migration
npm run prisma:migrate

# Regenerate Prisma client
npm run prisma:generate

# Restart services to use new schema
```

#### Add New Permissions

Edit `packages/shared-database/prisma/seed.ts`:

```typescript
const permissions = [
  // ... existing permissions
  { code: 'reports.export', name: 'Export Reports', description: 'Export reports to PDF/Excel' },
];
```

Then re-seed:
```bash
npm run prisma:seed
```

#### View Logs

```bash
# All services
npm run dev

# Individual service logs
docker logs sustainpro-postgres
docker logs sustainpro-rabbitmq
docker logs sustainpro-redis
```

#### Stop Everything

```bash
# Stop Node services (Ctrl+C in terminal)

# Stop Docker containers
cd docker
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### ❌ Issue: `Cannot connect to database`

**Cause:** PostgreSQL container not running

**Solution:**
```bash
cd docker
docker-compose ps

# If postgres is not running:
docker-compose up -d sustainpro-postgres

# Check logs
docker logs sustainpro-postgres
```

#### ❌ Issue: `Port already in use`

**Cause:** Service already running on that port

**Solution:**
```bash
# Windows - Find process on port 5000
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F

# macOS/Linux - Find and kill process
lsof -ti:5000 | xargs kill -9
```

#### ❌ Issue: `Prisma Client not generated`

**Cause:** Forgot to run `prisma:generate`

**Solution:**
```bash
cd packages/shared-database
npm run prisma:generate

# Restart services
cd ../..
npm run dev
```

#### ❌ Issue: `Invalid token` error

**Cause:** JWT_SECRET mismatch between services

**Solution:**
Verify all services use the same JWT_SECRET:
```bash
# Check auth-service
grep JWT_SECRET services/auth-service/.env

# Check core-service
grep JWT_SECRET services/core-service/.env

# Check iot-service
grep JWT_SECRET services/iot-service/.env
```

All should be identical! If not, copy the JWT_SECRET from auth-service to other services and restart.

#### ❌ Issue: `No users found` after seeding

**Cause:** Database not empty, causing upsert conflicts

**Solution:**
```bash
cd packages/shared-database

# Reset database
npm run prisma:migrate:reset

# Re-seed
npm run prisma:seed
```

#### ❌ Issue: Swagger UI not loading

**Cause:** Service not started or port conflict

**Solution:**
```bash
# Verify service is running
curl http://localhost:5000/health

# Check service logs for errors
npm run dev --filter=@sustainpro/auth-service
```

#### ❌ Issue: Docker containers crash on Windows

**Cause:** WSL2 memory issues

**Solution:**
Create/edit `%USERPROFILE%\.wslconfig`:
```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
```

Restart Docker Desktop.

#### ❌ Issue: `ECONNREFUSED` when connecting to services

**Cause:** Services not fully started

**Solution:**
Wait 10-15 seconds after starting services. Services need time to:
- Connect to database
- Initialize Prisma client
- Start HTTP server

---

## 🎓 Next Steps

### Learn the Codebase

1. **Read Architecture Docs**
   - `docs/SHARED_PACKAGES.md` - Understanding shared packages
   - `docs/AUTHENTICATION_GUIDE.md` - Auth system deep dive
   - `docs/PROJECT_STRUCTURE.md` - Overall architecture

2. **Explore Prisma Schema**
   - `packages/shared-database/prisma/schema.prisma` - Database models

3. **Review API Routes**
   - `services/auth-service/src/routes/` - Authentication routes
   - `services/core-service/src/routes/` - Business logic routes

### Start Building

1. **Create a New Endpoint**
   ```typescript
   // services/core-service/src/routes/example.routes.ts
   import { Router } from 'express';
   import { authenticateToken } from '@sustainpro/shared-middleware';
   import { requirePermission } from '@sustainpro/shared-middleware';
   
   const router = Router();
   
   /**
    * @swagger
    * /api/v1/example:
    *   get:
    *     summary: Example endpoint
    *     tags: [Example]
    *     security:
    *       - BearerAuth: []
    */
   router.get('/', 
     authenticateToken, 
     requirePermission('dashboard.view'),
     async (req, res) => {
       res.json({ success: true, message: 'Hello from new endpoint!' });
     }
   );
   
   export default router;
   ```

2. **Add Database Model**
   Edit `packages/shared-database/prisma/schema.prisma`:
   ```prisma
   model Example {
     id        String   @id @default(uuid())
     name      String
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   
     @@map("sps_examples")
   }
   ```
   
   Then run:
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

3. **Use Prisma in Controller**
   ```typescript
   import { prisma } from '@sustainpro/shared-database';
   
   export async function getExamples(req, res) {
     const examples = await prisma.example.findMany();
     res.json({ success: true, data: examples });
   }
   ```

### Testing Checklist

Before pushing code:

- ✅ All services start without errors
- ✅ Swagger UI loads for all services
- ✅ Can login with test credentials
- ✅ Protected endpoints require authentication
- ✅ Prisma Studio shows correct data
- ✅ No TypeScript compilation errors
- ✅ All API endpoints return expected responses

### Join Development

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test**
   ```bash
   npm run dev
   # Test your changes
   ```

3. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Describe what you changed
   - Include screenshots if UI changes
   - Reference any related issues

---

## 📚 Additional Resources

### Documentation
- **Prisma Docs**: https://www.prisma.io/docs
- **Swagger/OpenAPI**: https://swagger.io/docs/
- **Express.js**: https://expressjs.com/
- **Next.js**: https://nextjs.org/docs

### Internal Docs
- `docs/AUTHENTICATION_GUIDE.md` - Complete auth system guide
- `docs/SHARED_PACKAGES.md` - Shared packages explained
- `docs/ISSUE_RESOLUTION.md` - Common issues and fixes
- `docs/RABBITMQ.md` - Message broker setup
- `docs/AWS_IOT_SETUP.md` - IoT infrastructure

### Quick Commands Reference

```bash
# Install dependencies
npm install

# Start all services
npm run dev

# Start only backend
npm run dev:backend

# Generate Prisma client
cd packages/shared-database && npm run prisma:generate

# Open Prisma Studio
cd packages/shared-database && npm run prisma:studio

# Seed database
cd packages/shared-database && npm run prisma:seed

# Reset database
cd packages/shared-database && npm run prisma:migrate:reset

# Start Docker infrastructure
cd docker && docker-compose up -d

# Stop Docker infrastructure
cd docker && docker-compose down

# View Docker logs
docker logs sustainpro-postgres
docker logs sustainpro-rabbitmq
```

---

## 🎉 Success!

If you've completed all steps, you should now have:

- ✅ All Docker containers running (PostgreSQL, RabbitMQ, Redis)
- ✅ Database seeded with test users and permissions
- ✅ All microservices running (Auth, Core, IoT)
- ✅ Frontend accessible at http://localhost:3000
- ✅ Swagger UI available for all services
- ✅ Prisma Studio for database management
- ✅ Ability to login and access protected endpoints

**Welcome to the SustainPro development team! 🚀**

---

## 🆘 Need Help?

- **Check documentation**: `docs/` folder
- **View logs**: `npm run dev` shows all service logs
- **Prisma issues**: Check `packages/shared-database/prisma/schema.prisma`
- **API errors**: Use Swagger UI to test endpoints
- **Database issues**: Use Prisma Studio to inspect data

**Happy coding! 💻**
