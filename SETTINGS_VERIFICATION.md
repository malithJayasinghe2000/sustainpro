# System Settings Verification Guide

## ✅ Ensure System Settings Are Configured

The authentication system uses settings from the `sps_system_settings` table. Follow these steps to verify and configure:

---

## Step 1: Check if Settings Exist

**In pgAdmin4, run:**
```sql
SELECT 
    id,
    max_login_attempts,
    account_lock_duration_minutes,
    token_expire_minutes
FROM sps_system_settings
WHERE id = 'sps_main_config';
```

**If NO results:**
→ Settings not initialized yet → Proceed to Step 2

**If you see results:**
→ Settings are configured ✅
→ Current values will be shown

---

## Step 2: Initialize System Settings

**In pgAdmin4, run:**
```bash
File: backend/sql/init-system-settings.sql
```

Or copy and run this SQL:
```sql
INSERT INTO sps_system_settings (
    id, category, maintenance_mode, default_timezone,
    account_lock_duration_minutes, token_expire_minutes,
    max_login_attempts, session_timeout_enabled,
    support_email, support_phone, global_alert_message
) VALUES (
    'sps_main_config', 'global', false, 'Asia/Colombo',
    15,  -- Lock for 15 minutes
    60,  -- Token expires in 60 minutes
    5,   -- Max 5 login attempts
    true, 'help@sps.com', '+94 11 234 5678',
    'System maintenance scheduled for Sunday 2 AM.'
)
ON CONFLICT (id) DO UPDATE SET
    account_lock_duration_minutes = EXCLUDED.account_lock_duration_minutes,
    token_expire_minutes = EXCLUDED.token_expire_minutes,
    max_login_attempts = EXCLUDED.max_login_attempts,
    updated_at = NOW();
```

---

## Step 3: Verify Settings via API

**Test the settings endpoint:**
```bash
# Get security settings (public endpoint)
curl http://localhost:5000/api/v1/settings/security
```

**Expected Response:**
```json
{
  "max_login_attempts": 5,
  "account_lock_duration_minutes": 15,
  "token_expire_minutes": 60
}
```

---

## Step 4: Test Login with Limits

**Test failed login attempts:**

```bash
# Try wrong password 5 times
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"elcoanlanka@gmail.com","password":"wrong"}'
```

**After 5 failed attempts, you should see:**
```json
{
  "error": "Account locked for 15 minutes due to too many failed attempts",
  "lockedUntil": "2025-12-09T..."
}
```

---

## Current Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| **max_login_attempts** | 5 | Failed attempts before lockout |
| **account_lock_duration_minutes** | 15 | Lock duration in minutes |
| **token_expire_minutes** | 60 | JWT token validity |

---

## How It Works

**Login Flow:**
1. User attempts login
2. Backend fetches settings from `sps_system_settings`
3. Compares `failed_login_attempts` with `max_login_attempts`
4. If exceeded → Locks account for `account_lock_duration_minutes`
5. If successful → Generates JWT valid for `token_expire_minutes`

**Code Location:**
- Settings fetched in: `backend/src/routes/auth.ts` → `getSecuritySettings()`
- Used in: Login endpoint logic

---

## Update Settings (Admin Only)

**Via API (requires admin token):**
```bash
curl -X PUT http://localhost:5000/api/v1/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "max_login_attempts": 3,
    "account_lock_duration_minutes": 30,
    "token_expire_minutes": 120
  }'
```

**Or directly in database:**
```sql
UPDATE sps_system_settings
SET 
    max_login_attempts = 3,
    account_lock_duration_minutes = 30,
    token_expire_minutes = 120,
    updated_at = NOW()
WHERE id = 'sps_main_config';
```

---

## ✅ Verification Checklist

- [ ] Run `init-system-settings.sql` in pgAdmin
- [ ] Verify settings exist with SELECT query
- [ ] Test `/api/v1/settings/security` endpoint
- [ ] Test login with wrong password 5 times
- [ ] Confirm account gets locked
- [ ] Wait 15 minutes or reset in database
- [ ] Confirm login works after lock expires

---

**Everything configured? Your authentication system is now using database-driven security policies!** 🔒
