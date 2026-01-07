# SustainPro API Gateway

Nginx-based API Gateway for routing requests to SustainPro microservices.

## Files

- `nginx.conf` - Production configuration (services in Docker network)
- `nginx.dev.conf` - Development configuration (services on host machine)
- `Dockerfile` - Container image definition

## Quick Start

### Development Mode

When running services on your host machine (not in Docker):

```bash
# Build the gateway image
docker build -t sustainpro-gateway .

# Run with development config
docker run -p 8080:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v $(pwd)/nginx.dev.conf:/etc/nginx/nginx.conf:ro \
  sustainpro-gateway
```

### Production Mode

Using docker-compose:

```bash
cd docker
docker-compose -f docker-compose.prod.yml up gateway
```

## Service Routes

| Path | Service | Port |
|------|---------|------|
| `/api/v1/auth/*` | auth-service | 5000 |
| `/api/v1/users/*` | auth-service | 5000 |
| `/api/v1/rbac/*` | auth-service | 5000 |
| `/api/v1/organizations/*` | core-service | 5001 |
| `/api/v1/events/*` | core-service | 5001 |
| `/api/v1/departments/*` | core-service | 5001 |
| `/api/v1/services/*` | core-service | 5001 |
| `/api/v1/settings/*` | core-service | 5001 |
| `/api/v1/upload/*` | core-service | 5001 |
| `/api/v1/devices/*` | core-service | 5001 |
| `/api/v1/device-models/*` | core-service | 5001 |
| `/api/v1/telemetry/*` | iot-service | 5002 |
| `/api/v1/webhook/*` | iot-service | 5002 |
| `/socket.io/*` | iot-service | 5002 |

## Rate Limits

- Auth endpoints: 5 requests/second
- API endpoints: 30 requests/second
- Telemetry: 100 requests/second
- Upload: 2 requests/second

## Health Check

```bash
curl http://localhost:8080/health
```

## Customization

To add new routes or modify rate limits, edit `nginx.conf` and rebuild the container.
