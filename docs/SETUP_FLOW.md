# 🎯 SustainPro Setup Flow

Visual guide showing the complete setup process for new developers.

---

## 📊 Setup Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   SustainPro Setup Flow                     │
│                    (~30 minutes total)                       │
└─────────────────────────────────────────────────────────────┘

Step 1: Prerequisites (15 min)
┌──────────────────────────────────────┐
│  ✓ Install Node.js 20.x              │
│  ✓ Install Docker Desktop            │
│  ✓ Install Git                       │
│  ✓ Clone Repository                  │
└──────────────────────────────────────┘
                 │
                 ▼
Step 2: Dependencies (5 min)
┌──────────────────────────────────────┐
│  $ npm install                       │
│                                      │
│  Installs:                           │
│  • All shared packages               │
│  • All service dependencies          │
│  • Frontend dependencies             │
└──────────────────────────────────────┘
                 │
                 ▼
Step 3: Docker Infrastructure (3 min)
┌──────────────────────────────────────┐
│  $ cd docker                         │
│  $ docker-compose up -d              │
│                                      │
│  Starts:                             │
│  • PostgreSQL (port 5432)            │
│  • RabbitMQ (port 5672)              │
│  • Redis (port 6379)                 │
│  • nginx Gateway (port 8080)         │
└──────────────────────────────────────┘
                 │
                 ▼
Step 4: Database Setup (5 min)
┌──────────────────────────────────────┐
│  $ cd packages/shared-database       │
│  $ npm run prisma:generate           │
│  $ npm run prisma:seed               │
│                                      │
│  Creates:                            │
│  • 25 database tables                │
│  • 4 test users (Argon2id hashed)    │
│  • 2 organizations                   │
│  • 11 permissions                    │
└──────────────────────────────────────┘
                 │
                 ▼
Step 5: Start Services (2 min)
┌──────────────────────────────────────┐
│  $ cd ../..                          │
│  $ npm run dev                       │
│                                      │
│  Starts:                             │
│  • Auth Service (port 5000)          │
│  • Core Service (port 5001)          │
│  • IoT Service (port 5002)           │
│  • Frontend (port 3000)              │
└──────────────────────────────────────┘
                 │
                 ▼
Step 6: Verification ✅
┌──────────────────────────────────────┐
│  Test:                               │
│  ✓ Swagger UI (all 3 services)       │
│  ✓ Login API                         │
│  ✓ Protected endpoints               │
│  ✓ Frontend dashboard                │
└──────────────────────────────────────┘
                 │
                 ▼
         🎉 Ready to Code! 🎉
```

---

## 🏗️ System Architecture After Setup

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Browser                         │
└────┬──────────────────────────────────────────────┬─────────┘
     │                                              │
     │ http://localhost:3000                        │ http://localhost:5000-5002/api/v1/docs
     │ (Frontend)                                   │ (Swagger UI)
     │                                              │
     ▼                                              ▼
┌─────────────────┐                      ┌──────────────────────┐
│   Next.js App   │                      │    Swagger Docs      │
│   Port 3000     │                      │    Interactive API   │
└────────┬────────┘                      └──────────────────────┘
         │
         │ API Calls
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx API Gateway                        │
│                       Port 8080                             │
│                 (Routing, CORS, Rate Limiting)              │
└───┬─────────────────────┬─────────────────────┬─────────────┘
    │                     │                     │
    │ /auth               │ /core               │ /iot
    │                     │                     │
    ▼                     ▼                     ▼
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Auth    │         │  Core    │         │  IoT     │
│ Service  │         │ Service  │         │ Service  │
│ :5000    │         │ :5001    │         │ :5002    │
└─────┬────┘         └─────┬────┘         └─────┬────┘
      │                    │                    │
      │                    │                    │
      └────────────────────┴────────────────────┘
                           │
                           │ Prisma ORM
                           │
                           ▼
      ┌────────────────────────────────────────┐
      │         PostgreSQL Database            │
      │             Port 5432                  │
      │                                        │
      │  Tables:                               │
      │  • sps_users (4 users)                 │
      │  • sps_organizations (2 orgs)          │
      │  • sps_permissions (11 perms)          │
      │  • sps_events                          │
      │  • sps_devices                         │
      │  • ... and 20 more tables              │
      └────────────────────────────────────────┘

      ┌────────────────────────────────────────┐
      │            RabbitMQ                    │
      │            Port 5672                   │
      │     (Event-driven messaging)           │
      └────────────────────────────────────────┘

      ┌────────────────────────────────────────┐
      │             Redis                      │
      │            Port 6379                   │
      │          (Caching layer)               │
      └────────────────────────────────────────┘
```

