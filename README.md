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
├── frontend/              # Next.js 15 application
│   ├── src/
│   │   ├── app/           # Pages and layouts
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth, Theme)
│   │   └── lib/           # API clients and utilities
│   └── package.json
│
├── services/              # Microservices
│   ├── gateway/           # Nginx API Gateway
│   │   ├── nginx.conf     # Production config
│   │   ├── nginx.dev.conf # Development config
│   │   └── Dockerfile
│   ├── auth-service/      # Authentication & Users
│   │   ├── src/
│   │   │   ├── routes/    # Auth, User, RBAC routes
│   │   │   ├── services/  # Business logic
│   │   │   └── repositories/
│   │   └── Dockerfile
│   ├── core-service/      # Core Business Logic
│   │   ├── src/
│   │   │   ├── routes/    # Orgs, Events, Devices, etc.
│   │   │   ├── services/
│   │   │   └── repositories/
│   │   └── Dockerfile
│   └── iot-service/       # Real-time Telemetry
│       ├── src/
│       │   ├── socket/    # Socket.IO handlers
│       │   ├── routes/    # Telemetry, Webhooks
│       │   └── services/
│       └── Dockerfile
│
├── packages/              # Shared packages (npm workspace)
│   ├── shared-types/      # TypeScript interfaces
│   ├── shared-utils/      # Common utilities, logger
│   └── shared-middleware/ # Express middleware
│
├── docker/                # Docker Compose configs
│   ├── docker-compose.yml     # Development
│   └── docker-compose.prod.yml# Production
│
├── firmware/              # ESP32 IoT Firmware
│   └── SustainPro_AWS_Firmware.ino
│
└── docs/                  # Documentation
    └── restructure/       # Migration guides
```

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Docker Desktop (for Gateway)
- AWS IoT Core Account (optional, for IoT features)

### Quick Start

1. **Install Dependencies**
   ```bash
   npm install          # Installs all workspaces
   ```

2. **Start Infrastructure (PostgreSQL, RabbitMQ)**
   ```bash
   cd docker
   docker-compose up -d postgres rabbitmq
   ```

3. **Start Microservices**
   ```bash
   # Terminal 1 - Auth Service
   cd services/auth-service
   cp .env.example .env   # Configure database credentials
   npm run dev

   # Terminal 2 - Core Service  
   cd services/core-service
   cp .env.example .env
   npm run dev

   # Terminal 3 - IoT Service
   cd services/iot-service
   cp .env.example .env
   npm run dev
   ```

4. **Start API Gateway**
   ```bash
   cd services/gateway
   docker build -t sustainpro-gateway .
   docker run -d -p 8080:8080 --add-host=host.docker.internal:host-gateway \
     -v "${PWD}/nginx.dev.conf:/etc/nginx/nginx.conf:ro" \
     --name sustainpro-gw sustainpro-gateway
   ```

5. **Start Frontend**
   ```bash
   cd frontend
   cp .env.local.example .env.local
   npm run dev
   ```
   
   Access at: `http://localhost:3000`
   API Gateway: `http://localhost:8080`

### Running All Services (Alternative)

Using Turbo (runs all services in watch mode):
```bash
npm run dev
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
npm run build

# Run E2E Integration Tests (requires services running)
npx ts-node scripts/e2e-test.ts

# Frontend Tests
cd frontend && npm run test

# Individual Service Tests
cd services/auth-service && npm run test
cd services/core-service && npm run test
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
