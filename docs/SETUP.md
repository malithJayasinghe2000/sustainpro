# SustainPro - Local Development Setup Guide

This guide will help you set up the SustainPro IoT platform for local development.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start with Docker](#quick-start-with-docker)
3. [Manual Setup](#manual-setup)
4. [Database Setup](#database-setup)
5. [Running Services](#running-services)
6. [Testing the API](#testing-the-api)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x LTS | JavaScript runtime |
| pnpm | 9.x | Package manager |
| Docker Desktop | Latest | Container runtime |
| PostgreSQL | 16+ | Database (optional if using Docker) |
| Git | Latest | Version control |

### Install Node.js
```bash
# Windows (using winget)
winget install OpenJS.NodeJS.LTS

# macOS (using Homebrew)
brew install node@20
```

### Install pnpm
```bash
npm install -g pnpm@latest
```

### Install Docker Desktop
- **Windows/macOS**: Download from [docker.com](https://www.docker.com/products/docker-desktop/)
- **Linux**: Follow [official installation guide](https://docs.docker.com/engine/install/)

---

## Quick Start with Docker

The fastest way to get started is using Docker Compose.

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sustainpro
```

### 2. Copy Environment File
```bash
cp .env.example .env
```

### 3. Start Infrastructure Services
```bash
cd docker
docker-compose up -d
```

This starts **infrastructure only** (not microservices):
- **PostgreSQL** on port `5432`
- **RabbitMQ** on port `5672` (Management UI: `15672`)
- **Redis** on port `6379`
- **nginx Gateway** on port `8080`

**Note**: Microservices (auth, core, iot) are NOT started. Continue to step 4 to run them.

### 4. Initialize Database
```bash
# From project root (not docker folder)
docker exec -i sustainpro-postgres psql -U sustainpro -d sustainpro < database/schema.sql
docker exec -i sustainpro-postgres psql -U sustainpro -d sustainpro < database/seed.sql
```

### 5. Start Microservices (Choose One Method)

**Method A: Run All Services Together (Recommended)**
```bash
# From project root
npm install
npm run dev
```

**Method B: Run Services Individually**
```bash
# Terminal 1 - Auth Service
npm run dev --filter @sustainpro/auth-service

# Terminal 2 - Core Service
npm run dev --filter @sustainpro/core-service

# Terminal 3 - IoT Service
npm run dev --filter @sustainpro/iot-service
```

**Method C: Run Everything in Docker**
```bash
cd docker
docker-compose --profile full up -d
```

### 6. Verify Everything Works
```bash
# Check infrastructure
docker-compose ps

# Test services
curl http://localhost:5000/health  # Auth
curl http://localhost:5001/health  # Core
curl http://localhost:5002/health  # IoT
curl http://localhost:8080/health  # Gateway
```

### 7. Access the Application

- **API Gateway**: http://localhost:8080
- **RabbitMQ Management**: http://localhost:15672
- **Frontend**: http://localhost:3000 (if running separately)

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| PostgreSQL | sustainpro | sustainpro_dev |
| RabbitMQ | sustainpro | sustainpro_dev |
| Admin User | admin@acme.com | Admin@123 |
| Manager User | manager@acme.com | Manager@123 |

---

## Manual Setup (Alternative)

### 1. Install Dependencies
```bash
# From project root
pnpm install
```

### 2. Start Infrastructure Services
```bash
cd docker

# Start only infrastructure (DB, Redis, RabbitMQ)
docker-compose up -d postgres redis rabbitmq
```

### 3. Set Up Environment Variables

Copy environment files for each service:
```bash
# From project root
cp services/auth-service/.env.example services/auth-service/.env
cp services/core-service/.env.example services/core-service/.env
cp services/iot-service/.env.example services/iot-service/.env
```

### 4. Build Packages
```bash
# Build all shared packages and services
pnpm build
```

### 5. Run Services in Development Mode
```bash
# Terminal 1 - Auth Service
pnpm --filter @sustainpro/auth-service dev

# Terminal 2 - Core Service
pnpm --filter @sustainpro/core-service dev

# Terminal 3 - IoT Service
pnpm --filter @sustainpro/iot-service dev

# Terminal 4 - Frontend
pnpm --filter @sustainpro/frontend dev
```

---

## Database Setup

### Using psql (PostgreSQL 17 on Windows)
```powershell
# Path to psql
$PSQL = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

# Create database and user
& $PSQL -U postgres -c "CREATE DATABASE sustainpro;"
& $PSQL -U postgres -c "CREATE USER sustainpro WITH PASSWORD 'sustainpro_dev';"
& $PSQL -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE sustainpro TO sustainpro;"

# Run schema
& $PSQL -U sustainpro -d sustainpro -f database/schema.sql

# Load seed data
& $PSQL -U sustainpro -d sustainpro -f database/seed.sql
```

### Using Docker
```bash
# Execute schema in container
docker exec -i sustainpro-postgres psql -U sustainpro -d sustainpro < database/schema.sql
docker exec -i sustainpro-postgres psql -U sustainpro -d sustainpro < database/seed.sql
```

### Verify Database Setup
```bash
# Check tables were created
docker exec -it sustainpro-postgres psql -U sustainpro -d sustainpro -c "\dt sps_*"
```

Expected output: 25+ tables with `sps_` prefix.

---

## Running Services

### Using Turbo (Recommended for Development)
```bash
# Run all services in development mode
pnpm dev

# Run specific service
pnpm --filter @sustainpro/auth-service dev
pnpm --filter @sustainpro/core-service dev
pnpm --filter @sustainpro/iot-service dev
```

### Using Docker Compose
```bash
cd docker

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f auth-service

# Stop services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```

### Service Endpoints

| Service | Direct URL | Via Gateway |
|---------|------------|-------------|
| Auth | http://localhost:5000 | http://localhost:8080/api/v1/auth |
| Core | http://localhost:5001 | http://localhost:8080/api/v1/* |
| IoT | http://localhost:5002 | http://localhost:8080/api/v1/telemetry |
| Frontend | http://localhost:3000 | - |

---

## Testing the API

### Health Check
```bash
# Auth service
curl http://localhost:5000/health

# Core service
curl http://localhost:5001/health

# IoT service
curl http://localhost:5002/health

# Gateway
curl http://localhost:8080/health
```

### Authentication
```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin@123"}'

# Response includes accessToken and refreshToken
```

### Authenticated Request
```bash
# Get organizations (requires auth)
curl http://localhost:8080/api/v1/organizations \
  -H "Authorization: Bearer <your-access-token>"
```

---

## RabbitMQ Management

Access the RabbitMQ Management UI at: http://localhost:15672

- **Username**: sustainpro
- **Password**: sustainpro_dev

### Pre-configured Resources

**Exchanges:**
- `sustainpro.events` - Topic exchange for device events
- `sustainpro.telemetry` - Direct exchange for telemetry data
- `sustainpro.alerts` - Fanout exchange for alerts
- `sustainpro.dlx` - Dead letter exchange

**Queues:**
- `device.events` - Device lifecycle events
- `telemetry.raw` - Raw telemetry data
- `telemetry.processed` - Processed telemetry
- `alerts` - System alerts
- `notifications` - User notifications

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <pid> /F
```

#### 2. Database Connection Failed
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
docker exec -it sustainpro-postgres pg_isready
```

#### 3. RabbitMQ Connection Error
The services are configured to work even if RabbitMQ is unavailable. Check logs:
```bash
docker-compose logs rabbitmq
```

#### 4. pnpm Install Fails
```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules
pnpm install
```

#### 5. TypeScript Build Errors
```bash
# Rebuild all packages
pnpm clean
pnpm build
```

### Logs Location

**Docker:**
```bash
docker-compose logs -f <service-name>
```

**Local Development:**
Logs are output to console in development mode.

### Reset Everything
```bash
# Stop all containers and remove volumes
cd docker
docker-compose down -v

# Remove node_modules
cd ..
pnpm clean
rm -rf node_modules

# Fresh install
pnpm install
pnpm build
```

---

## Project Structure

```
sustainpro/
├── database/           # Database schema and migrations
│   ├── schema.sql      # Complete database schema
│   └── seed.sql        # Sample data for development
├── docker/             # Docker configuration
│   ├── docker-compose.yml
│   ├── nginx/          # API gateway configuration
│   └── rabbitmq/       # Message broker configuration
├── docs/               # Documentation
├── frontend/           # Next.js frontend application
├── packages/           # Shared packages
│   ├── shared-types/   # TypeScript types/interfaces
│   ├── shared-utils/   # Utility functions
│   └── shared-middleware/ # Express middleware
└── services/           # Microservices
    ├── auth-service/   # Authentication & authorization
    ├── core-service/   # Organizations, users, departments
    └── iot-service/    # Devices, telemetry, alerts
```

---

## Next Steps

1. **Frontend Development**: Start the frontend with `pnpm --filter @sustainpro/frontend dev`
2. **API Documentation**: See [API Documentation](./docs/MOBILE_API.md)
3. **AWS IoT Setup**: See [AWS IoT Setup Guide](./docs/AWS_IOT_SETUP.md)

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review service logs
3. Open an issue on GitHub
