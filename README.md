# SustainPro - IoT Event Management Platform

Enterprise-grade platform for managing IoT-enabled events with real-time monitoring, RBAC, and comprehensive analytics.

## 🚀 Features

### Core Capabilities
- **Multi-tenant Architecture** - Organizations, events, departments, and services
- **Role-Based Access Control (RBAC)** - Granular permissions system
- **Real-time IoT Monitoring** - WebSocket-based device telemetry
- **Event Management** - Complete lifecycle from planning to archival
- **User Management** - Hierarchical roles with custom permissions
- **Advanced Analytics** - Reports and insights dashboard

### Technical Highlights
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, PostgreSQL, Socket.IO
- **Authentication**: JWT with refresh tokens, password hashing (Argon2)
- **Security**: Rate limiting, account lockout, CORS protection
- **Real-time**: WebSocket connections for live device data

## 📂 Project Structure

```
SustainPro/
├── frontend/           # Next.js application
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/# Reusable UI components
│   │   ├── contexts/  # React contexts (Auth, etc.)
│   │   └── lib/       # Utilities and API client
│   └── package.json
│
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── middleware/# Auth, RBAC, etc.
│   │   └── scripts/  # Admin tools
│   ├── migrations/    # Database migrations
│   └── sql/          # Schema definitions
│
└── firmware/         # ESP32 IoT device code
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Runs on: `http://localhost:3000`

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/sustainpro
# JWT_SECRET=your-secret-key
# JWT_REFRESH_SECRET=your-refresh-secret

# Run database migrations
psql -U postgres -d sustainpro -f sql/schema.sql
psql -U postgres -d sustainpro -f migrations/rbac_setup_pgadmin.sql

# Create admin user
npm run create-admin

# Start server
npm run dev
```

Runs on: `http://localhost:5000`

## 🌐 Deployment

See [deployment_guide.md](./deployment_guide.md) for complete instructions on deploying to:
- Frontend: Vercel
- Backend: Railway / Render / Heroku
- Database: PostgreSQL (Heroku, Supabase, etc.)

## 📖 Key Concepts

### Roles Hierarchy
```
Super Admin (Platform)
  └── Organization Admin
      ├── Event Manager
      │   ├── Department Head
      │   │   └── Service Supervisor
      │   │       └── Onsite Technician
      │   └── Viewer (Read-only)
```

### Permissions System
- Dynamic RBAC with permission codes (e.g., `events:create`, `users:delete`)
- Super Admin configurable via UI
- Granular control over features and submenu items

## 🔐 Security Features

- Argon2 password hashing
- JWT access + refresh token pattern
- Rate limiting on authentication endpoints
- Account lockout after failed attempts
- CORS protection
- Input validation and sanitization

## 📱 IoT Integration

- ESP32-based devices
- Real-time telemetry via WebSocket
- Device provisioning workflow
- Custom device models support
- Historical data tracking

## 🎨 UI/UX

- Dark/Light mode support
- Responsive design (mobile-first)
- Global theme system
- Toast notifications
- Loading states and error handling

## 🧪 Testing

```bash
# Frontend
cd frontend
npm run test

# Backend
cd backend
npm run test
```

## 📄 License

Proprietary - All rights reserved

## 👥 Team

Developed by elcoanlanka team

## 🆘 Support

For issues and questions, please contact [support@elcoanlanka.com](mailto:support@elcoanlanka.com)
