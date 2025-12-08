# SustainPro IoT Platform

> Modern IoT platform for environmental monitoring built with Next.js, Node.js, PostgreSQL, and TimescaleDB.

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL + TimescaleDB
- **Authentication**: JWT (ready to implement)

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Charts**: Recharts

## 📁 Project Structure

```
SustainPro/
├── backend/           # Express API
│   ├── sql/          # Database schemas
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── db.ts     # PostgreSQL connection
│   │   └── index.ts  # Express server
│   └── package.json
│
├── frontend/         # Next.js Application  
│   ├── src/
│   │   └── app/     # Next.js pages
│   └── package.json
│
└── .devcontainer/   # GitHub Codespaces config
```

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ with TimescaleDB extension
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Create database and run schema
createdb sustainpro
psql -d sustainpro -f sql/schema.sql

# Start development server
npm run dev
```

Backend runs on **http://localhost:5000**

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment  
cp ENV.example.txt .env.local
# Edit .env.local if needed

# Start development server
npm run dev
```

Frontend runs on **http://localhost:3000**

## 🌐 GitHub Codespaces

This project is configured for GitHub Codespaces for easy client previews and testing.

### Quick Start in Codespaces

1. Click **Code** → **Codespaces** → **Create codespace on main**
2. Wait for container to build (~2-3 minutes)
3. Once ready, both servers auto-start:
   - Frontend: Port 3000 (auto-forwarded)
   - Backend: Port 5000 (auto-forwarded)
4. Click the port forwarding notification to open in browser

### Codespaces Features
- ✅ Pre-configured Node.js 20 environment
- ✅ Auto-installs all dependencies
- ✅ Port forwarding for frontend & backend
- ✅ VS Code extensions pre-installed
- ✅ No local setup required

### Database in Codespaces
> **Note**: PostgreSQL/TimescaleDB not included in Codespaces by default. For full testing:
> - Use a cloud PostgreSQL instance (Supabase, Neon, Azure)
> - Or add PostgreSQL to devcontainer configuration

## 📊 Database Schema

Tables created by `backend/sql/schema.sql`:

- **sps_users** - User authentication
- **sps_user_profiles** - User details
- **sps_devices** - IoT device registry
- **sps_system_settings** - Configuration  
- **sps_telemetry** - Time-series data (TimescaleDB hypertable)

## 🔌 API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Health
- `GET /health` - Server health check

### Users
- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Devices
- `GET /devices` - List devices
- `GET /devices/:id` - Get device
- `POST /devices` - Create device
- `PUT /devices/:id` - Update device

### Telemetry
- `POST /telemetry` - Ingest sensor data
- `GET /telemetry/:device_id` - Get device readings
- `GET /telemetry/:device_id/hourly` - Hourly aggregates
- `GET /telemetry/:device_id/latest` - Latest reading

## 🚢 Deployment

### Azure Deployment (Planned)
- **Database**: Azure Database for PostgreSQL - Flexible Server
- **Backend**: Azure Container Apps
- **Frontend**: Azure Static Web Apps

See deployment documentation (coming soon) for detailed steps.

## 📝 Development Workflow

1. **Local Development** - Develop and test locally
2. **GitHub Push** - Push to GitHub repository
3. **Codespaces Preview** - Share with client via Codespaces
4. **Get Feedback** - Client tests in Codespaces environment
5. **Azure Deployment** - Deploy to production after approval

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Test locally
4. Push and create PR
5. Test in Codespaces
6. Merge after approval

## 📄 License

Proprietary - All rights reserved

## 🔗 Links

- [Backend Documentation](backend/README.md)
- [Database Schema](backend/sql/schema.sql)
- [Implementation Plan](../brain/implementation_plan.md)

---

**Built with** ❤️ **for environmental sustainability**
