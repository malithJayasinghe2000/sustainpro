# Generic Service Creation Feature

## Overview

The **Generic Service Creation** feature is a core capability of SustainPro that enables administrators to create reusable service templates with configurable dashboards and device associations. This document provides a comprehensive guide to understanding, using, and testing this feature.

---

## Table of Contents

1. [Feature Purpose](#feature-purpose)
2. [Architecture Overview](#architecture-overview)
3. [How It Integrates with Existing System](#how-it-integrates-with-existing-system)
4. [Data Flow](#data-flow)
5. [Frontend Components](#frontend-components)
6. [Backend API Endpoints](#backend-api-endpoints)
7. [Database Schema](#database-schema)
8. [Testing Guide](#testing-guide)
9. [Troubleshooting](#troubleshooting)

---

## Feature Purpose

### What Problem Does It Solve?

SustainPro is designed to manage IoT devices across multiple organizations, events, and departments. Different use cases require different service configurations:

- **Temperature Monitoring** - Track temperature sensors with threshold alerts
- **Energy Monitoring** - Monitor power consumption with usage analytics
- **Water Management** - Track water flow, quality, and wastage
- **Air Quality** - Monitor CO2, particulates, humidity levels

Rather than hardcoding each service type, the Generic Service Creation feature allows:

1. **Super Admins** to create reusable service templates
2. **Dynamic Dashboard Configuration** via drag-and-drop builder
3. **Device Model Association** - Link specific device types to services
4. **Three Dashboard Views** per service:
   - **Device Dashboard** - Shown when viewing individual device details
   - **Service Dashboard** - Shown on the main service overview page
   - **Public Dashboard** - Shown to unauthenticated users (optional)

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Reusability** | Create once, deploy to multiple departments/events |
| **Flexibility** | Customize dashboards without code changes |
| **Scalability** | Add new service types on-the-fly |
| **Role-Based Access** | Only Super Admins can create/modify templates |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                           │
├──────────────────────────────────────────────────────────────────────────┤
│  /admin/services           - Service template list                        │
│  /admin/services/new       - 4-step service creation wizard              │
│  /admin/services/[id]      - Edit existing service                       │
│  /admin/services/[id]/dashboard - Dashboard builder (drag-drop)          │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          NGINX API GATEWAY (:8888)                        │
│  Routes /api/v1/services/* → Core Service (:5001)                        │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          CORE SERVICE (:5001)                             │
├──────────────────────────────────────────────────────────────────────────┤
│  Controllers:                                                             │
│    - service.controller.ts (CRUD, dashboard updates)                     │
│                                                                           │
│  Services:                                                                │
│    - service.service.ts (business logic, permissions)                    │
│                                                                           │
│  Repositories:                                                            │
│    - service.repository.ts (Prisma database operations)                  │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          POSTGRESQL DATABASE                              │
├──────────────────────────────────────────────────────────────────────────┤
│  Tables:                                                                  │
│    - sps_service_templates      (service definitions)                    │
│    - sps_service_device_models  (device model links)                     │
│    - sps_device_models          (device type definitions)                │
│    - sps_department_services    (service instances per department)       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## How It Integrates with Existing System

### 1. Device Models Integration

Device Models define the types of IoT devices (e.g., "Temperature Sensor", "Power Meter"). Each device model has:
- **Parameters** - Data fields the device reports (e.g., temperature, humidity)
- **Icons** - Visual representation in the UI

**Relationship:** Service Templates link to Device Models via `sps_service_device_models` join table.

```
Service Template ──┬── Device Model 1 (Primary)
                   └── Device Model 2 (Secondary)
```

### 2. Departments Integration

When a service template is "assigned" to a department, it creates a **Department Service Instance**:

```
Service Template (Global)
       │
       ▼ (assign)
┌──────────────────────────────────────┐
│  Department Service Instance         │
│  - Inherits template configuration   │
│  - Can have custom overrides         │
│  - Devices are registered under this │
└──────────────────────────────────────┘
```

### 3. Telemetry & IoT Integration

The IoT Service receives telemetry data from devices. The dashboard widgets configured in the service template are used to visualize this data:

```
Device → IoT Service → Telemetry Data → Dashboard Widget (configured in template)
```

### 4. RBAC Integration

| Role | Permissions |
|------|-------------|
| **Super Admin** | Create, edit, delete templates; modify all dashboards |
| **Org Admin** | View templates; assign to departments |
| **Service Supervisor** | View assigned services; modify PUBLIC dashboard only |
| **Technician** | View devices and readings |
| **Viewer** | View-only access to public dashboards |

---

## Data Flow

### Creating a New Service Template

```
1. User navigates to /admin/services/new
2. Step 1: Basic Info (name, description, category, service type)
3. Step 2: Image Upload (service icon/logo)
4. Step 3: Device Models (select which device types this service uses)
5. Step 4: Parameters (configure custom service parameters)
6. Submit → POST /api/v1/services
7. Backend creates sps_service_templates record
8. Backend creates sps_service_device_models join records
9. Response with created template ID
10. Redirect to service list or dashboard builder
```

### Editing Dashboard Layout

```
1. User navigates to /admin/services/[id]/dashboard
2. Frontend loads template with GET /api/v1/services/[id]
3. User switches between Device/Service/Public dashboard tabs
4. User drags widgets from palette onto grid
5. User configures widget properties (data source, colors, etc.)
6. User clicks Save
7. Frontend sends PUT /api/v1/services/[id]/dashboards/{type}
8. Backend validates user has permission (isSuperAdmin)
9. Backend updates the corresponding JSON column:
   - device_dashboard_layout
   - main_dashboard_layout
   - public_dashboard_layout
10. Response confirms save
```

### Assigning Service to Department

```
1. POST /api/v1/services/{id}/assign
   Body: { department_id, name?, config?, assigned_supervisor_id? }
2. Backend creates sps_department_services record
3. Devices can now be registered under this department service
```

---

## Frontend Components

### Pages

| Path | Component | Purpose |
|------|-----------|---------|
| `/admin/services` | `ServiceListPage` | List all service templates with CRUD actions |
| `/admin/services/new` | `NewServicePage` | 4-step wizard for creating new templates |
| `/admin/services/[id]` | `EditServicePage` | Edit existing template metadata |
| `/admin/services/[id]/dashboard` | `ServiceDashboardPage` | Dashboard builder with drag-drop |

### Key Components

#### 1. Service Creation Wizard (`/admin/services/new/page.tsx`)

A 4-step wizard:
- **Step 1**: Basic information (name, description, category, service type)
- **Step 2**: Image upload for service icon
- **Step 3**: Device model selection (which devices this service uses)
- **Step 4**: Service parameters (custom data fields)

#### 2. Dashboard Builder (`DashboardBuilderDragDrop.tsx`)

React-Grid-Layout based drag-and-drop dashboard editor:
- **Widget Palette** - Available widgets to drag onto canvas
- **Grid Canvas** - Where widgets are placed and arranged
- **Property Panel** - Configure selected widget's properties
- **Save/Preview** - Test and save layouts

#### 3. Widget Components (`/components/dashboard/widgets/`)

25+ widget types organized by category:

| Category | Widgets |
|----------|---------|
| **Layout** | Container, Grid, Tabs, Accordion |
| **Data** | Gauge, ParameterCard, LiveValue, Stats |
| **Visualization** | LineChart, BarChart, PieChart, Heatmap |
| **Monitoring** | DeviceStatus, AlertsList, AuditLog, AvailableDevices |
| **Controls** | ThresholdEditor, RecordingControl, DeviceConfig |
| **Decorative** | Icon, BackgroundImage, Text |

#### 4. Widget Renderer (`WidgetRenderer.tsx`)

Dynamically renders the appropriate widget component based on the widget type:

```tsx
<WidgetRenderer widget={widget} parameters={availableParameters} />
```

---

## Backend API Endpoints

### Service Template CRUD

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/services` | Super Admin | List all templates |
| `GET` | `/api/v1/services/:id` | Super Admin | Get template by ID |
| `POST` | `/api/v1/services` | Super Admin | Create new template |
| `PUT` | `/api/v1/services/:id` | Super Admin | Update template |
| `DELETE` | `/api/v1/services/:id` | Super Admin | Soft-delete template |

### Dashboard Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/services/:id/dashboards/:type` | Authenticated | Get dashboard layout |
| `PUT` | `/api/v1/services/:id/dashboards/:type` | Super Admin | Update dashboard layout |

Where `:type` is one of: `device`, `service`, `public`

### Service Assignment

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/services/:id/assign` | Authenticated | Assign to department |

### Request/Response Examples

#### Create Service Template

**Request:**
```http
POST /api/v1/services
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Temperature Monitoring",
  "description": "Monitor temperature sensors with alerts",
  "category": "MONITORING",
  "service_type": "GLOBAL",
  "has_public_dashboard": true,
  "image_url": "/api/v1/images/services/temp-monitor.png",
  "device_models": [
    { "device_model_id": "uuid-here", "role": "primary", "is_required": true }
  ],
  "service_parameters": [
    { "key": "alert_threshold", "label": "Alert Threshold", "type": "number", "default": 30, "unit": "°C" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "generated-uuid",
    "name": "Temperature Monitoring",
    "code": "TEMPERATURE_MONITORING",
    "category": "MONITORING",
    "created_at": "2026-01-18T00:00:00.000Z"
  }
}
```

#### Update Dashboard Layout

**Request:**
```http
PUT /api/v1/services/abc123/dashboards/device
Authorization: Bearer <token>
Content-Type: application/json

{
  "layout": {
    "widgets": [
      {
        "id": "widget-1",
        "type": "gauge",
        "x": 0,
        "y": 0,
        "w": 4,
        "h": 3,
        "config": {
          "title": "Temperature",
          "parameter": "temperature",
          "min": 0,
          "max": 100,
          "unit": "°C"
        }
      }
    ]
  }
}
```

---

## Database Schema

### sps_service_templates

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR | Display name |
| `code` | VARCHAR | Unique code (auto-generated from name) |
| `category` | VARCHAR | MONITORING, ANALYTICS, etc. |
| `description` | TEXT | Optional description |
| `image_url` | VARCHAR | Service icon URL |
| `service_type` | VARCHAR | GLOBAL, DEPARTMENT, EVENT |
| `has_public_dashboard` | BOOLEAN | Enable public dashboard? |
| `service_parameters` | JSONB | Array of parameter definitions |
| `device_dashboard_layout` | JSONB | Device view widget layout |
| `main_dashboard_layout` | JSONB | Service view widget layout |
| `public_dashboard_layout` | JSONB | Public view widget layout |
| `config_schema` | JSONB | JSON Schema for config validation |
| `default_config` | JSONB | Default configuration values |
| `features` | JSONB | Enabled features array |
| `is_public` | BOOLEAN | Visible to all orgs? |
| `is_active` | BOOLEAN | Soft delete flag |
| `created_by` | UUID | User who created |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

### sps_service_device_models

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `service_template_id` | UUID | FK to templates |
| `device_model_id` | UUID | FK to device_models |
| `role` | VARCHAR | primary, secondary |
| `min_devices` | INTEGER | Minimum required devices |
| `max_devices` | INTEGER | Maximum allowed devices |
| `is_required` | BOOLEAN | Must have at least min_devices? |

---

## Testing Guide

### Prerequisites

1. **Services Running:**
   ```powershell
   cd d:\sustainpro
   npm run dev
   ```
   
2. **Docker Containers:**
   - `sustainpro-gateway` (Nginx on :8888)
   - `sustainpro-postgres` (PostgreSQL on :5434)
   - `sustainpro-rabbitmq` (RabbitMQ on :5672)
   - `sustainpro-redis` (Redis on :6379)

3. **Login Credentials:**
   - Email: `superadmin@sustainpro.io`
   - Password: `SuperAdmin123!`

### Test Flow

#### Step 1: Login

1. Open http://localhost:3000/login
2. Enter super admin credentials
3. Should redirect to dashboard

#### Step 2: Navigate to Services

1. Click **Admin** in sidebar
2. Click **Services** submenu
3. Should see list of existing service templates (if any)

#### Step 3: Create New Service

1. Click **+ Create Service** button
2. **Step 1 - Basic Info:**
   - Name: "Test Temperature Service"
   - Description: "Testing service creation"
   - Category: MONITORING
   - Service Type: GLOBAL
   - ✅ Has Public Dashboard
3. Click **Next**
4. **Step 2 - Image:**
   - Upload a sample image or skip
5. Click **Next**
6. **Step 3 - Device Models:**
   - Select at least one device model (e.g., "Temperature Sensor")
7. Click **Next**
8. **Step 4 - Parameters:**
   - Add parameter: key="threshold", label="Alert Threshold", type="number"
9. Click **Create Service**
10. Should show success toast and redirect to service list

#### Step 4: Build Dashboard

1. Find the created service in the list
2. Click the **Dashboard** action button (or edit → Dashboard Builder)
3. **Dashboard Builder Page:**
   - See three tabs: Device Detail, Service Main, Public
   - Widget palette on the left
   - Grid canvas in the center
4. **Add Widgets:**
   - Drag "Gauge" widget onto canvas
   - Configure: Title="Temperature", Parameter="temperature"
   - Drag "Line Chart" widget below
   - Configure: Title="History", Data Source="telemetry"
5. Click **Save**
6. Should show success toast: "Device Dashboard saved!"

#### Step 5: Verify Save

1. Refresh the page
2. Widgets should persist
3. Switch to "Service Main" tab
4. Add different widgets
5. Save and verify persistence

#### Step 6: Edit Service Template

1. Go back to /admin/services
2. Click Edit on the created service
3. Modify name or description
4. Save changes
5. Verify changes persisted

### API Testing (Optional)

Use the built-in Swagger UI or curl:

```powershell
# Login and get token
$body = '{"email":"superadmin@sustainpro.io","password":"SuperAdmin123!"}'
$response = Invoke-RestMethod -Uri "http://localhost:8888/api/v1/auth/login" `
  -Method POST -Body $body -ContentType "application/json"
$token = $response.token

# List services
Invoke-RestMethod -Uri "http://localhost:8888/api/v1/services" `
  -Headers @{ Authorization = "Bearer $token" }

# Create service
$serviceBody = @{
  name = "API Test Service"
  category = "MONITORING"
  service_type = "GLOBAL"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8888/api/v1/services" `
  -Method POST -Body $serviceBody -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" }
```

---

## Troubleshooting

### Common Issues

#### 1. 403 Forbidden on Dashboard Save

**Cause:** The JWT payload uses `isSuperAdmin` (camelCase) but code was checking `is_super_admin` (snake_case).

**Fix Applied:** Updated `service.controller.ts` to use `user?.isSuperAdmin`.

**Verify:** Login as super admin and try saving dashboard again.

#### 2. Services Not Loading

**Check:**
- Is core-service running on port 5001?
- Is Nginx gateway running on port 8888?
- Check browser console for API errors

```powershell
# Check services
docker ps
netstat -an | findstr "5001 8888"
```

#### 3. Widgets Not Rendering

**Check:**
- Is `WidgetRenderer.tsx` importing the correct widget components?
- Are widget types in `dashboard.ts` matching the component cases?
- Check browser console for React errors

#### 4. Device Models Not Showing

**Check:**
- Are there device models in the database?
- Run seed script if needed:
  ```powershell
  cd d:\sustainpro\backend
  npx ts-node src/scripts/init-device-models.ts
  ```

---

## Files Modified/Created

### Backend (Core Service)

| File | Changes |
|------|---------|
| `service.repository.ts` | Fixed Prisma JsonValue type casting |
| `service.controller.ts` | Fixed `isSuperAdmin` property access |
| `service.routes.ts` | Fixed `authenticateToken` import |
| `service.service.ts` | Business logic for dashboard updates |

### Frontend

| File | Changes |
|------|---------|
| `widgets/*.tsx` | Created 14 new widget components |
| `WidgetRenderer.tsx` | Updated to use new widgets |
| `dashboard.ts` | Fixed types, added `circular_gauge` |
| `api.ts` | Added `updateDashboard`, `getDashboard` methods |
| `/admin/services/new/page.tsx` | Enhanced wizard with image, parameters |
| `/admin/services/[id]/dashboard/page.tsx` | Dashboard builder page |

---

## Future Enhancements

1. **Widget Templates** - Pre-configured widget sets for common use cases
2. **Dashboard Cloning** - Copy layouts between services
3. **Version History** - Track and rollback dashboard changes
4. **Preview Mode** - Test dashboard with sample data before publishing
5. **Mobile Layout** - Responsive widget configurations for mobile views

---

*Document Version: 1.0.0*  
*Last Updated: January 18, 2026*
