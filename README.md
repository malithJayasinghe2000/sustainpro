# SustainPro - IoT Event Management & Provisioning Platform

Enterprise-grade platform for managing IoT-enabled events with real-time monitoring, RBAC, and streamlined device provisioning.

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
├── frontend/           # Next.js 15 application (App Router)
│   ├── src/
│   │   ├── app/       # Pages and layouts
│   │   ├── components/# Reusable UI components & Widgets
│   │   ├── contexts/  # React contexts (Auth, Theme)
│   │   └── lib/       # API clients and utilities
│   └── package.json
│
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/    # API endpoints (inc. AWS IoT Webhook)
│   │   ├── middleware/# Auth, RBAC, Validation
│   │   └── scripts/   # Admin and maintenance tools
│   ├── migrations/    # Database migrations
│   └── sql/           # Schema definitions
│
├── firmware/          # IoT Device Firmware
│   └── SustainPro_AWS_Firmware.ino  # ESP32 AWS MQTT Client
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- AWS IoT Core Account (for IoT features)
- npm or yarn

### Quick Start

1. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Runs on: `http://localhost:3000`

2. **Backend**
   ```bash
   cd backend
   npm install
   
   # Setup Environment
   cp .env.example .env
   # Update .env with DB credentials and AWS IoT secrets
   
   # Database Setup
   npm run migrate       # Run migrations
   npm run create-admin  # Create initial admin user
   
   # Start Server
   npm run dev
   ```
   Runs on: `http://localhost:5000`

3. **IoT Development (Data Flow)**
   - Start ngrok: `ngrok http 5000` (Use fixed domain if available)
   - Update AWS IoT Rule endpoint to ngrok URL
   - Flash firmware to ESP32

## 🌐 Deployment

See [deployment_guide.md](./docs/deployment_guide.md) for complete instructions.

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
# Frontend Tests
cd frontend && npm run test

# Backend Tests
cd backend && npm run test
```

## 📄 License

Proprietary - All rights reserved

## 👥 Team

Developed by **Elcoan Lanka** team

## 🆘 Support

For issues and questions, please contact **[support@elcoanlanka.lk](mailto:support@elcoanlanka.lk)**
