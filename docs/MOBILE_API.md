# SustainPro Mobile API Documentation

**Version**: 1.0.0  
**Base URL**: `http://your-server:5000/api/v1`  
**Protocol**: REST API with JSON  
**Real-time**: Socket.IO support

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Handling](#error-handling)
4. [Endpoints](#endpoints)
   - [Auth](#auth-endpoints)
   - [Users](#users-endpoints)
   - [Devices](#devices-endpoints)
   - [Telemetry](#telemetry-endpoints)
   - [Events](#events-endpoints)
   - [Services](#services-endpoints)
   - [Settings](#settings-endpoints)
5. [Real-Time Updates](#real-time-updates)
6. [Best Practices](#best-practices-for-mobile)

---

## Authentication

### Overview
SustainPro uses **JWT (JSON Web Tokens)** for authentication with a refresh token strategy.

### Authentication Flow

```
1. Login → Receive access token + refresh token (in httpOnly cookie)
2. Include token in all requests: Authorization: Bearer <token>
3. Token expires → Use refresh endpoint to get new token
4. Logout → Clear tokens
```

### Token Lifetimes
- **Access Token**: 30 minutes (configurable)
- **Refresh Token**: 7 days

---

## Auth Endpoints

### 1. Login

**POST** `/auth/login`

Login with email and password to receive authentication tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "organization_id": "org-uuid",
    "org_name": "Acme Corp",
    "org_logo": "https://...",
    "theme_config": {},
    "roles": [
      {
        "role": "ORG_ADMIN",
        "org_id": "org-uuid"
      }
    ],
    "permissions": ["users:view", "events:create", ...],
    "is_super_admin": false,
    "code": "USR-001",
    "timezone": "Asia/Colombo"
  }
}
```

**Rate Limit**: 5 attempts per 15 minutes (production)

**Errors:**
- `400` - Validation error (invalid email format)
- `401` - Invalid credentials
- `403` - Account disabled
- `423` - Account locked (too many failed attempts)
- `429` - Too many requests

---

### 2. Refresh Token

**POST** `/auth/refresh`

Get a new access token using the refresh token (sent as httpOnly cookie).

**Request:**
```json
{}  // Empty body, refresh token sent in cookie
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5..."
}
```

**Errors:**
- `401` - Refresh token missing
- `403` - Invalid/expired refresh token or user account disabled

---

### 3. Logout

**POST** `/auth/logout`

Clear refresh token cookie. Client should also delete stored access token.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 4. Get Current User

**GET** `/auth/me`

Get current authenticated user's profile and permissions.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "organization_id": "org-uuid",
    "is_super_admin": false,
    "timezone": "Asia/Colombo",
    "org_name": "Acme Corp",
    "logo_url": "https://...",
    "theme_config": {},
    "roles": [...],
    "permissions": ["users:view", "events:create"]
  }
}
```

---

## Devices Endpoints

### 1. Get All Devices

**GET** `/devices`

Get all devices for your organization.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "device-uuid",
      "device_code": "SPS_001",
      "name": "Water Sensor #1",
      "type": "sensor",
      "status": "ONLINE",
      "last_seen": "2026-01-03T08:30:00Z",
      "metadata": {},
      "created_at": "2025-12-01T10:00:00Z",
      "service_name": "Water Monitoring",
      "dept_name": "Operations"
    }
  ]
}
```

---

### 2. Get Device by ID

**GET** `/devices/:id`

Get detailed information for a specific device.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "device-uuid",
    "device_code": "SPS_001",
    "name": "Water Sensor #1",
    "type": "sensor",
    "status": "ONLINE",
    "api_key": "abc123...",
    "serial_number": "SN123456",
    "last_seen": "2026-01-03T08:30:00Z",
    "metadata": {
      "firmware_version": "1.0.2",
      "location": "Building A"
    },
    "service_name": "Water Monitoring",
    "dept_name": "Operations"
  }
}
```

**Errors:**
- `404` - Device not found or not in your organization

---

### 3. Create Device (Manual)

**POST** `/devices`

Manually create a new device. Requires TECHNICIAN or ORG_ADMIN role.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Request:**
```json
{
  "device_code": "SPS_002",
  "name": "Pressure Sensor",
  "type": "sensor",
  "service_id": "service-uuid"  // optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "device-uuid",
    "device_code": "SPS_002",
    "name": "Pressure Sensor",
    "api_key": "generated-api-key-here",
    "status": "OFFLINE",
    "created_at": "2026-01-03T08:35:00Z"
  }
}
```

**Errors:
- `400` - Missing device_code or invalid service_id
- `403` - Insufficient permissions

---

### 4. Provision Device

**POST** `/devices/provision`

Provision a new device (typically during initial setup).

**Headers:**
```
Authorization: Bearer <your-token>
```

**Request:**
```json
{
  "serial_number": "SN789456",
  "name": "New Sensor"  // optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "device-uuid",
    "device_code": "SPS_789456",
    "api_key": "generated-api-key",
    "name": "New Sensor",
    "status": "PROVISIONED"
  }
}
```

---

## Telemetry Endpoints

### 1. Send Telemetry Data (IoT Devices)

**POST** `/telemetry`

IoT devices use this endpoint to send sensor data. Uses device API key for authentication.

**Headers:**
```
Authorization: Bearer <device-api-key>
OR
X-API-Key: <device-api-key>
```

**Request:**
```json
{
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "pressure": 1013.25,
    "timestamp": "2026-01-03T08:40:00Z"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Live data received (in-memory)",
  "device_id": "device-uuid",
  "device_code": "SPS_001",
  "timestamp": "2026-01-03T08:40:00Z",
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "pressure": 1013.25
  }
}
```

**Note**: Data is stored in-memory for real-time monitoring. Historical data storage may be configured separately.

---

### 2. Get Live Telemetry

**GET** `/telemetry/live/:device_code`

Get the latest live data for a specific device from in-memory cache.

**Headers:**
```
Authorization: Bearer <your-token>  // Optional for live data
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "pressure": 1013.25
  },
  "timestamp": "2026-01-03T08:40:00Z",
  "device_code": "SPS_001",
  "status": "online"
}
```

**Response (No Data):**
```json
{
  "success": true,
  "data": null,
  "status": "offline",
  "message": "No live data available"
}
```

---

### 3. Get Dashboard Stats

**GET** `/telemetry/stats/dashboard`

Get device statistics for the dashboard (your organization).

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "total_devices": 25,
    "online_devices": 18,
    "offline_devices": 7,
    "active_alerts": 2
  },
  "recently_active": [
    {
      "id": "device-uuid",
      "device_code": "SPS_001",
      "name": "Water Sensor #1",
      "type": "sensor",
      "status": "online",
      "last_seen": "2026-01-03T08:40:00Z",
      "data": {
        "temperature": 25.5
      }
    }
  ]
}
```

---

### 4. Get System Stats (Super Admin Only)

**GET** `/telemetry/stats/system`

Get system-wide statistics across all organizations.

**Headers:**
```
Authorization: Bearer <super-admin-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "total_organizations": 5,
    "total_events": 12,
    "total_users": 48,
    "total_devices": 125
  }
}
```

**Errors:**
- `403` - Not a super admin

---

## Events Endpoints

### 1. Get All Events

**GET** `/events`

Get all events (super admin) or events for your organization.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "events": [
    {
      "id": "event-uuid",
      "code": "EVT-001",
      "name": "Annual Conference 2026",
      "description": "Company conference",
      "organization_id": "org-uuid",
      "start_date": "2026-03-15",
      "end_date": "2026-03-17",
      "status": "ACTIVE",
      "image_url": "https://...",
      "created_at": "2025-12-01T00:00:00Z"
    }
  ]
}
```

---

### 2. Get Event by ID

**GET** `/events/:id`

Get detailed event information including departments.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "event": {
    "id": "event-uuid",
    "code": "EVT-001",
    "name": "Annual Conference 2026",
    "description": "...",
    "start_date": "2026-03-15",
    "end_date": "2026-03-17",
    "status": "ACTIVE",
    "organization_id": "org-uuid"
  },
  "departments": [
    {
      "id": "dept-uuid",
      "name": "Catering",
      "description": "Food services",
      "created_at": "2025-12-15T00:00:00Z"
    }
  ]
}
```

---

### 3. Create Event

**POST** `/events`

Create a new event. Requires ORG_ADMIN or EVENT_MANAGER role.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Request:**
```json
{
  "name": "Summer Festival 2026",
  "description": "Annual summer event",
  "start_date": "2026-06-01",
  "end_date": "2026-06-03",
  "image_url": "https://..."  // optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "event": {
    "id": "event-uuid",
    "code": "EVT-002",
    "name": "Summer Festival 2026",
    "organization_id": "org-uuid",
    "status": "DRAFT",
    "created_at": "2026-01-03T08:45:00Z"
  }
}
```

---

### 4. Start/Stop Event

**POST** `/events/:id/start`  
**POST** `/events/:id/stop`

Change event status to ACTIVE or COMPLETED.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Event started successfully",
  "event": {
    "id": "event-uuid",
    "status": "ACTIVE",
    "started_at": "2026-01-03T09:00:00Z"
  }
}
```

