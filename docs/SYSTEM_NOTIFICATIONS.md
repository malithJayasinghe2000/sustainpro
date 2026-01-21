# System Notification Service Documentation

## Overview

The SustainPro System Notification Service provides a flexible way to send in-app notifications to users. Notifications appear in the user's navbar bell icon and can be targeted based on:

- **User IDs** - Send to specific users
- **Roles** - Send to users with specific roles (e.g., ORG_ADMIN, EVENT_MANAGER)
- **Organization** - Send to all users in an organization
- **Event** - Send to users assigned to a specific event
- **Super Admins** - Include all system super administrators

---

## Quick Start

### Import the Repository

```typescript
import { systemNotificationRepository } from '../repositories/system-notification.repository';
```

### Send a Simple Notification

```typescript
// Send to a specific user
await systemNotificationRepository.create({
    target_user_id: 'user-uuid-here',
    type: 'info',
    title: 'Welcome!',
    message: 'Your account has been set up successfully.',
    source: 'system'
});
```

---

## Notification Types

| Type | Color | Use Case |
|------|-------|----------|
| `info` | Blue | General information, announcements |
| `warning` | Yellow/Orange | Action needed, pending approvals |
| `critical` | Red | Urgent issues, system alerts |

---

## Targeting Methods

### 1. Single User - `create()`

Send a notification to one specific user.

```typescript
await systemNotificationRepository.create({
    target_user_id: 'user-uuid',
    organization_id: 'org-uuid',  // Optional
    type: 'info',
    title: 'Task Assigned',
    message: 'You have been assigned a new task.',
    source: 'task',
    source_id: 'task-uuid',
    source_name: 'Review Report',
    action_url: '/tasks/task-uuid',
    action_label: 'View Task'
});
```

---

### 2. Multiple Users - `notifyUsers()`

Send the same notification to multiple specific users.

```typescript
await systemNotificationRepository.notifyUsers(
    ['user-id-1', 'user-id-2', 'user-id-3'],
    {
        type: 'info',
        title: 'Meeting Reminder',
        message: 'Team meeting starts in 30 minutes.',
        source: 'calendar',
        organization_id: 'org-uuid'
    }
);
```

---

### 3. By Role - `notifyByRole()`

Send to all users with specific roles in an organization.

```typescript
// Notify all ORG_ADMINs in a specific organization
await systemNotificationRepository.notifyByRole(
    ['ORG_ADMIN'],
    'org-uuid',  // Organization ID (null for all orgs)
    {
        type: 'warning',
        title: 'Approval Required',
        message: 'A new user registration requires your approval.',
        source: 'user',
        action_url: '/admin/approvals',
        action_label: 'Review'
    }
);

// Notify multiple roles
await systemNotificationRepository.notifyByRole(
    ['ORG_ADMIN', 'EVENT_MANAGER'],
    'org-uuid',
    {
        type: 'info',
        title: 'Policy Update',
        message: 'Company policies have been updated.',
        source: 'system'
    }
);
```

**Available Roles:**
- `SUPER_ADMIN`
- `ORG_ADMIN`
- `EVENT_MANAGER`
- `DEPT_MANAGER`
- `VIEWER`

---

### 4. All Organization Users - `notifyOrganization()`

Send to ALL active users in an organization.

```typescript
await systemNotificationRepository.notifyOrganization(
    'org-uuid',
    {
        type: 'info',
        title: 'Company Announcement',
        message: 'The office will be closed next Monday for maintenance.',
        source: 'system',
        source_name: 'HR Department'
    }
);
```

---

### 5. Event Users - `notifyEventUsers()`

Send to all users assigned to a specific event.

```typescript
await systemNotificationRepository.notifyEventUsers(
    'event-uuid',
    {
        type: 'warning',
        title: 'Event Schedule Changed',
        message: 'The start time has been moved to 10:00 AM.',
        source: 'event',
        source_id: 'event-uuid',
        source_name: 'Tech Conference 2024',
        action_url: '/events/event-uuid',
        action_label: 'View Event'
    }
);
```

---

### 6. Super Admins + Org Admins - `notifySuperAndOrgAdmins()`

Send to all super admins AND organization admins for a specific organization.

```typescript
await systemNotificationRepository.notifySuperAndOrgAdmins(
    'org-uuid',
    {
        type: 'warning',
        title: 'Event End Request',
        message: 'An event manager has requested to end "Tech Conference".',
        source: 'event',
        source_id: 'event-uuid',
        source_name: 'Tech Conference 2024',
        action_url: '/events/event-uuid',
        action_label: 'Review Request'
    }
);
```

---

### 7. Flexible Combined - `notify()`

The most powerful method - combine multiple targeting options.

```typescript
await systemNotificationRepository.notify(
    {
        // Targeting options (all optional, use any combination)
        userIds: ['user-1', 'user-2'],      // Specific users
        roles: ['ORG_ADMIN', 'EVENT_MANAGER'], // Role-based
        organizationId: 'org-uuid',          // Filter roles by org
        eventId: 'event-uuid',               // Filter by event
        includeSuperAdmins: true,            // Include all super admins
        allOrgUsers: false                   // Include ALL org users
    },
    {
        type: 'critical',
        title: 'System Alert',
        message: 'Critical issue detected.',
        source: 'monitoring',
        action_url: '/admin/alerts',
        action_label: 'View Details'
    }
);
```

