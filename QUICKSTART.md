# 🚀 SustainPro Setup - Step by Step Guide

Follow these steps **exactly** to set up SustainPro locally.

---

## ✅ Step 1: Infrastructure is Already Running!

You already have these running (keep them running):
```
✅ PostgreSQL - Port 5432
✅ RabbitMQ - Port 5672, Management UI: http://localhost:15672
✅ Redis - Port 6379 (for caching and sessions)
✅ nginx Gateway - Port 8080
```

**What is Redis?** It's a super-fast cache for:
- User sessions (login state)
- JWT token blacklist (logout)
- Rate limiting
- Temporary data storage

---

## ✅ Step 2: Database is Initialized

Your database already has 25 tables created. You can verify:
```powershell
docker exec -i sustainpro-postgres psql -U sustainpro -d sustainpro -c "\dt sps_*"
```

---

## 🎯 Step 3: Start Microservices

Open **3 separate PowerShell terminals** and run one command in each:

### Terminal 1 - Auth Service
```powershell
cd D:\sustainpro\services\auth-service
npm run dev
```

Wait until you see: `Auth Service running on port 5000`

### Terminal 2 - Core Service  
```powershell
cd D:\sustainpro\services\core-service
npm run dev
```

Wait until you see: `Core Service running on port 5001`

### Terminal 3 - IoT Service
```powershell
cd D:\sustainpro\services\iot-service
npm run dev
```

Wait until you see: `IoT Service running on port 5002`

---

## ✅ Step 4: Verify Everything Works

Open a **4th terminal** and test:

```powershell
# Test Auth Service
curl http://localhost:5000/health -UseBasicParsing

# Test Core Service
curl http://localhost:5001/health -UseBasicParsing

# Test IoT Service
curl http://localhost:5002/health -UseBasicParsing

# Test Gateway (routes through nginx)
curl http://localhost:8080/health -UseBasicParsing
```

All should return `{"status":"healthy"}` or similar.

---

## 🎉 Step 5: Test the API

### Login Test
```powershell
# Login as admin
curl http://localhost:8080/api/v1/auth/login `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@acme.com","password":"Admin@123"}' `
  -UseBasicParsing
```

You should get a response with `accessToken` and `refreshToken`.

### Get Organizations
```powershell
# First, save the token from login response
$token = "YOUR_ACCESS_TOKEN_HERE"

# Get organizations
curl http://localhost:8080/api/v1/organizations `
  -Headers @{Authorization="Bearer $token"} `
  -UseBasicParsing
```

---

## 📊 What You Now Have Running

```
Infrastructure:
├── PostgreSQL (5432) ✅
├── RabbitMQ (5672) ✅  
├── Redis (6379) ✅
└── nginx Gateway (8080) ✅

Microservices:
├── Auth Service (5000) - Login, Users, RBAC
├── Core Service (5001) - Organizations, Events, Devices
└── IoT Service (5002) - Telemetry, Socket.IO
```

---

## 🔗 Useful URLs

- **API Gateway**: http://localhost:8080
- **RabbitMQ Management UI**: http://localhost:15672
  - Username: `sustainpro`
  - Password: `sustainpro_dev`

---

## ❓ Common Issues

### Issue: "Cannot connect to port 5000/5001/5002"
**Solution**: Make sure the service terminal shows "running on port X". If not, check the error messages in that terminal.

### Issue: Services crash immediately
**Solution**: Check `.env` files exist in each service folder:
```powershell
# Check if .env files exist
Test-Path D:\sustainpro\services\auth-service\.env
Test-Path D:\sustainpro\services\core-service\.env
Test-Path D:\sustainpro\services\iot-service\.env
```

If missing, copy from `.env.example`:
```powershell
Copy-Item D:\sustainpro\services\auth-service\.env.example D:\sustainpro\services\auth-service\.env
Copy-Item D:\sustainpro\services\core-service\.env.example D:\sustainpro\services\core-service\.env
Copy-Item D:\sustainpro\services\iot-service\.env.example D:\sustainpro\services\iot-service\.env
```

### Issue: "Module not found" errors
**Solution**: Install dependencies in each service:
```powershell
cd D:\sustainpro
npm install
```

### Issue: Gateway shows "unhealthy"
**Solution**: This is normal until all 3 services are running. Once services are up, gateway becomes healthy.

---

## 🎯 Next Steps

Once all services are running:

1. **Test the API** using the examples above
2. **Access RabbitMQ UI** at http://localhost:15672
3. **Start the Frontend** (optional):
   ```powershell
   cd D:\sustainpro\frontend
   npm run dev
   ```
   Access at: http://localhost:3000

---

## 📚 Need More Help?

- **Understanding the structure**: Read `docs/PROJECT_STRUCTURE.md`
- **Why RabbitMQ?**: Read `docs/RABBITMQ.md`
- **How routing works?**: Read `docs/NGINX.md`
- **API endpoints**: Read `docs/MOBILE_API.md`