---

## Settings Endpoints

### 1. Get System Settings

**GET** `/settings`

Get public system settings.

**Response (200 OK):**
```json
{
  "settings": {
    "site_title": "SustainPro",
    "site_logo": "https://...",
    "maintenance_mode": false,
    "default_timezone": "UTC",
    "session_timeout_enabled": true,
    "support_email": "support@sustainpro.com",
    "support_phone": "+1234567890"
  }
}
```

---

### 2. Update Settings (Admin Only)

**PUT** `/settings`

Update system settings. Requires super admin.

**Headers:**
```
Authorization: Bearer <super-admin-token>
```

**Request:**
```json
{
  "site_title": "SustainPro Platform",
  "support_email": "help@sustainpro.com",
  "session_timeout_enabled": true,
  "max_login_attempts": 5
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "settings": { /* updated settings */ }
}
```

---

## Users Endpoints

### 1. Get All Users

**GET** `/users`

Get users in your organization (or all users if super admin).

**Headers:**
```
Authorization: Bearer <your-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "user-uuid",
      "email": "john@example.com",
      "code": "USR-001",
      "is_active": true,
      "organization_id": "org-uuid",
      "org_name": "Acme Corp",
      "created_at": "2025-11-01T00:00:00Z",
      "last_login_at": "2026-01-03T07:00:00Z",
      "roles": [
        {
          "role": "EVENT_MANAGER",
          "org_id": "org-uuid"
        }
      ]
    }
  ]
}
```

