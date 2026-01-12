#!/bin/bash
# ==========================================
# SustainPro Local Development Setup Script
# ==========================================
# Usage: ./scripts/setup-local.sh
# Or: npm run setup:local

set -e

echo "🚀 SustainPro Local Development Setup"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/.."

echo -e "${YELLOW}Step 1/5: Starting Docker containers (postgres, rabbitmq, redis, gateway)...${NC}"
cd docker
docker-compose up -d postgres rabbitmq redis gateway
cd ..

echo -e "${YELLOW}Step 2/5: Waiting for database to be ready...${NC}"
sleep 5

echo -e "${YELLOW}Step 3/5: Generating Prisma client...${NC}"
npm run prisma:generate -w packages/shared-database

echo -e "${YELLOW}Step 4/5: Running database migrations/push...${NC}"
npm run prisma:push -w packages/shared-database

echo -e "${YELLOW}Step 5/5: Seeding database...${NC}"
npm run prisma:seed -w packages/shared-database

echo ""
echo -e "${GREEN}✅ Local setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  - Start backend services: npm run dev:backend"
echo "  - Start frontend: npm run dev:frontend"
echo "  - Or start all: npm run dev"
echo ""
echo "Access points:"
echo "  - Frontend: http://localhost:3000"
echo "  - API Gateway: http://localhost:8080"
echo "  - RabbitMQ UI: http://localhost:15672"
