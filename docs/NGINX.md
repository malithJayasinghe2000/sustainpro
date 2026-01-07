# nginx API Gateway

## 🌐 What is nginx?

nginx (pronounced "engine-x") is a high-performance **HTTP server** and **reverse proxy**. In SustainPro, it acts as the **API Gateway** - a single entry point for all client requests.

## 🎯 Why We Use nginx

### 1. **Single Entry Point**
Instead of clients connecting to 3 different services:
```
Client -> http://localhost:5000/auth
Client -> http://localhost:5001/organizations  
Client -> http://localhost:5002/telemetry
```

They connect to ONE gateway:
```
Client -> http://localhost:8080/api/v1/auth
Client -> http://localhost:8080/api/v1/organizations
Client -> http://localhost:8080/api/v1/telemetry
```

### 2. **Load Balancing**
nginx distributes requests across multiple service instances:
```
Client Request
     ↓
nginx Gateway
     ├─→ auth-service-1
     ├─→ auth-service-2
     └─→ auth-service-3
```

### 3. **Security**
- **CORS**: Centralized CORS header management
- **Rate Limiting**: Block abusive clients
- **SSL/TLS**: HTTPS termination
- **Hide Internal Architecture**: Clients don't know about microservices

### 4. **Performance**
- **Caching**: Cache static responses
- **Compression**: gzip responses
- **Connection Pooling**: Reuse connections to services

## 📁 nginx Files Location

```
docker/
├── nginx/
│   ├── nginx.conf              # Main configuration
│   └── conf.d/
│       └── default.conf        # Server & routing rules
```

**Why in `docker/nginx/` and not `services/gateway/`?**
- `docker/nginx/` → Configuration files for the nginx container
- `services/gateway/` → ❌ Removed (was redundant)
- nginx is **infrastructure**, not a custom microservice

## 🏗️ Configuration Structure

### 1. Main Configuration (`nginx.conf`)

```nginx
# Worker processes (CPU cores)
worker_processes auto;

events {
    worker_connections 1024;  # Max concurrent connections per worker
}

http {
    # Logging
    log_format main '$remote_addr - $request - $status';
    access_log /var/log/nginx/access.log main;
    
    # Compression
    gzip on;
    gzip_types text/plain application/json;
    
    # Timeouts
    keepalive_timeout 65;
    
    # Include server blocks
    include /etc/nginx/conf.d/*.conf;
}
```

### 2. Server Configuration (`conf.d/default.conf`)

```nginx
# Define backend services
upstream auth_service {
    server host.docker.internal:5000;
}

upstream core_service {
    server host.docker.internal:5001;
}

upstream iot_service {
    server host.docker.internal:5002;
}

server {
    listen 80;
    
    # CORS Headers
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    
    # Route /api/v1/auth/* to auth-service
    location /api/v1/auth {
        proxy_pass http://auth_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Route /api/v1/organizations/* to core-service
    location /api/v1/organizations {
        proxy_pass http://core_service;
    }
    
    # Route /api/v1/telemetry/* to iot-service
    location /api/v1/telemetry {
        proxy_pass http://iot_service;
    }
}
```

## 🛣️ Routing Table

| Client Request | nginx Routes to | Service Port |
|----------------|-----------------|--------------|
| `/api/v1/auth/*` | Auth Service | 5000 |
| `/api/v1/users/*` | Auth Service | 5000 |
| `/api/v1/rbac/*` | Auth Service | 5000 |
| `/api/v1/organizations/*` | Core Service | 5001 |
| `/api/v1/events/*` | Core Service | 5001 |
| `/api/v1/departments/*` | Core Service | 5001 |
| `/api/v1/devices/*` | Core Service | 5001 |
| `/api/v1/device-models/*` | Core Service | 5001 |
| `/api/v1/telemetry/*` | IoT Service | 5002 |
| `/socket.io/*` | IoT Service | 5002 |
| `/health` | nginx Health Check | - |

## 🔒 Security Features

### 1. CORS (Cross-Origin Resource Sharing)

```nginx
# Allow requests from frontend
if ($http_origin ~* "^https?://(localhost:3000|app.sustainpro.com)$") {
    set $cors "true";
}

add_header 'Access-Control-Allow-Origin' '$http_origin' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
```

### 2. Rate Limiting

```nginx
# Limit requests to 100/second per IP
limit_req_zone $binary_remote_addr zone=ip_limit:10m rate=100r/s;

# Limit requests to 1000/second per API key
limit_req_zone $http_x_api_key zone=api_limit:10m rate=1000r/s;

server {
    location /api/ {
        limit_req zone=ip_limit burst=20 nodelay;
        limit_req zone=api_limit burst=50 nodelay;
    }
}
```

