---
description: How to deploy changes to production server
---

# Production Deployment Workflow

## Prerequisites
- SSH access to server
- Git repository with changes pushed

---

## Step 1: Push Changes from Local

```bash
# On your LOCAL machine
cd "d:\freelance\IOT Dubai Project\Project\sustainpro"

git add .
git commit -m "Your commit message"
git push origin main
```

---

## Step 2: SSH to Server

```bash
ssh deploy@your-server-ip
# or
ssh -i your-key.pem deploy@your-server-ip
```

---

## Step 3: Pull Latest Code

```bash
cd ~/apps/sustainpro
git pull origin main
```

---

## Step 4: Rebuild and Restart Docker Containers

```bash
cd docker

# Stop running containers
docker compose -f docker-compose.production.yml down

# Rebuild all services
docker compose -f docker-compose.production.yml build --no-cache

# Start services
docker compose -f docker-compose.production.yml up -d
```

---

## Step 5: Database Update (if schema changed)

### Option A: Sync schema (recommended for most updates)
```bash
docker compose -f docker-compose.production.yml run --rm core-service sh -c "cd /app/packages/shared-database && npx prisma db push"
```

### Option B: Run migrations (for migration-tracked changes)
```bash
# First, mark any existing migrations as applied if needed
docker compose -f docker-compose.production.yml run --rm core-service sh -c "cd /app/packages/shared-database && npx prisma migrate deploy"
```

---

## Step 6: Seed Data (if needed)

Since ts-node may not work in production, use this SQL method:

```bash
# Insert default password policies
docker compose -f docker-compose.production.yml exec postgres psql -U sustainpro -d sustainpro -c "
INSERT INTO sps_password_policies (id, min_length, max_length, require_uppercase, require_lowercase, require_numbers, require_special_chars, special_chars_allowed, password_expires, password_expiry_days, expiry_warning_days, prevent_reuse, reuse_prevention_count, require_change_on_first_login, min_password_age_hours)
VALUES ('sps_password_policy', 8, 128, true, true, true, true, '!@#\$%^&*()_+-=[]{}|;:,.<>?', false, 90, 14, true, 5, true, 0)
ON CONFLICT (id) DO NOTHING;
"

# Insert/update default session policies
docker compose -f docker-compose.production.yml exec postgres psql -U sustainpro -d sustainpro -c "
INSERT INTO sps_session_policies (id, session_timeout_enabled, session_timeout_minutes, idle_timeout_enabled, idle_timeout_minutes, max_concurrent_sessions, enforce_single_session, access_token_expire_minutes, refresh_token_expire_days, remember_me_expire_days, bind_session_to_ip, bind_session_to_user_agent, regenerate_session_on_login)
VALUES ('sps_session_policy', true, 480, true, 30, 3, false, 60, 7, 30, false, false, true)
ON CONFLICT (id) DO NOTHING;
"

# Insert/update default login policies
docker compose -f docker-compose.production.yml exec postgres psql -U sustainpro -d sustainpro -c "
INSERT INTO sps_login_policies (id, max_login_attempts, lockout_duration_minutes, progressive_lockout, progressive_lockout_multiplier, max_lockout_duration_minutes, enable_captcha, captcha_type, captcha_after_failed_attempts, captcha_site_key, captcha_secret_key, enable_ip_blocking, ip_block_threshold, ip_block_duration_minutes, notify_on_lockout, notify_on_new_device_login, notify_on_password_change)
VALUES ('sps_login_policy', 5, 30, false, 2, 1440, false, 'NONE', 3, NULL, NULL, false, 10, 60, true, true, true)
ON CONFLICT (id) DO NOTHING;
"
```

---

## Step 7: Verify Deployment

```bash
# Check all containers are running
docker compose -f docker-compose.production.yml ps

# Check logs
docker compose -f docker-compose.production.yml logs -f --tail=100

# Check specific service
docker compose -f docker-compose.production.yml logs auth-service
docker compose -f docker-compose.production.yml logs core-service
docker compose -f docker-compose.production.yml logs frontend
```

---

## Step 8: Verify Database

```bash
# Check tables exist
docker compose -f docker-compose.production.yml exec postgres psql -U sustainpro -d sustainpro -c "\dt"

# Check password policies
docker compose -f docker-compose.production.yml exec postgres psql -U sustainpro -d sustainpro -c "SELECT * FROM sps_password_policies;"

# Check system settings
docker compose -f docker-compose.production.yml exec postgres psql -U sustainpro -d sustainpro -c "SELECT * FROM sps_system_settings;"
```

---

## Troubleshooting

### Container won't start
```bash
docker compose -f docker-compose.production.yml logs <service-name>
```

### Database connection issues
```bash
# Check postgres is running
docker compose -f docker-compose.production.yml ps postgres

# Check database exists
docker compose -f docker-compose.production.yml exec postgres psql -U sustainpro -c "\l"
```

### Force rebuild specific service
```bash
docker compose -f docker-compose.production.yml build --no-cache <service-name>
docker compose -f docker-compose.production.yml up -d <service-name>
```

### Clear all and start fresh
```bash
docker compose -f docker-compose.production.yml down -v  # WARNING: deletes data
docker compose -f docker-compose.production.yml up -d --build
```
