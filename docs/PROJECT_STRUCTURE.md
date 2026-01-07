# SustainPro Project Structure Explanation

## 📂 Folder Purposes

### 1. **firmware/** - ESP32 Device Firmware
**Purpose**: Arduino code for ESP32 IoT devices that connect to the platform.

**What it does:**
- Connects ESP32 to WiFi
- Establishes MQTT connection to AWS IoT Core
- Reads sensor data (temperature, humidity, power consumption)
- Publishes telemetry to the cloud
- Receives commands from the platform

**Files:**
- `SustainPro_AWS_Firmware.ino` - Main firmware for AWS IoT integration
- `SustainPro_Firmware.ino` - Alternative firmware (direct HTTP)

**When to use:**
- Flashing new IoT devices
- Updating device firmware
- Testing device connectivity
- Device provisioning via WebSerial

**Technology Stack:**
- Arduino IDE
- ESP32 (WiFi + BLE microcontroller)
- PubSubClient (MQTT library)
- AWS IoT SDK

---

### 2. **scripts/** - Utility Scripts
**Purpose**: Helper scripts for development and testing.

#### `e2e-test.ts`
**Purpose**: End-to-end integration testing of the entire API.

**What it tests:**
- Authentication flow (login, token refresh)
- Organization CRUD operations
- Event management
- Device registration
- Telemetry ingestion
- Socket.IO real-time connections

**How to use:**
```bash
# Install dependencies first
npm install axios socket.io-client

# Run test
npx ts-node scripts/e2e-test.ts
```

**When to use:**
- After major changes to verify nothing broke
- Before production deployment
- CI/CD pipeline integration

#### `generate-password-hashes.ts`
**Purpose**: Generate argon2 password hashes for test users.

**Usage:**
```bash
npx ts-node scripts/generate-password-hashes.ts
```

Outputs hashes for use in `database/seed.sql`.

---

### 3. **database/** - Database Assets
**Purpose**: Database schema, seed data, and migrations.

**Files:**
- `schema.sql` - Complete database schema (25 tables)
- `seed.sql` - Sample data for development
- `migrations/` - SQL migration files for schema updates

**Usage:**
```bash
# Initialize database
psql -U sustainpro -d sustainpro -f database/schema.sql
psql -U sustainpro -d sustainpro -f database/seed.sql
```

---

### 4. **docker/** - Docker Configuration
**Purpose**: Containerization and local development environment.

**Structure:**
```
docker/
├── docker-compose.yml    # Container orchestration
├── nginx/                # API Gateway configuration
│   ├── nginx.conf
│   └── conf.d/
└── rabbitmq/             # Message broker configuration
    ├── rabbitmq.conf
    └── definitions.json
```

**Services:**
- PostgreSQL (database)
- RabbitMQ (message broker)
- Redis (cache)
- nginx (API gateway)
- Auth/Core/IoT services (optional with --profile full)

---

### 5. **docs/** - Documentation
**Purpose**: Comprehensive guides for developers and operations.

| File | Purpose |
|------|---------|
| `SETUP.md` | Local development setup guide |
| `RABBITMQ.md` | Event-driven architecture explanation |
| `NGINX.md` | API Gateway architecture |
| `MOBILE_API.md` | API documentation for mobile apps |
| `AWS_IOT_SETUP.md` | AWS IoT Core configuration |

---

### 6. **frontend/** - Web Application
**Purpose**: Next.js web application for platform management.

**Features:**
- Organization dashboard
- Event management
- Device monitoring
- Real-time telemetry visualization
- User management (RBAC)
- Device provisioning (WebSerial)

**Technology:**
- Next.js 15 (React framework)
- TypeScript
- TailwindCSS
- Socket.IO client

---

### 7. **packages/** - Shared Code
**Purpose**: Reusable code shared across microservices.

**Packages:**

#### `shared-types/`
TypeScript interfaces and types used by all services.
```typescript
export interface User {
  id: string;
  email: string;
  role: string;
}
```

#### `shared-utils/`
Common utility functions (logger, validators, helpers).
```typescript
export const createLogger = (service: string) => { ... }
```

#### `shared-middleware/`
Express middleware (auth, RBAC, validation, error handling).
```typescript
export const authenticate = (req, res, next) => { ... }
```

