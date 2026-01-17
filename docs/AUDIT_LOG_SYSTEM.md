# SustainPro Centralized Audit Log System

## Overview

The Centralized Audit Log System provides comprehensive tracking of all activities within the SustainPro platform. It captures:

- **User Authentication Events**: Login, logout, failed attempts, password changes, 2FA events
- **Administrative Actions**: CRUD operations on all resources (users, organizations, events, departments, services, devices)
- **IoT Device Requests**: Telemetry data, commands, status changes
- **System Operations**: Scheduled tasks, background jobs
- **API Requests**: External access via API keys

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Audit Log Flow                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │Auth Service │   │Core Service │   │IoT Service  │            │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘            │
│         │                 │                 │                    │
│         ▼                 ▼                 ▼                    │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              auditLogger.log(...)                       │     │
│  │         @sustainpro/shared-utils                        │     │
│  └────────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Batch Queue (Performance)                  │     │
│  └────────────────────────────────────────────────────────┘     │
│                          │                                       │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                 sps_audit_logs                          │     │
│  │                   (PostgreSQL)                          │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Database Schema

The `sps_audit_logs` table stores all audit entries with the following structure:

### Source Identification
- `source_type`: Who initiated the action (USER, DEVICE, SYSTEM, API)
- `actor_user_id`: User who performed the action
- `actor_device_id`/`actor_device_code`: Device that performed the action
- `actor_api_key_id`: API key used for external access

### Context (Multi-tenant & Hierarchical)
- `organization_id`: Organization the action belongs to
- `event_id`: Event context (if applicable)
- `department_id`: Department context (if applicable)
- `service_id`: Service context (if applicable)

### Action Details
- `category`: Category of action (AUTH, USER, ORGANIZATION, EVENT, etc.)
- `action`: Specific action performed (LOGIN, CREATE, UPDATE, DELETE, etc.)
- `sub_action`: More specific action detail

### Target Resource
- `target_resource`: Type of resource affected
- `target_id`: ID of the affected resource
- `target_name`: Human-readable name

### Change Tracking
- `old_values`: Previous values (for updates)
- `new_values`: New values (for creates/updates)
- `changes`: Diff of changes

### Request Context
- `ip_address`: IP address of the requester
- `user_agent`: Browser/client information
- `request_method`: HTTP method (GET, POST, etc.)
- `request_path`: API endpoint path
- `request_id`: Correlation ID for request tracing

### Result
- `status`: SUCCESS, FAILURE, or PARTIAL
- `error_message`: Error message if failed
- `error_code`: Application-specific error code
- `duration_ms`: How long the action took

## Usage

### 1. Initialize the Audit Logger

In your service startup file (e.g., `server.ts`):

```typescript
import { auditLogger } from '@sustainpro/shared-utils';
import { getPrismaClient } from '@sustainpro/shared-database';

// Initialize audit logger with Prisma client
auditLogger.initialize(getPrismaClient());
```

### 2. Log User Actions

```typescript
import { 
  auditLogger, 
  AuditCategory, 
  AuditAction, 
  AuditSourceType 
} from '@sustainpro/shared-utils';

// User login
await auditLogger.logAuth(AuditAction.LOGIN, {
  actorUserId: user.id,
  organizationId: user.organization_id,
  status: 'SUCCESS',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

// Failed login
await auditLogger.logAuth(AuditAction.LOGIN_FAILED, {
  ipAddress: req.ip,
  status: 'FAILURE',
  errorMessage: 'Invalid password',
  metadata: { email: loginEmail },
});
```

### 3. Log CRUD Operations

```typescript
// Create user
await auditLogger.logUserAction(
  adminUserId,
  AuditCategory.USER,
  AuditAction.CREATE,
  {
    organizationId: orgId,
    targetResource: 'user',
    targetId: newUser.id,
    targetName: newUser.email,
    newValues: { email: newUser.email, full_name: newUser.full_name },
    ipAddress: req.ip,
  }
);

// Update organization
await auditLogger.logUserAction(
  adminUserId,
  AuditCategory.ORGANIZATION,
  AuditAction.UPDATE,
  {
    organizationId: orgId,
    targetResource: 'organization',
    targetId: orgId,
    targetName: org.name,
    oldValues: { name: oldOrg.name },
    newValues: { name: org.name },
    changes: calculateChanges(oldOrg, org),
  }
);
```

### 4. Log Device Actions