---

### 2. Create User

**POST** `/users`

Create a new user. Requires ORG_ADMIN role.

**Headers:**
```
Authorization: Bearer <your-token>
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecureP@ssw0rd!",
  "full_name": "Jane Smith",
  "organization_id": "org-uuid",
  "role": "TECHNICIAN"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "newuser@example.com",
    "organization_id": "org-uuid",
    "code": "USR-005"
  },
  "message": "User created successfully"
}
```

**Errors:**
- `400` - Missing required fields
- `403` - Insufficient permissions
- `409` - Email already exists

---

## Rate Limiting

### Production Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Registration | 3 attempts | 1 hour |
| General API | 100 requests | 15 minutes |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704268800
```

### Rate Limit Exceeded (429)

```json
{
  "error": "Too many requests from this IP, please try again later"
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| `200` | OK | Successful GET/PUT |
| `201` | Created | Successful POST |
| `400` | Bad Request | Invalid input |
| `401` | Unauthorized | Missing/invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource |
| `422` | Unprocessable | Validation failed |
| `423` | Locked | Account locked |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Internal server error |

---

## Real-Time Updates

### Socket.IO Connection

```javascript
// Connect to Socket.IO server
const socket = io('http://your-server:5000', {
  transports: ['websocket']
});

// Listen for device telemetry updates
socket.on('dashboard:telemetry', (data) => {
  console.log('New telemetry:', data);
  // {
  //   device_code: "SPS_001",
  //   device_id: "uuid",
  //   timestamp: "2026-01-03T08:50:00Z",
  //   data: { temperature: 25.5 },
  //   status: "online",
  //   stats: {
  //     total_devices: 25,
  //     online_devices: 18,
  //     ...
  //   }
  // }
});

// Listen for specific device updates
socket.on('device:SPS_001', (data) => {
  console.log('Device SPS_001 update:', data);
});
```

### Real-Time Events

| Event | Description | Data |
|-------|-------------|------|
| `dashboard:telemetry` | Global telemetry updates | Device data + stats |
| `device:<code>` | Specific device updates | Device telemetry |

---

## Best Practices for Mobile

### 1. Token Management

```kotlin
// Store tokens securely (Android)
val sharedPref = context.getSharedPreferences("auth", Context.MODE_PRIVATE)
with(sharedPref.edit()) {
    putString("access_token", token)
    apply()
}

// Retrieve token
val token = sharedPref.getString("access_token", null)
```

```swift
// Store tokens securely (iOS)
KeychainWrapper.standard.set(token, forKey: "access_token")

// Retrieve token
let token = KeychainWrapper.standard.string(forKey: "access_token")
```

### 2. Automatic Token Refresh

Implement an interceptor to automatically refresh expired tokens:

```javascript
// Pseudo-code
async function apiCall(endpoint) {
  try {
    return await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch (error) {
    if (error.status === 401) {
      // Token expired, refresh it
      const newToken = await refreshToken();
      // Retry original request
      return await fetch(endpoint, {
        headers: { Authorization: `Bearer ${newToken}` }
      });
    }
    throw error;
  }
}
```

### 3. Offline Support

Cache data locally when offline:
- Use SQLite or Realm for local database
- Queue API requests when offline
- Sync when connection restored

### 4. Error Handling

```javascript
try {
  const response = await fetch('/api/v1/devices');
  const data = await response.json();
  
  if (!data.success) {
    // Handle API error
    showError(data.error);
  }
} catch (networkError) {
  // Handle network error
  showError('Network connection failed');
}
```

### 5. Real-Time Connection

Only connect to Socket.IO when needed to save battery:

```javascript
// Connect when viewing live data
const connectSocket = () => {
  socket.connect();
  socket.on('dashboard:telemetry', updateUI);
};

// Disconnect when leaving screen
const disconnectSocket = () => {
  socket.off('dashboard:telemetry');
  socket.disconnect();
};
```

### 6. Pagination (Future)

For large datasets, request data in pages:

```javascript
// GET /devices?page=1&limit=20
```

Currently not implemented but recommended for mobile apps.

---

## CORS Configuration

Mobile apps (no origin header) are allowed by default. Web apps must be in the allowlist configured via `CORS_ALLOWED_ORIGINS` environment variable.

---

## Environment Variables

Configure your mobile app to use the correct API base URL:

**Development**:
```
API_BASE_URL=http://localhost:5000/api/v1
WS_BASE_URL=http://localhost:5000
```

**Production**:
```
API_BASE_URL=https://api.sustainpro.com/api/v1
WS_BASE_URL=https://api.sustainpro.com
```

---

## Support

For API issues or questions:
- **Email**: support@sustainpro.com
- **Documentation**: [Full API Docs](https://docs.sustainpro.com)
- **Status Page**: [status.sustainpro.com](https://status.sustainpro.com)

---

**Last Updated**: January 3, 2026  
**API Version**: 1.0.0
