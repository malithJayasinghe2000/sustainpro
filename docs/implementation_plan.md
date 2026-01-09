# DigitalOcean Deployment Plan for SustainPro

A complete A-to-Z guide for deploying the SustainPro microservices application on DigitalOcean using the Student plan ($200 credit).

## Project Overview

| Component | Technology | Port |
|-----------|------------|------|
| Frontend | Next.js 15 | 3000 |
| Auth Service | Node.js | 5000 |
| Core Service | Node.js | 5001 |
| IoT Service | Node.js | 5002 |
| API Gateway | Nginx | 8080 |
| Database | PostgreSQL 16 | 5432 |
| Message Broker | RabbitMQ | 5672 |
| Cache | Redis | 6379 |

---

## Recommended DigitalOcean Architecture

For a student budget, I recommend using a **single Droplet** approach with Docker Compose:

```mermaid
graph TB
    subgraph DigitalOcean
        subgraph Droplet["Droplet (4GB RAM / 2 vCPUs)"]
            NGINX[Nginx Reverse Proxy<br/>Port 80/443]
            FE[Frontend Container]
            AUTH[Auth Service]
            CORE[Core Service]
            IOT[IoT Service]
            PG[(PostgreSQL)]
            RMQ[RabbitMQ]
            REDIS[Redis]
        end
    end
    
    User((User)) --> NGINX
    NGINX --> FE
    NGINX --> AUTH
    NGINX --> CORE
    NGINX --> IOT
    AUTH --> PG
    CORE --> PG
    IOT --> PG
    CORE --> RMQ
    IOT --> RMQ
    AUTH --> REDIS
```

---

## Step-by-Step Deployment Guide

### Phase 1: DigitalOcean Setup

#### Step 1.1: Create a Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com)
2. Click **Create → Droplets**
3. Choose configuration:
   - **Region**: Choose closest to your users (e.g., Singapore for Dubai)
   - **Image**: **Ubuntu 24.04 LTS**
   - **Size**: **Basic → 4GB RAM / 2 vCPUs / 80GB SSD** ($24/month)
   - **Authentication**: SSH Keys (recommended) or Password
   - **Hostname**: `sustainpro-server`

> [!TIP]
> With the $200 Student credit, this Droplet will run free for ~8 months!

#### Step 1.2: Configure Firewall

1. Go to **Networking → Firewalls**
2. Create firewall `sustainpro-firewall`:
   ```
   Inbound Rules:
   - SSH (22)     → All IPv4, All IPv6
   - HTTP (80)    → All IPv4, All IPv6
   - HTTPS (443)  → All IPv4, All IPv6
   
   Outbound Rules:
   - All traffic  → All destinations
   ```
3. Apply to your Droplet

#### Step 1.3: Point Your Domain (Optional but Recommended)

1. Go to **Networking → Domains**
2. Add your domain (e.g., `sustainpro.yourdomain.com`)
3. Create **A Record**: `@` → Your Droplet's IP
4. Create **A Record**: `api` → Your Droplet's IP (for API subdomain)

---

### Phase 2: Server Setup

#### Step 2.1: SSH into Your Server

```bash
ssh root@YOUR_DROPLET_IP
```

#### Step 2.2: Update System & Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

#### Step 2.3: Create Non-Root User (Security Best Practice)

```bash
# Create user
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Copy SSH keys
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Switch to new user
su - deploy
```

#### Step 2.4: Install Additional Tools

```bash
# Install Git, Node.js, and useful tools
sudo apt install -y git htop curl wget unzip
```

---

### Phase 3: Deploy Application

#### Step 3.1: Clone Your Repository

```bash
# Create app directory
mkdir -p ~/apps
cd ~/apps

# Clone your repository (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/sustainpro.git
cd sustainpro
```

> [!IMPORTANT]
> If your repo is private, you'll need to set up SSH keys or use a Personal Access Token.

#### Step 3.2: Create Production Environment File

```bash
nano .env
```

Add the following (update values for production):

