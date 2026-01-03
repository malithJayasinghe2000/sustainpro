# SustainPro Mobile API - Quick Start Guide

**Base URL**: `http://your-server:5000/api/v1`

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}

Response:
{
  "token": "eyJhbGci...",
  "user": { ... }
}
```

### Step 2: Use Token
```http
GET /api/v1/devices
Authorization: Bearer eyJhbGci...
```

### Step 3: Send Data (IoT Device)
```http
POST /api/v1/telemetry
Authorization: Bearer <device-api-key>

{
  "data": {
    "temperature": 25.5,
    "humidity": 60
  }
}
```

---

## 📱 Essential Endpoints

### Authentication
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout and clear tokens |
| GET | `/auth/me` | Get current user profile |

### Devices
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/devices` | List all devices |
| GET | `/devices/:id` | Get device details |
| POST | `/devices` | Create new device |
| POST | `/devices/provision` | Provision device |

### Telemetry
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/telemetry` | Send sensor data |
| GET | `/telemetry/live/:code` | Get live device data |
| GET | `/telemetry/stats/dashboard` | Get dashboard stats |

### Events
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/events` | List all events |
| GET | `/events/:id` | Get event details |
| POST | `/events` | Create new event |
| POST | `/events/:id/start` | Start event |

---

## 📖 Common Examples

### Login & Store Token (Android/Kotlin)
```kotlin
// Login
val response = apiService.login(LoginRequest(email, password))
if (response.isSuccessful) {
    val token = response.body()?.token
    // Store securely
    sharedPreferences.edit()
        .putString("access_token", token)
        .apply()
}
```

### Login & Store Token (iOS/Swift)
```swift
// Login
AF.request(
    "\(baseURL)/auth/login",
    method: .post,
    parameters: ["email": email, "password": password],
    encoder: JSONParameterEncoder.default
).responseDecodable(of: LoginResponse.self) { response in
    if let token = response.value?.token {
        KeychainWrapper.standard.set(token, forKey: "access_token")
    }
}
```

### Authenticated Request (Android)
```kotlin
// Add token to all requests
class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = sharedPreferences.getString("access_token", null)
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer $token")
            .build()
        return chain.proceed(request)
    }
}
```

### Authenticated Request (iOS)
```swift
// Add token to headers
let token = KeychainWrapper.standard.string(forKey: "access_token")
let headers: HTTPHeaders = [
    "Authorization": "Bearer \(token)"
]

AF.request(
    "\(baseURL)/devices",
    headers: headers
).responseDecodable(of: DevicesResponse.self) { response in
    // Handle response
}
```

### Socket.IO Real-Time (Android)
```kotlin
val socket = IO.socket("http://your-server:5000")
socket.connect()

socket.on("dashboard:telemetry") { args ->
    val data = args[0] as JSONObject
    runOnUiThread {
        updateUI(data)
    }
}
```

### Socket.IO Real-Time (iOS)
```swift
let manager = SocketManager(
    socketURL: URL(string: "http://your-server:5000")!
)
let socket = manager.defaultSocket

socket.on("dashboard:telemetry") { data, ack in
    if let telemetry = data[0] as? [String: Any] {
        DispatchQueue.main.async {
            self.updateUI(telemetry)
        }
    }
}

socket.connect()
```

---

## 🔒 Security Best Practices

1. **Never hardcode credentials** - Use environment variables
2. **Store tokens securely** - Use Keychain (iOS) or EncryptedSharedPreferences (Android)
3. **Use HTTPS in production** - Never http:// for production
4. **Implement token refresh** - Auto-refresh before expiry
5. **Handle 401 errors** - Redirect to login when unauthorized

---

## ⚠️ Error Handling

### Common Status Codes
- `200/201` ✅ Success
- `400` ❌ Bad request (invalid input)
- `401` 🔒 Unauthorized (login required)
- `403` 🚫 Forbidden (insufficient permissions)
- `404` ❓ Not found
- `429` 🐌 Rate limit exceeded
- `500` 💥 Server error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## 🎯 Data Models

### User Object
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "organization_id": "org-uuid",
  "roles": [...],
  "permissions": [...],
  "timezone": "Asia/Colombo"
}
```

### Device Object
```json
{
  "id": "uuid",
  "device_code": "SPS_001",
  "name": "Water Sensor #1",
  "type": "sensor",
  "status": "ONLINE",
  "last_seen": "2026-01-03T08:30:00Z",
  "api_key": "abc123..."
}
```

### Telemetry Data
```json
{
  "device_code": "SPS_001",
  "timestamp": "2026-01-03T08:40:00Z",
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "pressure": 1013.25
  },
  "status": "online"
}
```

---

## 📚 Full Documentation

See `MOBILE_API.md` for complete documentation including:
- All endpoints with parameters
- Request/response examples
- Rate limiting details
- Socket.IO events
- Mobile best practices

---

## 🆘 Support

- **Full Docs**: `docs/MOBILE_API.md`
- **Email**: support@sustainpro.com
- **Base URL**: Update in your app config

**Last Updated**: January 3, 2026