---

## 📦 Shared Packages Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Monorepo Structure                       │
└─────────────────────────────────────────────────────────────┘

packages/
├── shared-database/
│   ├── prisma/
│   │   ├── schema.prisma         ← Database schema (25 models)
│   │   └── seed.ts               ← Database seeder
│   └── src/
│       └── index.ts              ← Exports Prisma client
│
├── shared-types/
│   └── src/
│       ├── user.types.ts         ← User interfaces
│       ├── organization.types.ts ← Organization interfaces
│       └── ... more types
│
├── shared-middleware/
│   └── src/
│       ├── auth.middleware.ts    ← JWT authentication
│       ├── permission.middleware.ts ← RBAC permissions
│       └── error.middleware.ts   ← Error handling
│
├── shared-utils/
│   └── src/
│       ├── logger.ts             ← Winston logger
│       ├── errors.ts             ← Custom error classes
│       └── validators.ts         ← Input validation
│
└── shared-swagger/
    └── src/
        ├── setup.ts              ← Swagger configuration
        └── schemas.ts            ← Common API schemas

        ▲
        │
        │ Imported by
        │
        ▼

services/
├── auth-service/    → Uses all shared packages
├── core-service/    → Uses all shared packages
└── iot-service/     → Uses all shared packages

Benefits:
✓ Write once, use everywhere (DRY)
✓ Type safety across entire stack
✓ Consistent logic in all services
✓ Single source of truth
✓ Easy maintenance
```

---

## 🔄 Development Workflow

```
Day-to-Day Development Flow
───────────────────────────

Morning:
┌────────────────────────────┐
│ 1. Start Docker            │
│    $ cd docker             │
│    $ docker-compose up -d  │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ 2. Start Services          │
│    $ cd ..                 │
│    $ npm run dev           │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ 3. Open Browser            │
│    • Frontend:             │
│      localhost:3000        │
│    • Swagger:              │
│      localhost:5000-5002   │
│      /api/v1/docs          │
└────────────────────────────┘

Coding:
┌────────────────────────────┐
│ Write Code                 │
│  • Edit files              │
│  • Services auto-reload    │
│  • Test in Swagger UI      │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Database Changes?          │
│  • Edit schema.prisma      │
│  • Run prisma:migrate      │
│  • Run prisma:generate     │
│  • Restart services        │
└────────────────────────────┘

Testing:
┌────────────────────────────┐
│ 1. Test in Swagger UI      │
│    • Try endpoints         │
│    • Verify responses      │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ 2. Test in Frontend        │
│    • Login                 │
│    • Test features         │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ 3. Check Database          │
│    $ npm run prisma:studio │
│    • View data             │
│    • Verify changes        │
└────────────────────────────┘

Evening:
┌────────────────────────────┐
│ Commit & Push              │
│  $ git add .               │
│  $ git commit -m "..."     │
│  $ git push                │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Stop Services              │
│  • Ctrl+C (npm run dev)    │
│  • Docker keeps running    │
│    (optional to stop)      │
└────────────────────────────┘
```

---

## 🧪 Testing Flow

```
Authentication Testing
──────────────────────

Method 1: Swagger UI
┌─────────────────────────────────────────┐
│ 1. Open: localhost:5000/api/v1/docs    │
│                                         │
│ 2. POST /auth/login                     │
│    • Try it out                         │
│    • Enter: admin@acme.com/Admin@123    │
│    • Execute                            │
│    • Copy token                         │
│                                         │
│ 3. Click 🔒 Authorize                   │
│    • Enter: Bearer <token>              │
│    • Authorize                          │
│                                         │
│ 4. Test any endpoint!                   │
│    • All are now authenticated          │
└─────────────────────────────────────────┘

Method 2: PowerShell
┌─────────────────────────────────────────┐
│ # Login                                 │
│ $body = '{"email":"admin@acme.com",     │
│          "password":"Admin@123"}'       │
│ $login = Invoke-RestMethod ...          │
│ $token = $login.token                   │
│                                         │
│ # Test endpoint                         │
│ $headers = @{                           │
│   Authorization = "Bearer $token"       │
│ }                                       │
│ $result = Invoke-RestMethod ...         │
└─────────────────────────────────────────┘

