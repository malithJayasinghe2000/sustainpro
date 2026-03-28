# SustainPro Server Update & Maintenance Guide

This document explains how to safely apply new code changes from your local machine to the live production server (IP: `76.13.180.2`). 

---

## ⚠️ IMPORTANT: Sync Your GitHub Repo First
Because we had to make custom changes directly on the server to prevent port conflicts with your existing websites, the server's `docker-compose.production.yml` is slightly different from what is currently in your GitHub repository.

Before your next update, please make sure you update your **local** `docker/docker-compose.production.yml` to match the server. The key changes we made were:
1. **Ports:** Changed gateway/frontend exposed ports from `80`/`443` to `8888`/`8443`.
2. **Traefik Version:** Upgraded Traefik image to `traefik:latest`.
3. **Routing Rules:** Changed Traefik labels from `Host` matching to `PathPrefix` matching.
*(If you don't commit these changes to GitHub, pulling new code on the server might overwrite our fixes and bring back the 404 error).*

---

## 🔁 How to Update the Server (Standard Workflow)

When you make changes to your frontend or backend code and push them to GitHub (e.g., to the `sandaru-fix` branch), follow these steps to update the live server.

### Step 1: Connect to the Server
Open your terminal and SSH into the server:
```bash
ssh root@76.13.180.2
```

### Step 2: Navigate to the Project Directory
```bash
cd /opt/sustainpro
```

### Step 3: Stash existing changes, Pull, and Restore
Because we occasionally modify the `.env` or scripts directly on the server, it's safest to stash local server changes before pulling new code, then apply them back.
```bash
# Save any local server modifications
git stash

# Pull the latest code from GitHub
git pull origin sandaru-fix

# Re-apply the server modifications (like your custom .env file)
git stash pop
```

### Step 4: Rebuild and Restart the Updated Services
If you only changed specific services (for example, just the `frontend` and `auth-service`), you don't need to restart the entire database. You can quickly rebuild and restart just the parts you changed:

```bash
# Example: Rebuilding ONLY the frontend and auth-service
docker compose -f docker/docker-compose.production.yml build frontend auth-service
docker compose -f docker/docker-compose.production.yml up -d --no-deps frontend auth-service
```

> **Available Services:** `frontend`, `gateway`, `auth-service`, `core-service`, `iot-service`, `notification-service`

---

## 🗄️ How to Update the Database Schema (Prisma)

If you made changes to your `schema.prisma` file (added new tables or columns), you need to sync the live database after you pull the code.

1. SSH into the server and pull your code (Steps 1-3 above).
2. Rebuild the core/auth services so they have the new Prisma client.
3. Run the database push command inside the auth-service container:
```bash
docker exec sustainpro-auth sh -c "cd /app/packages/shared-database && npx prisma db push"
```
4. Restart your services so they recognize the new database structure:
```bash
docker restart sustainpro-auth sustainpro-core sustainpro-iot
```

---

## 💥 How to Do a Full "Hard Reset" Deployment
If you made massive changes spanning across all configuration files, package.jsons, and docker configurations, you can run the full deployment script. 

*Note: This will completely bring down the application for a few minutes while it rebuilds.*
```bash
cd /opt/sustainpro
./scripts/deploy-production.sh
```

---

## 📋 Helpful Diagnostic Commands

**View live logs of a service (e.g., frontend):**
```bash
docker logs sustainpro-frontend --tail 100 -f
```

**Check if all containers are running:**
```bash
docker ps -a
```

**Restart a single service that crashed:**
```bash
docker restart sustainpro-gateway
```