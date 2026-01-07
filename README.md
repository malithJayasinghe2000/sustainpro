# SustainPro - IoT Event Management & Provisioning Platform

Enterprise-grade platform for managing IoT-enabled events with real-time monitoring, RBAC, and streamlined device provisioning.

## 🏗️ Architecture

SustainPro uses a **microservices architecture** with an API Gateway for unified access:

```
                         Port 8080
                    ┌─────────────────┐
       Client ──────│  Nginx Gateway  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌─────▼─────┐        ┌────▼────┐
   │  Auth   │         │   Core    │        │   IoT   │
   │  :5000  │         │   :5001   │        │  :5002  │
   └─────────┘         └───────────┘        └─────────┘
```

| Service | Port | Responsibility |
|---------|------|----------------|
| **Gateway** | 8080 | Routing, CORS, Rate Limiting, WebSocket |
| **Auth Service** | 5000 | Authentication, Users, RBAC |
| **Core Service** | 5001 | Organizations, Events, Departments, Devices |
| **IoT Service** | 5002 | Telemetry, Socket.IO, Real-time Streaming |

## 🚀 Features

### Core Capabilities
- **Multi-tenant Architecture** - Organizations, events, departments, and services
- **Role-Based Access Control (RBAC)** - Granular permissions system with dynamic policies
- **Real-time IoT Monitoring** - Live telemetry dashboard with AWS IoT Core integration
- **Event Lifecycle Management** - Complete flow from planning to archival
- **Device Provisioning** - Browser-based WebSerial provisioning for ESP32 devices

### Technical Highlights
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, PostgreSQL, Socket.IO
- **IoT Infrastructure**: AWS IoT Core, MQTT, ngrok (dev), ESP32 Firmware
- **Authentication**: JWT access/refresh tokens, Argon2 password hashing
- **Security**: Rate limiting, account lockout, CORS protection, Input validation

## 📂 Project Structure

```
SustainPro/
├── database/              # Database files
│   ├── schema.sql         # Complete database schema (25 tables)
│   ├── seed.sql           # Sample data for development
│   └── migrations/        # SQL migration files
│
├── docker/                # Docker configuration
│   ├── docker-compose.yml # Development environment
│   ├── nginx/             # API Gateway configuration
│   │   ├── nginx.conf     # Main nginx config
│   │   └── conf.d/        # Server blocks & routing
│   └── rabbitmq/          # Message broker configuration
│       ├── rabbitmq.conf  # RabbitMQ settings
│       └── definitions.json # Pre-configured exchanges/queues
│
├── docs/                  # Documentation
│   ├── SETUP.md           # 📘 Local development guide
│   ├── RABBITMQ.md        # 📨 Event-driven architecture explained
│   ├── NGINX.md           # 🌐 API Gateway explained
│   ├── MOBILE_API.md      # 📱 Mobile API documentation
│   └── AWS_IOT_SETUP.md   # ☁️ AWS IoT configuration
│
├── firmware/              # ESP32 IoT Firmware
│   └── SustainPro_AWS_Firmware.ino
│
├── frontend/              # Next.js 15 application
│   ├── src/
│   │   ├── app/           # Pages and layouts
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth, Theme)
│   │   └── lib/           # API clients and utilities
│   └── package.json
│
├── packages/              # Shared packages (pnpm workspace)
│   ├── shared-types/      # TypeScript interfaces
│   ├── shared-utils/      # Common utilities, logger
│   └── shared-middleware/ # Express middleware
│
├── scripts/               # Utility scripts
│   ├── e2e-test.ts        # End-to-end integration tests
│   └── generate-password-hashes.ts # Password hash generator
│
├── services/              # Microservices
│   ├── auth-service/      # Authentication & Authorization (Port 5000)
│   │   ├── src/
│   │   │   ├── routes/    # Auth, User, RBAC routes
│   │   │   ├── services/  # Business logic
│   │   │   ├── repositories/ # Database access
│   │   │   └── middleware/   # Auth middleware
│   │   └── Dockerfile
│   ├── core-service/      # Core Business Logic (Port 5001)
│   │   ├── src/
│   │   │   ├── routes/    # Organizations, Events, Departments, Devices
│   │   │   ├── services/  # Business logic
│   │   │   ├── repositories/ # Database access
│   │   │   └── messaging/ # RabbitMQ event publisher
│   │   └── Dockerfile
│   └── iot-service/       # Real-time Telemetry (Port 5002)
│       ├── src/
│       │   ├── routes/    # Telemetry ingestion, Webhooks
│       │   ├── services/  # Telemetry processing
│       │   ├── socket/    # Socket.IO real-time handlers
│       │   └── repositories/ # Database access
│       └── Dockerfile
│
├── .dockerignore          # Docker build optimization
├── .env.example           # Environment template
├── turbo.json             # Turborepo configuration
└── pnpm-workspace.yaml    # pnpm workspace configuration
```

