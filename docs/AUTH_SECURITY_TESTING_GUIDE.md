# SustainPro - Auth Security Testing Guide

This guide provides a comprehensive walkthrough for testing all the implemented authentication and security features.

## 📋 Prerequisites

1. **Docker containers running:**
   ```powershell
   cd d:\sustainpro\docker
   docker-compose up -d
   ```

2. **Database synced:**
   ```powershell
   cd d:\sustainpro\packages\shared-database
   npx prisma db push
   ```

3. **Services running:**
   ```powershell
   # Terminal 1 - Auth Service
   cd d:\sustainpro\services\auth-service
   npm run dev
   
   # Terminal 2 - Core Service
   cd d:\sustainpro\services\core-service
   npm run dev
   ```

---

## 🔐 1. Basic Authentication Flow

### 1.1 Login (without 2FA)

**Request:**
```powershell
$body = '{"email": "superadmin@sustainpro.io", "password": "Admin@123"}'
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5
```

**Expected Response:**
```json
{
    "success": true,
    "message": "Login successful",
    "token": "eyJ...",
    "user": {
        "id": "...",
        "email": "superadmin@sustainpro.io",
        "two_factor_enabled": false,
        ...
    }
}
```

**What happens behind the scenes:**
1. Password is verified using Argon2
2. Failed login attempts are reset
3. **Refresh token** is stored in database with hash
4. **Session** is created in `sps_user_sessions`
5. Refresh token is set as HTTP-only cookie
6. Access token (JWT) is returned

### 1.2 Verify Tokens in Database

```powershell
# Check refresh tokens
docker exec sustainpro-postgres psql -U sustainpro -d sustainpro -c "SELECT id, user_id, expires_at, revoked_at FROM sps_refresh_tokens ORDER BY created_at DESC LIMIT 5;"

# Check user sessions
docker exec sustainpro-postgres psql -U sustainpro -d sustainpro -c "SELECT id, user_id, is_active, last_activity FROM sps_user_sessions ORDER BY created_at DESC LIMIT 5;"
```

---

## 🔄 2. Refresh Token Flow

### How Refresh Tokens Work

1. **On Login**: A refresh token is generated, hashed, and stored in the database
2. **Token Storage**: The plain token is sent to the client as an HTTP-only cookie
3. **Token Refresh**: When access token expires, client calls `/auth/refresh` with the cookie
4. **Server verifies**: Token hash in database, not revoked, not expired
5. **New access token**: Returned to client

### 2.1 Test Refresh Token

```powershell
# Use session to preserve cookies
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Login first
$loginBody = '{"email": "superadmin@sustainpro.io", "password": "Admin@123"}'
$loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -WebSession $session -UseBasicParsing
Write-Host "Login successful!"

# Now refresh the token
$refreshResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/refresh" -Method POST -WebSession $session -UseBasicParsing
Write-Host "Refresh Response:" $refreshResponse.Content
```

**Expected Response:**
```json
{
    "success": true,
    "token": "eyJ... (new access token)"
}
```

---

## 🚪 3. Logout & Session Management

### 3.1 Single Device Logout

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = '{"email": "superadmin@sustainpro.io", "password": "Admin@123"}'
$loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -WebSession $session -UseBasicParsing

# Logout
$logoutResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/logout" -Method POST -WebSession $session -UseBasicParsing
Write-Host "Logout Response:" $logoutResponse.Content
```

**What happens:**
- Refresh token is marked as `revoked` in database
- Cookie is cleared
- Session is deactivated

### 3.2 Logout All Devices

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = '{"email": "superadmin@sustainpro.io", "password": "Admin@123"}'
$loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -WebSession $session -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

$headers = @{"Authorization" = "Bearer $token"}
$logoutAllResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/logout-all" -Method POST -Headers $headers -WebSession $session -UseBasicParsing
Write-Host "Logout All Response:" $logoutAllResponse.Content
```

**What happens:**
- ALL refresh tokens for user are revoked
- ALL sessions are deactivated

---

## 🔑 4. Two-Factor Authentication (2FA)

### How 2FA Works

1. **User enables 2FA** via settings or API
2. **On next login**: Password verified → OTP sent to email
3. **Login returns**: `requiresTwoFactor: true` + `tempToken`
4. **User enters OTP**: Sent to `/auth/verify-2fa` with `tempToken`
5. **On success**: Full login with tokens

### 4.1 Enable 2FA

