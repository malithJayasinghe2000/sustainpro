# SustainPro IoT Platform

Modern IoT platform for environmental monitoring built with Next.js, Node.js, PostgreSQL, and TimescaleDB.

## 🚀 Tech Stack

**Backend:** Node.js + Express + TypeScript + PostgreSQL + TimescaleDB  
**Frontend:** Next.js 16 + TypeScript + Tailwind CSS  
**Database:** PostgreSQL with TimescaleDB extension

## 📁 Project Structure

```
SustainPro/
├── backend/           # Express API
│   ├── sql/          # Database schema
│   └── src/          # Source code
└── frontend/         # Next.js app
    └── src/app/      # Pages
```

## 🛠️ Local Development

### Backend Setup

```bash
cd backend
npm install

# Configure database
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Create database and run schema
createdb sustainpro
psql -d sustainpro -f sql/schema.sql

# Start server
npm run dev
```

Backend runs on **http://localhost:5000**

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**

## 📊 Database Schema

- **sps_users** - User authentication
- **sps_user_profiles** - User details
- **sps_devices** - IoT device registry
- **sps_system_settings** - Configuration
- **sps_telemetry** - Time-series data (TimescaleDB hypertable)

See [backend/sql/schema.sql](backend/sql/schema.sql) for complete schema.

## 🔌 API Endpoints

Base URL: `http://localhost:5000/api/v1`

- **Users:** `/users` - CRUD operations
- **Devices:** `/devices` - Device management
- **Telemetry:** `/telemetry` - Sensor data ingestion & queries

See [backend/README.md](backend/README.md) for detailed API documentation.

## 🔄 Development Workflow

```
Local Development → Git Commit → Git Push → GitHub Repository
```

## 🚢 Deployment (Planned)

- **Database:** Azure Database for PostgreSQL
- **Backend:** Azure Container Apps
- **Frontend:** Azure Static Web Apps

## 📄 License

Proprietary - All rights reserved