```typescript
// Device telemetry
await auditLogger.logDeviceAction(
  device.id,
  device.device_code,
  device.organization_id,
  AuditAction.SEND_TELEMETRY,
  {
    eventId: device.event_id,
    serviceId: device.service_id,
    metadata: { dataPoints: Object.keys(telemetryData) },
  }
);

// Device status change
await auditLogger.logDeviceAction(
  device.id,
  device.device_code,
  device.organization_id,
  AuditAction.STATUS_CHANGE,
  {
    oldValues: { status: 'OFFLINE' },
    newValues: { status: 'ONLINE' },
  }
);
```

### 5. Log with Request Context

Convenient method that extracts user/request info automatically:

```typescript
// In a controller/route handler
await auditLogger.logWithRequest(
  req,
  AuditCategory.EVENT,
  AuditAction.CREATE,
  {
    targetResource: 'event',
    targetId: newEvent.id,
    targetName: newEvent.name,
    newValues: eventData,
  }
);
```

### 6. Query Audit Logs

Use the `AuditLogRepository` for querying:

```typescript
import { createAuditLogRepository } from '@sustainpro/shared-utils';
import { getPrismaClient } from '@sustainpro/shared-database';

const auditRepo = createAuditLogRepository(getPrismaClient());

// Get logs with filtering
const { data, pagination } = await auditRepo.findMany({
  organizationId: orgId,
  category: AuditCategory.AUTH,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
  status: 'FAILURE',
  page: 1,
  limit: 50,
});

// Get user activity timeline
const userLogs = await auditRepo.getUserActivity(userId, {
  limit: 100,
  startDate: sevenDaysAgo,
});

// Get device activity
const deviceLogs = await auditRepo.getDeviceActivity(deviceCode, {
  limit: 100,
});

// Get failed actions (security monitoring)
const failedActions = await auditRepo.getFailedActions({
  organizationId: orgId,
  startDate: lastHour,
});

// Get statistics
const stats = await auditRepo.getStats({
  organizationId: orgId,
  startDate: thisMonth,
});
```

### 7. Export to CSV

```typescript
const csvContent = await auditRepo.exportToCSV({
  organizationId: orgId,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
});

// Save to file or return as response
res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
res.send(csvContent);
```

## Categories

| Category | Description |
|----------|-------------|
| AUTH | Authentication events (login, logout, password changes) |
| USER | User management (CRUD operations on users) |
| ORGANIZATION | Organization management |
| EVENT | Event lifecycle management |
| DEPARTMENT | Department management |
| SERVICE | Service management |
| DEVICE | Device management |
| TELEMETRY | Telemetry data events |
| ALERT | Alert events |
| TASK | Task management |
| SETTINGS | System settings changes |
| RBAC | Role and permission changes |
| API | API key management |
| REPORT | Report generation |
| EXPORT | Data export events |
| NOTIFICATION | Notification events |

## Common Actions

| Action | Description |
|--------|-------------|
| LOGIN | User login |
| LOGIN_FAILED | Failed login attempt |
| LOGOUT | User logout |
| PASSWORD_CHANGE | Password changed |
| CREATE | Resource created |
| READ | Resource viewed |
| UPDATE | Resource updated |
| DELETE | Resource deleted |
| ACTIVATE | Resource activated |
| DEACTIVATE | Resource deactivated |
| SEND_TELEMETRY | Device sent telemetry |
| STATUS_CHANGE | Status changed |
| ASSIGN_ROLE | Role assigned to user |
| REMOVE_ROLE | Role removed from user |
| EXPORT | Data exported |

## Performance Considerations

1. **Batch Processing**: Audit logs are batched and written in groups of 50 (configurable) or every 5 seconds
2. **Immediate Write**: Critical events (auth events) are written immediately
3. **Indexes**: Proper indexes are created for common query patterns
4. **Async**: Logging is non-blocking and doesn't impact request performance

## Data Retention

For compliance and storage management, you can delete old logs:

```typescript
// Delete logs older than 2 years
const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
const deletedCount = await auditRepo.deleteOldLogs(twoYearsAgo);
```

## Migration

To apply the schema changes:

```bash
cd packages/shared-database
npx prisma migrate dev --name add_comprehensive_audit_logs
npx prisma generate
```

## Security Note

Audit logs are immutable records. The system does not provide update functionality for audit entries to ensure non-repudiation and full accountability.