```powershell
# Login first
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = '{"email": "admin@acme.com", "password": "Admin@123"}'
$loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -WebSession $session -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

# Enable 2FA
$headers = @{"Authorization" = "Bearer $token"}
$enable2faResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/2fa/enable" -Method POST -Headers $headers -ContentType "application/json" -Body '{}' -WebSession $session -UseBasicParsing
Write-Host "Enable 2FA Response:" $enable2faResponse.Content
```

### 4.2 Login with 2FA

```powershell
# Login - will require 2FA
$loginResult = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email": "admin@acme.com", "password": "Admin@123"}'
Write-Host "Step 1 - Login Response:"
$loginResult | ConvertTo-Json
```

**Response:**
```json
{
    "success": true,
    "requiresTwoFactor": true,
    "tempToken": "eyJ...",
    "message": "Verification code sent to your email"
}
```

### 4.3 Check Auth Service Logs for OTP

Since email is not configured, the OTP is logged:
```
[INFO] [email-service] Email would be sent ... "text":"... Your verification code is: 123456 ..."
```

### 4.4 Verify 2FA

```powershell
# Use the tempToken from login and OTP from logs
$tempToken = "YOUR_TEMP_TOKEN_HERE"
$body = @{tempToken=$tempToken; code="YOUR_OTP_CODE"} | ConvertTo-Json
$verifyResult = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/verify-2fa" -Method POST -ContentType "application/json" -Body $body
$verifyResult | ConvertTo-Json -Depth 5
```

### 4.5 Disable 2FA

```powershell
# Login with 2FA first to get token, then:
$headers = @{"Authorization" = "Bearer $token"}
$disable2faResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/2fa/disable" -Method POST -Headers $headers -ContentType "application/json" -Body '{}' -UseBasicParsing
Write-Host "Disable 2FA Response:" $disable2faResponse.Content
```

---

## 🛡️ 5. Security Policies Configuration

### 5.1 Get Current Security Settings

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = '{"email": "superadmin@sustainpro.io", "password": "Admin@123"}'
$loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -WebSession $session -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

$headers = @{"Authorization" = "Bearer $token"}
Invoke-RestMethod -Uri "http://localhost:5001/api/v1/settings" -Method GET -Headers $headers | ConvertTo-Json -Depth 3
```

### 5.2 Update Security Settings

```powershell
$securityBody = @{
    max_login_attempts = 5
    account_lock_duration_minutes = 30
    session_timeout_minutes = 30
    two_factor_required = $false
    two_factor_method = "email"
    otp_expiry_minutes = 10
    otp_length = 6
    otp_max_attempts = 3
    access_token_expire_minutes = 60
    refresh_token_expire_days = 7
} | ConvertTo-Json

$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
Invoke-RestMethod -Uri "http://localhost:5001/api/v1/settings/security" -Method PUT -Headers $headers -Body $securityBody | ConvertTo-Json
```

### Policy Settings Explained

| Setting | Description | Default |
|---------|-------------|---------|
| `max_login_attempts` | Number of failed attempts before lockout | 5 |
| `account_lock_duration_minutes` | How long account stays locked | 30 |
| `session_timeout_minutes` | Idle session timeout | 30 |
| `two_factor_required` | Require 2FA for all users | false |
| `two_factor_method` | OTP delivery method (`email`/`authenticator`) | email |
| `otp_expiry_minutes` | OTP validity period | 10 |
| `otp_length` | Number of digits in OTP | 6 |
| `otp_max_attempts` | Max wrong OTP attempts | 3 |
| `access_token_expire_minutes` | JWT access token lifetime | 60 |
| `refresh_token_expire_days` | Refresh token lifetime | 7 |

---

## 🔒 6. Account Lockout Testing

### 6.1 Trigger Account Lockout

```powershell
# Try wrong password multiple times
for ($i = 1; $i -le 6; $i++) {
    try {
        Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email": "admin@acme.com", "password": "WrongPassword"}'
    } catch {
        Write-Host "Attempt $i : $($_.ErrorDetails.Message)"
    }
}
```

**Expected:** After 5 attempts, account is locked and error message includes remaining lock time.

### 6.2 Verify Lockout in Database

```powershell
docker exec sustainpro-postgres psql -U sustainpro -d sustainpro -c "SELECT email, failed_login_attempts, account_locked_until FROM sps_users WHERE email = 'admin@acme.com';"
```

### 6.3 Unlock Account Manually

```powershell
docker exec sustainpro-postgres psql -U sustainpro -d sustainpro -c "UPDATE sps_users SET failed_login_attempts = 0, account_locked_until = NULL WHERE email = 'admin@acme.com';"
```

---

## 🔑 7. Password Management

### 7.1 Change Password (Authenticated)

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = '{"email": "admin@acme.com", "password": "Admin@123"}'
$loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -WebSession $session -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
$changePasswordBody = '{"currentPassword": "Admin@123", "newPassword": "NewSecurePass@456"}'
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/change-password" -Method POST -Headers $headers -Body $changePasswordBody
```