**Explanation:**
- `rate=100r/s` - 100 requests per second average
- `burst=20` - Allow bursts up to 120 requests/second
- `nodelay` - Process burst immediately (no queueing)

### 3. Header Sanitization

```nginx
# Remove internal headers from responses
proxy_hide_header X-Powered-By;
proxy_hide_header Server;

# Add security headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## ⚡ Performance Optimization

### 1. Connection Pooling

```nginx
upstream auth_service {
    server auth-service:5000;
    keepalive 32;  # Keep 32 connections alive
}

server {
    location /api/v1/auth {
        proxy_pass http://auth_service;
        proxy_http_version 1.1;
        proxy_set_header Connection "";  # Enable connection reuse
    }
}
```

### 2. Caching

```nginx
# Cache zone
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g;

server {
    location /api/v1/device-models {
        proxy_cache api_cache;
        proxy_cache_valid 200 10m;  # Cache 200 responses for 10 minutes
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

### 3. Compression

```nginx
http {
    gzip on;
    gzip_vary on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1000;  # Only compress responses > 1KB
}
```

## 🔌 WebSocket Support (Socket.IO)

```nginx
# Special configuration for Socket.IO
location /socket.io/ {
    proxy_pass http://iot_service;
    
    # WebSocket headers
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Timeouts (long-lived connections)
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

## 🐳 Docker Integration

### docker-compose.yml

```yaml
gateway:
  image: nginx:alpine
  container_name: sustainpro-gateway
  ports:
    - "8080:80"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/conf.d:/etc/nginx/conf.d:ro
  extra_hosts:
    - "host.docker.internal:host-gateway"  # Access host services
```

**Why `extra_hosts`?**
In development, microservices run on the **host machine** (not in containers). nginx needs to reach them via `host.docker.internal`.

## 📊 Monitoring

### 1. Access Logs

```nginx
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

access_log /var/log/nginx/access.log detailed;
```

### 2. Health Check Endpoint

```nginx
location /health {
    access_log off;
    return 200 "nginx OK\n";
    add_header Content-Type text/plain;
}
```

Test: `curl http://localhost:8080/health`

### 3. Status Module

```nginx
location /nginx-status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;  # Only allow localhost
    deny all;
}
```

Shows: Active connections, requests/second, etc.

## 🎯 Load Balancing Strategies

### 1. Round Robin (Default)

```nginx
upstream core_service {
    server core-1:5001;
    server core-2:5001;
    server core-3:5001;
}
# Distributes: req1→core-1, req2→core-2, req3→core-3, req4→core-1...
```

### 2. Least Connections

```nginx
upstream core_service {
    least_conn;
    server core-1:5001;
    server core-2:5001;
}
# Routes to server with fewest active connections
```

### 3. IP Hash (Sticky Sessions)

```nginx
upstream core_service {
    ip_hash;
    server core-1:5001;
    server core-2:5001;
}
# Same client IP always goes to same server
```

### 4. Weighted Load Balancing

```nginx
upstream core_service {
    server core-1:5001 weight=3;  # Gets 3x more requests
    server core-2:5001 weight=1;
}
```

## 🚀 Production Best Practices

### 1. SSL/TLS Termination

```nginx
server {
    listen 443 ssl http2;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Redirect HTTP to HTTPS
    if ($scheme = http) {
        return 301 https://$host$request_uri;
    }
}
```

### 2. Request Size Limits

```nginx
http {
    client_max_body_size 10M;  # Max request body size
    client_body_timeout 12s;
    client_header_timeout 12s;
}
```

### 3. Buffer Tuning

```nginx
http {
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    proxy_busy_buffers_size 8k;
}
```

## 🔧 Troubleshooting

### Check Configuration Syntax

```bash
docker exec sustainpro-gateway nginx -t
```

### Reload Configuration (No Downtime)

```bash
docker exec sustainpro-gateway nginx -s reload
```

### View Logs

```bash
# Access logs
docker exec sustainpro-gateway tail -f /var/log/nginx/access.log

# Error logs
docker exec sustainpro-gateway tail -f /var/log/nginx/error.log
```

### Test Routing

```bash
# Test auth route
curl -v http://localhost:8080/api/v1/auth/health

# Test core route
curl -v http://localhost:8080/api/v1/organizations

# Check headers
curl -I http://localhost:8080/health
```

## 📚 Further Reading

- [nginx Official Docs](https://nginx.org/en/docs/)
- [nginx as API Gateway](https://www.nginx.com/blog/deploying-nginx-nginx-plus-docker/)
- [Load Balancing Methods](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)
- [Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)

---

**💡 Key Takeaway**: nginx is the **traffic cop** of your microservices, routing requests, enforcing rate limits, handling CORS, and providing a unified API interface to clients.