---

## Notification Payload Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `'critical' \| 'warning' \| 'info'` | ✅ | Notification severity |
| `title` | `string` | ✅ | Short title (max 255 chars) |
| `message` | `string` | ✅ | Full notification message |
| `source` | `string` | ✅ | Source system (e.g., 'event', 'device', 'system') |
| `source_id` | `string` | ❌ | UUID of related entity |
| `source_name` | `string` | ❌ | Human-readable name of source |
| `action_url` | `string` | ❌ | URL to navigate when clicked |
| `action_label` | `string` | ❌ | Button/link label text |
| `metadata` | `object` | ❌ | Additional JSON data |
| `organization_id` | `string` | ❌ | Organization context |

---

## Real-World Examples

### Example 1: Event End Request (Current Implementation)

```typescript
// In event.service.ts - requestEndEvent()
await systemNotificationRepository.notifySuperAndOrgAdmins(
    event.organization_id,
    {
        type: 'warning',
        title: 'Event End Request',
        message: `An event manager has requested to end the event "${event.name}" (${event.code}).`,
        source: 'event',
        source_id: eventId,
        source_name: event.name,
        action_url: `/events/${eventId}`,
        action_label: 'Review Request',
        metadata: {
            event_id: eventId,
            event_name: event.name,
            requested_by: userId,
            requested_at: new Date().toISOString()
        }
    }
);
```

### Example 2: Device Offline Alert

```typescript
await systemNotificationRepository.notify(
    {
        roles: ['ORG_ADMIN', 'DEPT_MANAGER'],
        organizationId: device.organization_id
    },
    {
        type: 'critical',
        title: 'Device Offline',
        message: `Device "${device.name}" has been offline for more than 1 hour.`,
        source: 'device',
        source_id: device.id,
        source_name: device.name,
        action_url: `/devices/${device.id}`,
        action_label: 'View Device'
    }
);
```

### Example 3: User Account Created

```typescript
await systemNotificationRepository.create({
    target_user_id: newUser.id,
    type: 'info',
    title: 'Welcome to SustainPro!',
    message: 'Your account has been created. Complete your profile to get started.',
    source: 'system',
    action_url: '/profile',
    action_label: 'Complete Profile'
});
```

### Example 4: Bulk Organization Announcement

```typescript
await systemNotificationRepository.notifyOrganization(
    organizationId,
    {
        type: 'info',
        title: 'New Feature Available',
        message: 'We have launched a new dashboard! Check out the updated analytics.',
        source: 'system',
        action_url: '/dashboard',
        action_label: 'Try Now'
    }
);
```

### Example 5: Event-Specific Notification

```typescript
await systemNotificationRepository.notifyEventUsers(
    eventId,
    {
        type: 'warning',
        title: 'Shift Change',
        message: 'Your shift has been updated. Please review the new schedule.',
        source: 'event',
        source_id: eventId,
        action_url: `/events/${eventId}/schedule`,
        action_label: 'View Schedule'
    }
);
```

---

## Frontend Display

Notifications are displayed in the **Navbar** bell icon:

1. **Badge Count** - Shows unread notification count
2. **Dropdown List** - Shows recent notifications with:
   - Color-coded indicator (red/yellow/blue)
   - Title and message
   - Source name
   - Action button (if `action_url` provided)
   - Relative time (e.g., "5m ago")
3. **Click Action** - Clicking a notification:
   - Marks it as read
   - Navigates to `action_url` if provided

---

## API Endpoints

The notification system also exposes REST API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | Get current user's notifications |
| GET | `/api/v1/notifications/unread-count` | Get unread count |
| POST | `/api/v1/notifications/:id/read` | Mark as read |
| POST | `/api/v1/notifications/read-all` | Mark all as read |
| DELETE | `/api/v1/notifications/:id` | Dismiss notification |

---

## Database Schema

Notifications are stored in the `sps_system_notifications` table:

```sql
CREATE TABLE sps_system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_user_id UUID NOT NULL REFERENCES sps_users(id),
    organization_id UUID,
    type VARCHAR(20) DEFAULT 'INFO',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'system',
    source_id UUID,
    source_name VARCHAR(255),
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
```

---

## Best Practices

1. **Use appropriate severity**
   - `info` - FYI messages, confirmations
   - `warning` - Action needed, pending items
   - `critical` - Urgent, system issues

2. **Provide action URLs** - Make notifications actionable

3. **Keep messages concise** - Title under 50 chars, message under 200 chars

4. **Use source fields** - Help users understand context

5. **Include metadata** - Store extra data for debugging/logging

6. **Don't spam** - Batch similar notifications

---

## Troubleshooting

### Notifications not appearing?

1. Check if the target user exists and is active
2. Check browser console for API errors
3. Verify the notification was created in database:
   ```sql
   SELECT * FROM sps_system_notifications 
   WHERE target_user_id = 'user-uuid' 
   ORDER BY created_at DESC;
   ```

### Wrong users receiving notifications?

1. Check the role assignments in `sps_role_assignments`
2. Verify `organization_id` is correct
3. Check logs for "Found users for notification" messages

---

## Support

For issues or questions, check the core-service logs or contact the development team.
