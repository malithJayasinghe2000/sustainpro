@echo off
REM ==========================================
REM SustainPro Local Development Setup Script
REM ==========================================
REM Usage: scripts\setup-local.bat
REM Or: npm run setup:local:win

echo.
echo 🚀 SustainPro Local Development Setup
echo ======================================
echo.

REM Navigate to project root
cd /d "%~dp0\.."

echo Step 1/5: Starting Docker containers (postgres, rabbitmq, redis, gateway)...
cd docker
docker-compose up -d postgres rabbitmq redis gateway
cd ..

echo Step 2/5: Waiting for database to be ready...
timeout /t 5 /nobreak > nul

echo Step 3/5: Generating Prisma client...
call npm run prisma:generate -w packages/shared-database

echo Step 4/5: Running database migrations/push...
call npm run prisma:push -w packages/shared-database

echo Step 5/5: Seeding database...
call npm run prisma:seed -w packages/shared-database

echo.
echo ✅ Local setup complete!
echo.
echo Next steps:
echo   - Start backend services: npm run dev:backend
echo   - Start frontend: npm run dev:frontend
echo   - Or start all: npm run dev
echo.
echo Access points:
echo   - Frontend: http://localhost:3000
echo   - API Gateway: http://localhost:8080
echo   - RabbitMQ UI: http://localhost:15672
echo.