### 🏗️ Architecture Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API Gateway** | nginx | Routing, CORS, Rate limiting, Load balancing |
| **Message Broker** | RabbitMQ | Event-driven async communication |
| **Cache** | Redis | Session storage, rate limiting |
| **Database** | PostgreSQL 16 | Primary data store |
| **Frontend** | Next.js 15 + React | Web application |
| **Services** | Node.js + Express | Microservices |

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| **[SETUP.md](docs/SETUP.md)** | 📘 Complete local development setup guide |
| **[PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** | 📂 Detailed explanation of every folder |
| **[IMPLEMENTATION_PHASES.md](docs/IMPLEMENTATION_PHASES.md)** | 🏗️ Migration phases and architecture evolution |
| **[RABBITMQ.md](docs/RABBITMQ.md)** | 📨 Event-driven architecture explained |
| **[NGINX.md](docs/NGINX.md)** | 🌐 API Gateway configuration and routing |
| **[MOBILE_API.md](docs/MOBILE_API.md)** | 📱 API endpoints for mobile/devices |
| **[AWS_IOT_SETUP.md](docs/AWS_IOT_SETUP.md)** | ☁️ AWS IoT Core setup instructions |

### Quick Reference

- **New to the project?** → Start with `docs/SETUP.md`
- **Understanding structure?** → Read `docs/PROJECT_STRUCTURE.md`
- **Why RabbitMQ?** → See `docs/RABBITMQ.md`
- **How does routing work?** → Check `docs/NGINX.md`
- **What are the phases?** → Review `docs/IMPLEMENTATION_PHASES.md`

---

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Docker Desktop
- AWS IoT Core Account (optional, for IoT features)

### Quick Start

**📘 Full setup guide:** [`docs/SETUP.md`](docs/SETUP.md)

1. **Install pnpm and Dependencies**
   ```bash
   npm install -g pnpm@latest
   pnpm install
   ```

2. **Start All Services with Docker**
   ```bash
   cd docker
   docker-compose up -d
   ```

3. **Initialize Database**
   ```bash
   docker exec -i sustainpro-postgres psql -U sustainpro -d sustainpro < database/schema.sql
   docker exec -i sustainpro-postgres psql -U sustainpro -d sustainpro < database/seed.sql
   ```

4. **Access Services**
   - API Gateway: http://localhost:8080
   - RabbitMQ Management: http://localhost:15672
   - Frontend: http://localhost:3000

### Development Mode (Individual Services)

```bash
# Start infrastructure only
cd docker
docker-compose up -d postgres redis rabbitmq gateway

# Run services in watch mode
pnpm --filter @sustainpro/auth-service dev    # Terminal 1
pnpm --filter @sustainpro/core-service dev    # Terminal 2
pnpm --filter @sustainpro/iot-service dev     # Terminal 3
pnpm --filter @sustainpro/frontend dev        # Terminal 4
```

### Build All Packages

```bash
pnpm build
```

## 🌐 Deployment

### Docker Compose (Production)

```bash
cd docker
cp .env.example .env    # Configure production secrets
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD

GitHub Actions workflow automatically:
1. Builds and tests all services
2. Creates Docker images
3. Pushes to GitHub Container Registry
4. Deploys to production server

See `.github/workflows/ci-cd.yml` for details.

## 📡 API Endpoints

All requests go through the API Gateway at `http://localhost:8080`:

| Endpoint | Service | Description |
|----------|---------|-------------|
| `/api/v1/auth/*` | Auth | Login, logout, refresh |
| `/api/v1/users/*` | Auth | User management |
| `/api/v1/rbac/*` | Auth | Role management |
| `/api/v1/organizations/*` | Core | Organization CRUD |
| `/api/v1/events/*` | Core | Event management |
| `/api/v1/departments/*` | Core | Department management |
| `/api/v1/devices/*` | Core | Device management |
| `/api/v1/device-models/*` | Core | Device model catalog |
| `/api/v1/telemetry/*` | IoT | Telemetry ingestion |
| `/socket.io/*` | IoT | Real-time WebSocket |

## 📖 Key Concepts

- **Roles & Permissions**: Hierarchical structure from Super Admin down to Onsite Technician.
- **Telemetry Flow**: Device -> AWS IoT Core -> Backend Webhook -> Socket.IO -> Dashboard.
- **Provisioning**: Connect ESP32 via USB and use the "Add Device" modal to flash WiFi credentials.

## 🔐 Security

- **Strict RBAC**: Dynamic permission checks on every route.
- **Secure Provisioning**: WebSerial reduces manual credential handling.
- **Data Integrity**: Validation schemas for all inputs and telemetry.

## 🧪 Testing

```bash
# Build all packages
pnpm build

# Run E2E Integration Tests (requires services running)
pnpm ts-node scripts/e2e-test.ts

# Run all tests
pnpm test
```

### Health Checks

```bash
# Gateway
curl http://localhost:8080/health

# Services (direct)
curl http://localhost:5000/health  # Auth
curl http://localhost:5001/health  # Core
curl http://localhost:5002/health  # IoT
```

## 📄 License

Proprietary - All rights reserved

## 👥 Team

Developed by **Elcoan Lanka** team

## 🆘 Support

For issues and questions, please contact **[support@elcoanlanka.lk](mailto:support@elcoanlanka.lk)**
