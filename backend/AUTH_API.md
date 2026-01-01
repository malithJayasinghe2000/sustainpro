# Authentication API Documentation

## 🔐 Authentication Endpoints

Base URL: `http://localhost:5000/api/v1/auth`

---

## POST /register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "id": "u_102",
  "role": "admin",
  "timezone": "Asia/Colombo"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "email": "user@example.com",
    "id": "u_102",
    "role": "admin"
  }
}
```

**Errors:**
- `400`: Missing required fields
- `409`: Email or ID already exists

---

## POST /login

Authenticate user and receive JWT token.

**Security Features:**
- Fetches security policy from `sps_system_settings`
- Checks account status and lockout
- Verifies password with Argon2id
- Rate limiting and account lockout
- Generates JWT with configurable expiration

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "user@example.com",
    "id": "u_102",
    "role": "admin",
    "timezone": "Asia/Colombo",
    "isSuperAdmin": false
  },
  "expiresIn": 3600
}
```

**Errors:**
- `400`: Missing credentials
- `401`: Invalid credentials (with `attemptsRemaining`)
- `403`: Account disabled
- `423`: Account locked (with time remaining)

---

## POST /logout

Logout user (client-side token deletion).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

## GET /me

Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "email": "user@example.com",
    "id": "u_102",
    "role": "admin",
    "timezone": "Asia/Colombo",
    "is_super_admin": false,
    "is_active": true,
    "last_login": "2025-12-09T04:33:21.000Z",
    "created_at": "2025-12-09T04:30:00.000Z"
  }
}
```

**Errors:**
- `401`: No token provided
- `403`: Invalid or expired token
- `404`: User not found

---

## 🔒 Security Policy

Settings from `sps_system_settings` table:

- **max_login_attempts**: 5 (default)
- **account_lock_duration_minutes**: 15 (default)
- **token_expire_minutes**: 60 (default)

---

## 🧪 Testing with curl

### Register User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sps.com",
    "password": "Admin@123",
    "id": "u_101",
    "role": "admin",
    "timezone": "Asia/Colombo"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sps.com",
    "password": "Admin@123"
  }'
```

### Get Profile (use token from login)
```bash
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🛡️ Middleware Usage

Protect routes with authentication:

```typescript
import { authenticateToken, requireRole } from './middleware/auth';

// Require authentication
router.get('/profile', authenticateToken, handler);

// Require specific role
router.post('/admin', authenticateToken, requireRole('admin'), handler);
```

---

## Password Security

- **Algorithm**: Argon2id
- **Memory Cost**: 64 MB
- **Time Cost**: 3 iterations
- **Parallelism**: 4 threads

Never send passwords in GET requests or URL parameters!