### 7.2 Forgot Password (OTP-based)

```powershell
# Request password reset OTP
$forgotBody = '{"email": "admin@acme.com"}'
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/forgot-password" -Method POST -ContentType "application/json" -Body $forgotBody
```

Check auth service logs for OTP, then:

```powershell
$resetBody = '{"email": "admin@acme.com", "code": "OTP_CODE_HERE", "newPassword": "NewSecurePass@456"}'
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/reset-password" -Method POST -ContentType "application/json" -Body $resetBody
```

---

## 📊 8. Database Inspection Commands

### Check All Auth Tables

```powershell
# Refresh tokens
docker exec sustainpro-postgres psql -U sustainpro -d sustainpro -c "SELECT id, user_id, expires_at, revoked_at, created_at FROM sps_refresh_tokens ORDER BY created_at DESC LIMIT 10;"

# User sessions
docker exec sustainpro-postgres psql -U sustainpro -d sustainpro -c "SELECT id, user_id, device_info, is_active, last_activity FROM sps_user_sessions ORDER BY created_at DESC LIMIT 10;"

# OTP codes
docker exec sustainpro-postgres psql -U sustainpro -d sustainpro -c "SELECT id, user_id, purpose, expires_at, attempts, used_at FROM sps_otp_codes ORDER BY created_at DESC LIMIT 10;"

# User 2FA status
docker exec sustainpro-postgres psql -U sustainpro -d sustainpro -c "SELECT email, two_factor_enabled, failed_login_attempts, account_locked_until FROM sps_users;"
```

---

## 🌐 9. API Endpoints Reference

### Authentication Endpoints (Port 5000)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/login` | Login with email/password | No |
| POST | `/api/v1/auth/verify-2fa` | Verify 2FA code | tempToken |
| POST | `/api/v1/auth/refresh` | Refresh access token | Cookie |
| POST | `/api/v1/auth/logout` | Logout current session | Cookie |
| POST | `/api/v1/auth/logout-all` | Logout all sessions | Yes |
| GET | `/api/v1/auth/sessions` | List active sessions | Yes |
| DELETE | `/api/v1/auth/sessions/:id` | Revoke specific session | Yes |
| POST | `/api/v1/auth/change-password` | Change password | Yes |
| POST | `/api/v1/auth/forgot-password` | Request reset OTP | No |
| POST | `/api/v1/auth/reset-password` | Reset with OTP | No |
| POST | `/api/v1/auth/2fa/enable` | Enable 2FA | Yes |
| POST | `/api/v1/auth/2fa/disable` | Disable 2FA | Yes |

### Settings Endpoints (Port 5001)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/settings` | Get all settings | Yes |
| PUT | `/api/v1/settings/security` | Update security settings | Yes (Admin) |

---

## 🧪 10. Testing Checklist

- [ ] **Basic Login** - Login without 2FA works
- [ ] **Refresh Token** - Can refresh access token using cookie
- [ ] **Logout Single** - Revokes current refresh token
- [ ] **Logout All** - Revokes all user tokens
- [ ] **Enable 2FA** - Sets two_factor_enabled = true
- [ ] **Login with 2FA** - Returns requiresTwoFactor + tempToken
- [ ] **Verify 2FA** - OTP verification completes login
- [ ] **Disable 2FA** - Sets two_factor_enabled = false
- [ ] **Account Lockout** - Locks after failed attempts
- [ ] **Change Password** - Updates password with current password
- [ ] **Forgot Password** - Sends OTP for reset
- [ ] **Reset Password** - Resets with OTP verification
- [ ] **Security Settings** - Can update via API/UI

---

## 📝 Notes

1. **Email Service**: In development, emails are logged instead of sent. Check auth-service terminal for OTP codes.

2. **Cookies**: Refresh tokens use HTTP-only cookies. Use `-WebSession` parameter in PowerShell to maintain cookies.

3. **Token Expiry**:
   - Access Token: 60 minutes (configurable)
   - Refresh Token: 7 days (configurable)
   - Temp Token (2FA): 5 minutes
   - OTP: 10 minutes (configurable)

4. **Database Tables**:
   - `sps_refresh_tokens` - Stores hashed refresh tokens
   - `sps_user_sessions` - Tracks active sessions
   - `sps_otp_codes` - Stores hashed OTPs

---

*Last updated: January 2026*