---

### 8. **services/** - Microservices
**Purpose**: Backend services implementing business logic.

#### `auth-service/` (Port 5000)
- User authentication (login/logout)
- JWT token management
- User CRUD
- RBAC (roles, permissions, policies)

#### `core-service/` (Port 5001)
- Organization management
- Event lifecycle management
- Department/service management
- Device registration
- File uploads

#### `iot-service/` (Port 5002)
- Telemetry ingestion
- AWS IoT webhook handler
- Socket.IO real-time streaming
- Alert processing

---

## 🔄 Why Each Component Exists

### Why RabbitMQ?
**Problem**: Services calling each other directly = tight coupling.

**Solution**: Event-driven architecture.
```
core-service creates organization
    ↓
Publishes "organization.created" to RabbitMQ
    ↓
Multiple services consume:
    - Notification service → Send welcome email
    - Analytics service → Track metrics
    - Audit service → Log action
```

### Why nginx?
**Problem**: Clients connecting to 3 different service URLs, managing CORS separately.

**Solution**: Single API Gateway.
```
Client → nginx:8080 → Routes to appropriate service
                   → Handles CORS centrally
                   → Rate limiting
                   → Load balancing
```

### Why Separate Services?
**Monolith Issues:**
- One bug crashes entire app
- Can't scale parts independently
- Hard to maintain large codebase

**Microservices Benefits:**
- Independent scaling (scale IoT service during high telemetry)
- Fault isolation (auth failure doesn't crash telemetry)
- Technology flexibility (use different languages)
- Team autonomy (different teams own different services)

---

## 🚀 Development Workflow

### 1. First Time Setup
```bash
# Install dependencies
npm install

# Start infrastructure
cd docker
docker-compose up -d postgres rabbitmq redis

# Initialize database
psql -U sustainpro -d sustainpro -f ../database/schema.sql
psql -U sustainpro -d sustainpro -f ../database/seed.sql

# Build all packages
npm run build
```

### 2. Daily Development
```bash
# Start services in development mode
npm run dev

# Or individually:
npm run dev --filter @sustainpro/auth-service
npm run dev --filter @sustainpro/core-service
npm run dev --filter @sustainpro/iot-service
npm run dev --filter frontend
```

### 3. Testing
```bash
# Unit tests
npm test

# E2E tests (requires services running)
npx ts-node scripts/e2e-test.ts
```

### 4. Deployment
```bash
# Build Docker images
cd docker
docker-compose --profile full build

# Deploy
docker-compose --profile full up -d
```

---

## 📊 Data Flow Examples

### User Login
```
Frontend → nginx:8080/api/v1/auth/login
         → auth-service:5000
         → PostgreSQL (verify credentials)
         → Generate JWT
         → Return tokens to client
```

### Device Telemetry
```
ESP32 → AWS IoT Core
      → Lambda webhook
      → nginx:8080/api/v1/telemetry
      → iot-service:5002
      → PostgreSQL (store data)
      → Socket.IO (broadcast to dashboard)
      → Frontend (real-time chart update)
```

### Create Organization
```
Frontend → nginx:8080/api/v1/organizations
         → core-service:5001
         → PostgreSQL (insert record)
         → RabbitMQ (publish "organization.created")
         → Return response
         
(Async) RabbitMQ → Notification service → Send email
                → Analytics service → Update metrics
                → Audit service → Log action
```

---

## 🎯 Recommended Reading Order

For new developers:
1. `docs/SETUP.md` - Get the project running
2. This file - Understand structure
3. `docs/NGINX.md` - How routing works
4. `docs/RABBITMQ.md` - Event-driven architecture
5. `docs/MOBILE_API.md` - API endpoints

For DevOps:
1. `docs/SETUP.md` - Deployment guide
2. `docker/docker-compose.yml` - Container orchestration
3. `docs/AWS_IOT_SETUP.md` - Cloud infrastructure

For Hardware/Firmware:
1. `firmware/SustainPro_AWS_Firmware.ino` - Device code
2. `docs/AWS_IOT_SETUP.md` - AWS IoT configuration
3. `docs/MOBILE_API.md` - Backend API for devices