```env
# ==========================================
# SustainPro Production Environment
# ==========================================

# Database Configuration
POSTGRES_USER=sustainpro
POSTGRES_PASSWORD=<GENERATE_STRONG_PASSWORD>
POSTGRES_DB=sustainpro
DATABASE_URL=postgresql://sustainpro:<PASSWORD>@postgres:5432/sustainpro

# Redis Configuration
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# RabbitMQ Configuration
RABBITMQ_USER=sustainpro
RABBITMQ_PASSWORD=<GENERATE_STRONG_PASSWORD>
RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672

# JWT Configuration (GENERATE NEW SECRETS!)
JWT_SECRET=<GENERATE_64_CHAR_SECRET>
JWT_REFRESH_SECRET=<GENERATE_64_CHAR_SECRET>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

Generate strong passwords:
```bash
# Generate random passwords
openssl rand -base64 32
```

#### Step 3.3: Create Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

Update `frontend/next.config.ts` to enable standalone output:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

#### Step 3.4: Create Production Docker Compose with SSL

Create `docker/docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  # ========================================
  # Traefik Reverse Proxy (Handles SSL)
  # ========================================
  traefik:
    image: traefik:v3.0
    container_name: sustainpro-traefik
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
    networks:
      - sustainpro-network
    restart: unless-stopped

  # ========================================
  # PostgreSQL Database
  # ========================================
  postgres:
    image: postgres:16-alpine
    container_name: sustainpro-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ../database/seed-data.sql:/docker-entrypoint-initdb.d/02-seed-data.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - sustainpro-network
    restart: unless-stopped

  # ========================================
  # Redis Cache
  # ========================================
  redis:
    image: redis:7-alpine
    container_name: sustainpro-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - sustainpro-network
    restart: unless-stopped

  # ========================================
  # RabbitMQ Message Broker
  # ========================================
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    container_name: sustainpro-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "check_running"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - sustainpro-network
    restart: unless-stopped

  # ========================================
  # Auth Service
  # ========================================
  auth-service:
    build:
      context: ..
      dockerfile: services/auth-service/Dockerfile
    container_name: sustainpro-auth
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN}
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - sustainpro-network
    restart: unless-stopped

  # ========================================
  # Core Service
  # ========================================
  core-service:
    build:
      context: ..
      dockerfile: services/core-service/Dockerfile
    container_name: sustainpro-core
    environment:
      NODE_ENV: production
      PORT: 5001
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - sustainpro-network
    restart: unless-stopped

  # ========================================
  # IoT Service
  # ========================================
  iot-service:
    build:
      context: ..
      dockerfile: services/iot-service/Dockerfile
    container_name: sustainpro-iot
    environment:
      NODE_ENV: production
      PORT: 5002
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - sustainpro-network
    restart: unless-stopped

  # ========================================
  # API Gateway (Nginx)
  # ========================================
  gateway:
    image: nginx:alpine
    container_name: sustainpro-gateway
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - auth-service
      - core-service
      - iot-service
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.${DOMAIN}`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=80"
    networks:
      - sustainpro-network
    restart: unless-stopped

  # ========================================
  # Frontend
  # ========================================
  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: sustainpro-frontend
    environment:
      NEXT_PUBLIC_API_URL: https://api.${DOMAIN}/api/v1
    depends_on:
      - gateway
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"
    networks:
      - sustainpro-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  traefik_letsencrypt:

networks:
  sustainpro-network:
    driver: bridge
```

#### Step 3.5: Create Production Nginx Config

Create `docker/nginx/nginx.prod.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Upstreams (Docker internal networking)
    upstream auth_service {
        server auth-service:5000;
        keepalive 32;
    }

    upstream core_service {
        server core-service:5001;
        keepalive 32;
    }

    upstream iot_service {
        server iot-service:5002;
        keepalive 32;
    }

    # Include server configs
    include /etc/nginx/conf.d/*.conf;
}
```

#### Step 3.6: Deploy!

```bash
cd ~/apps/sustainpro/docker

# Build and start all services
docker compose -f docker-compose.production.yml up -d --build

# Check status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs -f
```

---

### Phase 4: Post-Deployment

#### Step 4.1: Set Up Automatic Backups

```bash
# Create backup script
mkdir -p ~/backups
nano ~/backups/backup.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR=~/backups/$(date +%Y-%m-%d)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec sustainpro-postgres pg_dump -U sustainpro sustainpro > $BACKUP_DIR/db.sql

# Keep only last 7 days
find ~/backups -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
```

Set up cron:
```bash
chmod +x ~/backups/backup.sh
crontab -e
# Add: 0 2 * * * /home/deploy/backups/backup.sh
```

#### Step 4.2: Enable DigitalOcean Monitoring

1. Go to your Droplet → **Graphs**
2. Click **Enable Monitoring**
3. Set up **Alerts** for CPU > 80%, Memory > 90%

#### Step 4.3: Set Up CI/CD (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/apps/sustainpro
            git pull origin main
            docker compose -f docker/docker-compose.production.yml up -d --build
```

---

## Cost Summary (Student Plan)

| Resource | Cost/Month |
|----------|------------|
| Droplet (4GB/2vCPU) | $24 |
| Domain (optional) | ~$12/year |
| **Total** | **~$24/month** |

> [!NOTE]
> With $200 credit, you get **~8 months free!**

---

## Verification Plan

### Manual Testing After Deployment

1. **Access Frontend**: Navigate to `https://yourdomain.com` - should see login page
2. **Test API**: `curl https://api.yourdomain.com/api/v1/health` - should return 200 OK
3. **Test Login**: Log in with default credentials and verify dashboard loads
4. **Check All Services**: 
   ```bash
   docker compose -f docker-compose.production.yml ps
   # All services should show "healthy"
   ```

---

## Required Files to Create/Modify

### [NEW] [Dockerfile](file:///d:/freelance/IOT Dubai Project/Project/sustainpro/frontend/Dockerfile)
Frontend Dockerfile for production build with standalone output.

### [MODIFY] [next.config.ts](file:///d:/freelance/IOT Dubai Project/Project/sustainpro/frontend/next.config.ts)
Add `output: 'standalone'` for optimized Docker builds.

### [NEW] [docker-compose.production.yml](file:///d:/freelance/IOT Dubai Project/Project/sustainpro/docker/docker-compose.production.yml)
Production-ready Docker Compose with Traefik for SSL.

### [NEW] [nginx.prod.conf](file:///d:/freelance/IOT Dubai Project/Project/sustainpro/docker/nginx/nginx.prod.conf)
Production Nginx config for containerized services.