Method 3: Frontend
┌─────────────────────────────────────────┐
│ 1. Open: localhost:3000                 │
│ 2. Login: admin@acme.com/Admin@123      │
│ 3. Access dashboard                     │
│ 4. Test all features                    │
└─────────────────────────────────────────┘
```

---

## 🎓 Learning Path

```
Recommended Learning Order
─────────────────────────

Week 1: Setup & Basics
┌────────────────────────────┐
│ ✓ Complete setup           │
│ ✓ Read DEVELOPER_SETUP.md  │
│ ✓ Explore Swagger UI       │
│ ✓ Test authentication      │
│ ✓ Open Prisma Studio       │
└────────────────────────────┘

Week 2: Architecture
┌────────────────────────────┐
│ ✓ Read SHARED_PACKAGES.md  │
│ ✓ Read AUTHENTICATION_     │
│   GUIDE.md                 │
│ ✓ Explore Prisma schema    │
│ ✓ Review service routes    │
└────────────────────────────┘

Week 3: Development
┌────────────────────────────┐
│ ✓ Create new endpoint      │
│ ✓ Add Swagger docs         │
│ ✓ Test with Prisma client  │
│ ✓ Add permission check     │
└────────────────────────────┘

Week 4: Advanced
┌────────────────────────────┐
│ ✓ Database migrations      │
│ ✓ Custom middleware        │
│ ✓ RabbitMQ integration     │
│ ✓ Frontend integration     │
└────────────────────────────┘
```

---

## 📚 Documentation Map

```
Documentation Structure
──────────────────────

🚀 Getting Started
├── README.md                  ← Project overview
├── DEVELOPER_SETUP.md         ← Complete setup guide (START HERE!)
└── SETUP_CHECKLIST.md         ← Quick checklist

🔧 Technical Guides
├── docs/SHARED_PACKAGES.md    ← Shared packages architecture
├── docs/AUTHENTICATION_GUIDE.md ← Auth system deep dive
├── docs/ISSUE_RESOLUTION.md   ← Common issues & fixes
└── docs/PROJECT_STRUCTURE.md  ← Overall architecture

🏗️ Infrastructure
├── docs/NGINX.md              ← API Gateway
├── docs/RABBITMQ.md           ← Message broker
└── docs/AWS_IOT_SETUP.md      ← IoT setup

📱 API Documentation
├── Swagger UI                 ← Interactive API docs
│   ├── localhost:5000/api/v1/docs (Auth)
│   ├── localhost:5001/api/v1/docs (Core)
│   └── localhost:5002/api/v1/docs (IoT)
└── docs/MOBILE_API.md         ← Mobile-specific docs
```

---

## ✅ Success Criteria

After setup, you should have:

```
Infrastructure ✓
├── ✓ Docker containers running (4)
├── ✓ PostgreSQL accepting connections
├── ✓ RabbitMQ management UI accessible
└── ✓ Redis running

Database ✓
├── ✓ 25 tables created
├── ✓ 4 test users seeded
├── ✓ 2 organizations created
└── ✓ 11 permissions configured

Services ✓
├── ✓ Auth service (port 5000)
├── ✓ Core service (port 5001)
├── ✓ IoT service (port 5002)
└── ✓ Frontend (port 3000)

API Documentation ✓
├── ✓ Swagger UI accessible
├── ✓ All endpoints documented
└── ✓ Can test with authentication

Verification ✓
├── ✓ Can login via API
├── ✓ Can access protected endpoints
├── ✓ Can view data in Prisma Studio
└── ✓ Can access frontend dashboard
```

---

## 🆘 Quick Help

**Setup Issues?**
→ Check `DEVELOPER_SETUP.md` Section 8: Troubleshooting

**Docker Problems?**
→ Run: `docker-compose down && docker-compose up -d`

**Database Issues?**
→ Run: `npm run prisma:migrate:reset && npm run prisma:seed`

**Service Errors?**
→ Check: `.env` files have matching JWT_SECRET

**Authentication Failing?**
→ Token field is `token` NOT `access_token`

**Still Stuck?**
→ Check `docs/ISSUE_RESOLUTION.md`

---

**Total Setup Time: ~30 minutes**

**Happy Coding! 🚀**
