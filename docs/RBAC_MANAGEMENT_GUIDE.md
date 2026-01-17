# SustainPro RBAC Management Guide

This guide explains how to manage roles, permissions, and user access in SustainPro.

## Overview

SustainPro uses a **seed-based RBAC system** where:
- **Roles** are defined in the database seed file
- **Permissions** are defined in the seed file
- **Role-Permission mappings** can be configured via the Admin UI
- User role assignments are managed through the user management interface

This approach ensures:
1. ✅ Consistent permissions across all environments (dev, staging, prod)
2. ✅ Version-controlled role/permission changes
3. ✅ No accidental permission drift between deployments
4. ✅ Clear audit trail of permission changes in git

---

## Table of Contents

1. [System Roles](#system-roles)
2. [Permissions](#permissions)
3. [How to Add a New Permission](#how-to-add-a-new-permission)
4. [How to Add a New Role](#how-to-add-a-new-role)
5. [Configuring Role Permissions (Admin UI)](#configuring-role-permissions-admin-ui)
6. [Assigning Roles to Users](#assigning-roles-to-users)
7. [Using Permissions in Code](#using-permissions-in-code)
8. [Best Practices](#best-practices)

---

## System Roles

Roles are hierarchical with levels (lower number = higher authority):

| Role Code | Display Name | Level | Description |
|-----------|--------------|-------|-------------|
| `SUPER_ADMIN` | Super Admin | 0 | Platform-wide super administrator |
| `ORG_ADMIN` | Organization Admin | 1 | Full control over an organization |
| `EVENT_MANAGER` | Event Manager | 2 | Manages events and departments |
| `DEPT_HEAD` | Department Head | 3 | Oversees a department |
| `SERVICE_SUPERVISOR` | Service Supervisor | 4 | Manages service deployments |
| `TECHNICIAN` | Onsite Technician | 5 | Ground-level device management |
| `SERVICE_SUPPLIER` | Service Supplier | 5 | External supplier access |
| `VIEWER` | Organizer Viewer | 6 | Read-only access |

### Role Hierarchy Rules
- Users can only assign roles at their level or **below** (higher level number)
- Example: An `ORG_ADMIN` (level 1) can assign `EVENT_MANAGER` (level 2) but not `SUPER_ADMIN` (level 0)

---

## Permissions

Permissions control access to specific features. They follow a `module.action` naming convention:

### Current Permissions

| Code | Name | Module | Description |
|------|------|--------|-------------|
| `dashboard.view` | View Dashboard | Dashboard | View main dashboard |
| `devices.view` | View Devices | Devices | View device list |
| `devices.manage` | Manage Devices | Devices | Create, update, delete devices |
| `events.view` | View Events | Events | View events |
| `events.manage` | Manage Events | Events | Create, update, delete events |
| `users.view` | View Users | Users | View user list |
| `users.manage` | Manage Users | Users | Create, update, delete users |
| `reports.view` | View Reports | Reports | View analytics and reports |
| `settings.manage` | Manage Settings | Settings | Manage system settings |
| `telemetry.view` | View Telemetry | Telemetry | View telemetry data |
| `alerts.manage` | Manage Alerts | Alerts | Create and manage alert rules |

---

## How to Add a New Permission

When adding a new feature that requires access control:

### Step 1: Add Permission to Seed File

Edit `packages/shared-database/prisma/seed.ts`:

```typescript
// Find the permissions array (around line 520)
const permissions = [
    // ... existing permissions
    
    // ADD YOUR NEW PERMISSION HERE:
    { 
        name: 'Manage Departments', 
        code: 'departments.manage', 
        description: 'Create, update, delete departments', 
        category: 'departments' 
    },
];
```

### Step 2: Add to Role Mappings

In the same file, add the permission to appropriate roles:

```typescript
// Find rolePermissionMappings (around line 710)
const rolePermissionMappings: Record<string, string[]> = {
    'ORG_ADMIN': [
        // ... existing permissions
        'departments.manage',  // ADD HERE
    ],
    'EVENT_MANAGER': [
        // ... existing permissions
        'departments.manage',  // ADD HERE if needed
    ],
    // ... other roles
};
```

### Step 3: Run the Seeder

```bash
cd packages/shared-database
npm run prisma:seed
```

### Step 4: Use in Backend Route

```typescript
import { requirePermission } from '@sustainpro/shared-middleware';

// Protect your route
router.post('/departments', 
    authenticateToken, 
    requirePermission('departments.manage'), 
    departmentController.create
);
```

### Step 5: Use in Frontend

```tsx
import { usePermissions } from '@/hooks/usePermissions';

function DepartmentPage() {
    const { can } = usePermissions();
    
    return (
        <div>
            {can('departments.manage') && (
                <button>Create Department</button>
            )}
        </div>
    );
}
```

---

## How to Add a New Role

### Step 1: Add Role to Seed File

Edit `packages/shared-database/prisma/seed.ts`:

```typescript
// Find the roles array (around line 550)
const roles = [
    // ... existing roles
    
    // ADD YOUR NEW ROLE:
    {
        code: 'FLEET_MANAGER',
        name: 'Fleet Manager',
        description: 'Manages vehicle fleet and logistics',
        level: 4,  // Same level as SERVICE_SUPERVISOR
        icon: 'Truck',
        color: '#06B6D4',
        is_system: true,
    },
];
```

### Step 2: Define Role Permissions

```typescript
const rolePermissionMappings: Record<string, string[]> = {
    // ... existing roles
    
    'FLEET_MANAGER': [
        'dashboard.view',
        'devices.view',
        'devices.manage',
        'telemetry.view',
    ],
};
```

### Step 3: Add to Frontend Constants

Edit `frontend/src/lib/roles.ts`:

```typescript
export const ROLES = {
    // ... existing roles
    FLEET_MANAGER: 'FLEET_MANAGER',
} as const;

export const ROLE_LABELS: Record<string, string> = {
    // ... existing labels
    'FLEET_MANAGER': 'Fleet Manager',
};

export const ROLE_LEVELS: Record<string, number> = {
    // ... existing levels
    'FLEET_MANAGER': 4,
};
```

### Step 4: Run the Seeder

```bash
cd packages/shared-database
npm run prisma:seed
```

---

## Configuring Role Permissions (Admin UI)

Super Admins can modify role-permission mappings through the Admin UI:

1. Log in as Super Admin
2. Navigate to **Admin → Access Control (RBAC)**
3. Select a role from the left panel
4. Toggle permissions on/off
5. Click **Save Changes**

> ⚠️ **Note**: Changes take effect immediately for all users with that role.

### What Can Be Changed in UI

| Feature | Changeable in UI | Where to Change |
|---------|------------------|-----------------|
| Permission assignments | ✅ Yes | Admin → RBAC → Permission Matrix |
| Role display name | ✅ Yes | Admin → RBAC → View Roles → Edit |
| Role description | ✅ Yes | Admin → RBAC → View Roles → Edit |
| Role color | ✅ Yes | Admin → RBAC → View Roles → Edit |
| Role code | ❌ No | Seed file only |
| Role level | ❌ No | Seed file only |
| Add new role | ❌ No | Seed file only |
| Add new permission | ❌ No | Seed file only |

---

## Assigning Roles to Users

### Via UI

1. Navigate to **Users** page
2. Click **Edit** (pencil icon) on a user
3. Select the new role from the dropdown
4. Click **Save**

### Via API

```bash
# Update user with new role
PUT /api/v1/users/:userId
{
    "role": "EVENT_MANAGER"
}
```

### Important Notes

- When changing a user's role, the old role is **replaced** (not added)
- Users can only have one primary role (with optional scoped context)
- Role changes take effect immediately after login

---

## Using Permissions in Code

### Backend Middleware

```typescript
import { 
    authenticateToken, 
    requirePermission,
    requireSuperAdmin 
} from '@sustainpro/shared-middleware';

// Single permission
router.get('/users', 
    authenticateToken, 
    requirePermission('users.view'), 
    userController.list
);

// Super admin only
router.delete('/system/reset', 
    authenticateToken, 
    requireSuperAdmin, 
    systemController.reset
);
```

### Frontend Hook

```tsx
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
    const { can, canAny, canAll, permissions, isLoading } = usePermissions();
    
    // Check single permission
    if (can('users.manage')) {
        // Show edit button
    }
    
    // Check any of multiple permissions
    if (canAny(['users.view', 'users.manage'])) {
        // Show users section
    }
    
    // Check all permissions required
    if (canAll(['devices.view', 'devices.manage'])) {
        // Show full device management
    }
}
```

### Sidebar Navigation

The sidebar automatically hides items based on permissions. Configure in `DashboardLayout.tsx`:

```typescript
const sidebarItems = [
    {
        label: 'Users',
        href: '/users',
        icon: Users,
        permission: 'users.view',  // Required permission
    },
    // ...
];
```

---

## Best Practices

### Permission Naming Convention

```
module.action
```

Examples:
- `users.view` - Read access to users
- `users.manage` - Full CRUD access to users
- `devices.export` - Export device data
- `reports.generate` - Generate reports

### Role Design Guidelines

1. **Keep roles focused**: Each role should have a clear purpose
2. **Use hierarchy**: Leverage role levels for inheritance logic
3. **Minimal permissions**: Start with minimum required permissions
4. **Document changes**: Update this guide when adding roles/permissions

### Security Considerations

1. **Always check server-side**: Never rely only on frontend permission checks
2. **Use specific permissions**: Prefer `users.manage` over generic `admin`
3. **Audit regularly**: Review role-permission mappings periodically
4. **Log access**: Important actions should be logged with user context

---

## Troubleshooting

### User Can't Access a Feature

1. Check the user's role: `GET /api/v1/users/:id`
2. Check role permissions: Admin → RBAC → Permission Matrix
3. Verify the route uses the correct permission middleware
4. Clear permission cache if needed (logout/login)

### Permission Not Showing in UI

1. Verify permission is in seed file
2. Run seeder: `npm run prisma:seed`
3. Check category matches frontend grouping
4. Refresh the RBAC page

### Role Changes Not Taking Effect

1. User needs to log out and log back in
2. Check if cache invalidation is working (RabbitMQ connected)
3. Verify the role assignment was saved: `GET /api/v1/users/:id`

---

## Quick Reference

### Seed File Location
```
packages/shared-database/prisma/seed.ts
```

### Run Seeder
```bash
cd packages/shared-database
npm run prisma:seed
```

### Key Files

| File | Purpose |
|------|---------|
| `packages/shared-database/prisma/seed.ts` | Roles, permissions, mappings |
| `frontend/src/lib/roles.ts` | Frontend role constants |
| `frontend/src/hooks/usePermissions.ts` | Permission checking hook |
| `packages/shared-middleware/src/rbac.middleware.ts` | Backend permission middleware |
| `services/auth-service/src/services/rbac.service.ts` | RBAC business logic |

---

## Example: Adding "Departments" Feature

Here's a complete example of adding department management:

### 1. Add Permission (seed.ts)
```typescript
{ name: 'View Departments', code: 'departments.view', description: 'View department list', category: 'departments' },
{ name: 'Manage Departments', code: 'departments.manage', description: 'Create, update, delete departments', category: 'departments' },
```

### 2. Assign to Roles (seed.ts)
```typescript
'ORG_ADMIN': [..., 'departments.view', 'departments.manage'],
'EVENT_MANAGER': [..., 'departments.view', 'departments.manage'],
'DEPT_HEAD': [..., 'departments.view'],
```

### 3. Protect Backend Route
```typescript
router.get('/departments', authenticateToken, requirePermission('departments.view'), controller.list);
router.post('/departments', authenticateToken, requirePermission('departments.manage'), controller.create);
```

### 4. Protect Frontend
```tsx
{can('departments.manage') && <CreateDeptButton />}
```

### 5. Add Sidebar Item
```typescript
{ label: 'Departments', href: '/departments', icon: Building2, permission: 'departments.view' },
```

### 6. Run Seeder & Test
```bash
npm run prisma:seed
npm run dev
```

---

**Last Updated**: January 2026
