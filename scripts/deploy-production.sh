#!/bin/bash
# ==========================================
# SustainPro Production Deployment Script
# ==========================================
# Usage: ./scripts/deploy-production.sh
# Run on the production server after git pull

set -e

echo "🚀 SustainPro Production Deployment"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to docker directory
cd "$(dirname "$0")/../docker"

COMPOSE_FILE="docker-compose.production.yml"

echo -e "${YELLOW}Step 1/6: Stopping current containers...${NC}"
docker compose -f $COMPOSE_FILE down || true

echo -e "${YELLOW}Step 2/6: Building new images...${NC}"
docker compose -f $COMPOSE_FILE build

echo -e "${YELLOW}Step 3/6: Starting database and message broker...${NC}"
docker compose -f $COMPOSE_FILE up -d postgres rabbitmq

echo -e "${YELLOW}Step 4/6: Waiting for database to be ready and configuring TimescaleDB...${NC}"
sleep 10

# TimescaleDB Configuration (Idempotent)
echo "Configuring TimescaleDB..."
docker compose -f $COMPOSE_FILE exec -T postgres sh -c "grep -q \"shared_preload_libraries = 'timescaledb'\" /var/lib/postgresql/data/pgdata/postgresql.conf || (echo \"shared_preload_libraries = 'timescaledb'\" >> /var/lib/postgresql/data/pgdata/postgresql.conf && echo 'Configuration updated, restarting...' && exit 10)" || docker compose -f $COMPOSE_FILE restart postgres

# Wait for restart if needed
sleep 5

# Enable Extension and Hypertable
echo "Enabling Hypertable and UUID..."
docker compose -f $COMPOSE_FILE exec -T postgres psql -U sustainpro -d sustainpro -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE; SELECT create_hypertable('sps_telemetry', 'recorded_at', migrate_data => true, if_not_exists => true);" || echo -e "${RED}Warning: Hypertable setup failed (might already exist), continuing...${NC}"

echo -e "${YELLOW}Step 5/6: Running database sync and seed...${NC}"
# Use db:deploy:prod which runs: prisma generate + db push + seed (compiled)
docker compose -f $COMPOSE_FILE run --rm core-service sh -c "cd /app/packages/shared-database && npm run db:deploy:prod" || echo -e "${RED}Warning: Database deploy failed, continuing...${NC}"

echo -e "${YELLOW}Step 6/6: Starting all services...${NC}"
docker compose -f $COMPOSE_FILE up -d

echo ""
echo -e "${GREEN}✅ Production deployment complete!${NC}"
echo ""
echo "Checking service status..."
docker compose -f $COMPOSE_FILE ps

echo ""
echo "To view logs: docker compose -f $COMPOSE_FILE logs -f"
