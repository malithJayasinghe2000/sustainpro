# Generic Service Creation - Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for the **Generic Service Creation Tool** in SustainPro. This feature allows Super Admins to create reusable IoT service templates that combine device models, service parameters, and multi-type dashboard templates. Once created, these templates become available in the service catalog for department assignment.

## Current State Analysis

### Existing Infrastructure ✅

| Component | Status | Location |
|-----------|--------|----------|
| Prisma Schema | Partially Complete | `packages/shared-database/prisma/schema.prisma` |
| Service Templates Model | Exists | `sps_service_templates` |
| Device Models Model | Exists | `sps_device_models` |
| Service-Device Linking | Exists | `sps_service_device_models` |
| Dashboard Builder (Frontend) | Exists | `frontend/src/components/dashboard/` |
| Services API | Basic CRUD | `services/core-service/src/` |

### Current Gaps 🔴

1. **Dashboard Persistence**: Dashboard layouts are NOT being saved to database
2. **Service Parameters**: No dedicated table/field for aggregation parameters (e.g., `total_liters = sum(all devices)`)
3. **Device Dashboard Template**: Missing `device_dashboard_layout` field in schema
4. **Widget Library**: Only 8 widget types exist; requirement specifies 15+ widgets
5. **Access Control**: No granular permission for Service Supervisor public dashboard editing
6. **Service Image**: No `image_url` field on `sps_service_templates`
7. **Public Dashboard Flag**: `is_public` exists but no `has_public_dashboard` distinction

---

## Data Model Enhancements

### 1. Enhanced Service Templates Schema

```prisma
model sps_service_templates {
  id                          String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  name                        String    @unique @db.VarChar(100)
  code                        String    @unique @db.VarChar(50)
  category                    String?   @default("MONITORING") @db.VarChar(50)
  description                 String?
  
  // NEW: Service Image
  image_url                   String?
  
  // NEW: Service Type
  service_type                String    @default("GLOBAL") @db.VarChar(20) // GLOBAL, INTERNAL
  
  // NEW: Public Dashboard Configuration
  has_public_dashboard        Boolean   @default(false)
  
  // NEW: Service-Level Parameters (aggregation definitions)
  service_parameters          Json?     @default("[]")
  // Format: [{ key: "total_liters", name: "Total Liters", icon: "droplet", 
  //            dataType: "number", unit: "L", aggregation: "SUM", sourceParam: "liters" }]
  
  // Dashboard Layouts (3 types)
  device_dashboard_layout     Json?     @default("{\"widgets\": []}")  // NEW
  service_dashboard_layout    Json?     @default("{\"widgets\": []}")  // Renamed from main_dashboard_layout
  public_dashboard_layout     Json?     @default("{\"widgets\": []}")
  
  // Existing fields...
  config_schema               Json?     @default("{}")
  default_config              Json?     @default("{}")
  features                    Json?     @default("[]")
  required_permissions        Json?     @default("[]")
  base_price                  Decimal?  @default(0) @db.Decimal(10, 2)
  price_per_device            Decimal?  @default(0) @db.Decimal(10, 2)
  is_active                   Boolean?  @default(true)
  created_at                  DateTime? @default(now()) @db.Timestamptz(6)
  updated_at                  DateTime? @default(now()) @db.Timestamptz(6)
  created_by                  String?   @db.Uuid
  
  // Relations
  sps_department_services     sps_department_services[]
  sps_service_device_models   sps_service_device_models[]
  sps_service_subscriptions   sps_service_subscriptions[]
}
```

### 2. Enhanced Device Models Schema

```prisma
model sps_device_models {
  id                        String    @id @db.VarChar(50)
  name                      String    @db.VarChar(100)
  description               String?
  
  // NEW: Model Icon
  icon                      String?   @db.VarChar(50)
  
  // Device Parameters (existing but needs structure documentation)
  parameters                Json?     @default("[]")
  // Format: [{ key: "water_level", name: "Water Level", dataType: "number", 
  //            unit: "%", icon: "droplet", min: 0, max: 100 }]
  
  created_by                String?   @db.VarChar(50)
  created_at                DateTime? @default(now()) @db.Timestamptz(6)
  updated_at                DateTime? @default(now()) @db.Timestamptz(6)
  
  sps_service_device_models sps_service_device_models[]
}
```

### 3. Service-Device Models Junction (Enhanced)

```prisma
model sps_service_device_models {
  id                    String                @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  service_template_id   String                @db.Uuid
  device_model_id       String                @db.VarChar(50)
  
  // NEW: Role in service
  role                  String?               @default("primary") @db.VarChar(50)
  
  // NEW: Quantity constraints
  min_devices           Int?                  @default(1)
  max_devices           Int?
  
  is_required           Boolean?              @default(false)
  created_at            DateTime?             @default(now()) @db.Timestamptz(6)
  
  sps_device_models     sps_device_models     @relation(...)
  sps_service_templates sps_service_templates @relation(...)
  
  @@unique([service_template_id, device_model_id])
}
```

---

## Widget System Design

### Widget Categories & Types

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WIDGET LIBRARY                               │
├─────────────────┬───────────────────────────────────────────────────┤
│ LAYOUT          │ Container, Section, Row, Column                    │
├─────────────────┼───────────────────────────────────────────────────┤
│ DATA DISPLAY    │ Parameter Card, Big Number, Status Badge,         │
│                 │ Transparent Parameter, Device Status              │
├─────────────────┼───────────────────────────────────────────────────┤
│ VISUALIZATION   │ Tank/Level Gauge, Circular Gauge, Line Chart,     │
│                 │ Table View, Chart/Table Toggle                    │
├─────────────────┼───────────────────────────────────────────────────┤
│ CONTROLS        │ Threshold Editor, Start/Stop Recording,           │
│                 │ Device Configuration                              │
├─────────────────┼───────────────────────────────────────────────────┤
│ MONITORING      │ Alert Widget, Audit Log, Available Devices        │
├─────────────────┼───────────────────────────────────────────────────┤
│ DECORATIVE      │ Text Widget, Logo Widget, Icon Widget,            │
│                 │ Background Image                                  │
└─────────────────┴───────────────────────────────────────────────────┘
```

### Widget TypeScript Definitions

```typescript
// frontend/src/types/dashboard.ts

export type WidgetType =
  // Layout
  | 'container' | 'section' | 'row' | 'column'
  // Data Display
  | 'parameter_card' | 'counter' | 'status_indicator' | 'transparent_parameter' | 'device_status'
  // Visualization
  | 'tank_gauge' | 'gauge' | 'line_chart' | 'table_view' | 'chart_table_toggle'
  // Controls
  | 'threshold_editor' | 'recording_control' | 'device_config'
  // Monitoring
  | 'alert_widget' | 'audit_log' | 'available_devices'
  // Decorative
  | 'text_widget' | 'logo_widget' | 'icon_widget' | 'background_image';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  parameter_key?: string;
  children?: WidgetConfig[];
  settings: WidgetSettings;
  position: WidgetPosition;
  visibility?: {
    dashboardTypes: ('device' | 'service' | 'public')[];
    roles?: string[]; // Optional role-based visibility
  };
}

export interface WidgetSettings {
  // Common
  showTitle?: boolean;
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  
  // Container
  columns?: number;
  rows?: number;
  gap?: number;
  
  // Tank Gauge
  tankType?: 'water' | 'wastewater' | 'diesel' | 'fuel' | 'chemical';
  minValue?: number;
  maxValue?: number;
  showBubbles?: boolean;
  thresholds?: { low: number; high: number };
  
  // Circular Gauge
  gaugeType?: 'circular' | 'semi-circular' | 'arc';
  colorRanges?: { min: number; max: number; color: string }[];
  
  // Text Widget
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  fontColor?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  
  // Chart
  chartType?: 'line' | 'area' | 'bar';
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  showLegend?: boolean;
  parameters?: string[]; // Multi-param support
  
  // Threshold Editor
  thresholdParams?: string[];
  allowUserEdit?: boolean;
  
  // Device Config
  configFields?: string[];
  sendIntervalEditable?: boolean;
  
  // Background Image
  imageUrl?: string;
  opacity?: number;
  blur?: number;
}
```

---

## Service Creation Wizard Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVICE CREATION WIZARD                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌────────────────────┐
│   STEP 1      │     │     STEP 2      │     │      STEP 3        │
│  Service      │────▶│    Service      │────▶│   Device Model     │
│  Profile      │     │   Parameters    │     │    Selection       │
└───────────────┘     └─────────────────┘     └────────────────────┘
        │                       │                       │
        │ • Name               │ • Add aggregation     │ • Select models
        │ • Description        │   parameters          │ • Set roles
        │ • Service Type       │ • Icon, name, unit    │ • Min/max counts
        │ • Has Public Dash    │ • Data type           │
        │ • Service Image      │ • Aggregation logic   │
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │       STEP 4        │
                    │   Dashboard Builder │
                    │  (3 Dashboard Tabs) │
                    └─────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌────────────────────┐
│  Device       │     │    Service      │     │     Public         │
│  Dashboard    │     │   Dashboard     │     │    Dashboard       │
│               │     │                 │     │                    │
│ Single device │     │ All devices in  │     │ Shareable public   │
│ monitoring    │     │ service instance│     │ view (if enabled)  │
│               │     │                 │     │                    │
│ Parameters:   │     │ Parameters:     │     │ Parameters:        │
│ From Device   │     │ Service-level   │     │ Public-safe        │
│ Models        │     │ Aggregations    │     │ subset             │
└───────────────┘     └─────────────────┘     └────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │       STEP 5        │
                    │   Review & Save     │
                    └─────────────────────┘
```

---

## Backend Implementation

### 1. Service Controller Enhancements

```typescript
// services/core-service/src/controllers/service.controller.ts

/**
 * POST /api/v1/services
 * Create service with full configuration including dashboards
 */
export const create = async (req: Request, res: Response, next: NextFunction) => {
  // Validate Super Admin only
  if (!req.user?.is_super_admin) {
    throw new ForbiddenError('Only Super Admins can create services');
  }
  
  const {
    name,
    description,
    service_type,           // GLOBAL | INTERNAL
    has_public_dashboard,
    image_url,
    service_parameters,     // Aggregation definitions
    device_models,          // [{ device_model_id, role, min_devices, max_devices }]
    device_dashboard_layout,
    service_dashboard_layout,
    public_dashboard_layout,
  } = req.body;
  
  // Validation...
  // Create service with transaction...
};

/**
 * PUT /api/v1/services/:id/dashboards
 * Update dashboard layouts (separate endpoint for efficiency)
 */
export const updateDashboards = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dashboard_type, layout } = req.body;
  
  // Permission check:
  // - Super Admin: Can edit all dashboard types
  // - Service Supervisor: Can only edit public_dashboard_layout
  
  if (dashboard_type === 'public' && !req.user?.is_super_admin) {
    // Check if user is Service Supervisor for this service
    const hasPermission = await checkServiceSupervisorAccess(req.user.id, id);
    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }
  } else if (!req.user?.is_super_admin) {
    throw new ForbiddenError('Only Super Admins can modify this dashboard');
  }
  
  // Update dashboard...
};
```

### 2. Service Repository Updates

```typescript
// services/core-service/src/repositories/service.repository.ts

export class ServiceRepository {
  async createTemplate(data: CreateServiceTemplateDTO): Promise<ServiceTemplate> {
    return prisma.$transaction(async (tx) => {
      // 1. Create service template
      const template = await tx.sps_service_templates.create({
        data: {
          name: data.name,
          code: this.generateCode(data.name),
          description: data.description,
          service_type: data.service_type,
          has_public_dashboard: data.has_public_dashboard,
          image_url: data.image_url,
          service_parameters: data.service_parameters || [],
          device_dashboard_layout: data.device_dashboard_layout || { widgets: [] },
          service_dashboard_layout: data.service_dashboard_layout || { widgets: [] },
          public_dashboard_layout: data.public_dashboard_layout || { widgets: [] },
          created_by: data.created_by,
        },
      });
      
      // 2. Link device models
      if (data.device_models?.length) {
        await tx.sps_service_device_models.createMany({
          data: data.device_models.map(dm => ({
            service_template_id: template.id,
            device_model_id: dm.device_model_id,
            role: dm.role || 'primary',
            min_devices: dm.min_devices || 1,
            max_devices: dm.max_devices,
            is_required: dm.is_required || false,
          })),
        });
      }
      
      return template;
    });
  }
  
  async updateDashboard(
    id: string, 
    dashboardType: 'device' | 'service' | 'public', 
    layout: any
  ): Promise<ServiceTemplate> {
    const fieldMap = {
      device: 'device_dashboard_layout',
      service: 'service_dashboard_layout',
      public: 'public_dashboard_layout',
    };
    
    return prisma.sps_service_templates.update({
      where: { id },
      data: {
        [fieldMap[dashboardType]]: layout,
        updated_at: new Date(),
      },
    });
  }
}
```

### 3. New API Routes

```typescript
// services/core-service/src/routes/service.routes.ts

router.post('/', requireSuperAdmin, serviceController.create);
router.get('/', authenticate, serviceController.getAll);
router.get('/:id', authenticate, serviceController.getById);
router.put('/:id', requireSuperAdmin, serviceController.update);
router.delete('/:id', requireSuperAdmin, serviceController.remove);

// Dashboard specific routes
router.put('/:id/dashboards/:type', authenticate, serviceController.updateDashboard);
router.get('/:id/dashboards/:type', authenticate, serviceController.getDashboard);

// Service parameters
router.get('/:id/parameters', authenticate, serviceController.getParameters);
router.put('/:id/parameters', requireSuperAdmin, serviceController.updateParameters);
```

---

## Frontend Implementation

### 1. Enhanced Service Creation Wizard

```
frontend/src/app/admin/services/new/page.tsx

├── Step 1: ServiceProfileStep
│   ├── Name, Description
│   ├── Service Type (GLOBAL/INTERNAL)
│   ├── Public Dashboard Toggle
│   └── Image Upload
│
├── Step 2: ServiceParametersStep
│   ├── Parameter List (Add/Edit/Remove)
│   ├── For each parameter:
│   │   ├── Icon Picker
│   │   ├── Parameter Key
│   │   ├── Display Name
│   │   ├── Data Type (number/string/boolean)
│   │   ├── Unit
│   │   └── Aggregation Type (SUM/AVG/MIN/MAX/COUNT/LATEST)
│   └── Source Parameter Selection (from device models)
│
├── Step 3: DeviceModelSelection
│   ├── Available Device Models List
│   ├── Selected Models with:
│   │   ├── Role in Service
│   │   ├── Min Device Count
│   │   └── Max Device Count
│   └── Parameter Preview from selected models
│
├── Step 4: DashboardBuilder (Tabbed)
│   ├── Tab: Device Dashboard
│   │   └── Parameters from selected device models
│   ├── Tab: Service Dashboard  
│   │   └── Parameters from service_parameters
│   └── Tab: Public Dashboard (if enabled)
│       └── Public-safe parameter subset
│
└── Step 5: ReviewAndSave
    ├── Summary of all configurations
    ├── Dashboard Previews
    └── Save / Submit
```

### 2. New Widget Components

```
frontend/src/components/dashboard/widgets/

├── layout/
│   ├── ContainerWidget.tsx
│   ├── SectionWidget.tsx
│   └── ColumnWidget.tsx
│
├── data/
│   ├── ParameterCard.tsx (exists, enhance)
│   ├── BigNumber.tsx
│   ├── StatusBadge.tsx
│   ├── TransparentParameter.tsx
│   └── DeviceStatusWidget.tsx (exists, enhance)
│
├── visualization/
│   ├── TankGauge.tsx (exists, enhance with types)
│   ├── CircularGauge.tsx
│   ├── LineChart.tsx
│   ├── TableView.tsx
│   └── ChartTableToggle.tsx
│
├── controls/
│   ├── ThresholdEditor.tsx (NEW)
│   ├── RecordingControl.tsx (NEW)
│   └── DeviceConfigWidget.tsx (NEW)
│
├── monitoring/
│   ├── AlertWidget.tsx (NEW)
│   ├── AuditLogWidget.tsx (NEW)
│   └── AvailableDevicesWidget.tsx (NEW)
│
└── decorative/
    ├── TextWidget.tsx (NEW)
    ├── LogoWidget.tsx (NEW)
    ├── IconWidget.tsx (NEW)
    └── BackgroundImage.tsx (NEW)
```

### 3. Enhanced Dashboard Builder

```typescript
// frontend/src/components/dashboard/DashboardBuilder.tsx

interface DashboardBuilderProps {
  dashboardType: 'device' | 'service' | 'public';
  availableParameters: Parameter[];
  serviceParameters?: ServiceParameter[]; // For service dashboard
  initialLayout?: DashboardTemplate;
  onSave: (layout: DashboardTemplate) => void;
  onCancel?: () => void;
  readOnly?: boolean; // For Service Supervisor viewing device/service dashboards
}

// Key features:
// 1. Drag & drop from widget toolbox
// 2. Resize handles on widgets
// 3. Properties panel for selected widget
// 4. Live preview mode
// 5. Responsive grid system (12 columns)
// 6. Widget validation before save
// 7. Undo/Redo support
// 8. Copy/Paste widgets
```

---

## Permission Matrix

| Action | Super Admin | Org Admin | Service Supervisor |
|--------|-------------|-----------|-------------------|
| Create Service Template | ✅ | ❌ | ❌ |
| Edit Service Template | ✅ | ❌ | ❌ |
| Delete Service Template | ✅ | ❌ | ❌ |
| Edit Device Dashboard | ✅ | ❌ | ❌ |
| Edit Service Dashboard | ✅ | ❌ | ❌ |
| Edit Public Dashboard | ✅ | ❌ | ✅ (assigned only) |
| View Service Catalog | ✅ | ✅ | ✅ |
| Assign Service to Dept | ✅ | ✅ | ❌ |

---

## Implementation Phases

### Phase 1: Database & Backend Foundation (3-4 days)
- [ ] Prisma schema migration
- [ ] Enhanced service repository
- [ ] Dashboard CRUD endpoints
- [ ] Permission middleware updates
- [ ] API validation

### Phase 2: Widget System (4-5 days)
- [ ] Widget type definitions
- [ ] 10 new widget components
- [ ] Widget settings panels
- [ ] Widget renderer enhancements

### Phase 3: Service Creation Wizard (4-5 days)
- [ ] Multi-step wizard framework
- [ ] Service profile step
- [ ] Service parameters step
- [ ] Device model selection step
- [ ] Review step

### Phase 4: Dashboard Builder Enhancements (3-4 days)
- [ ] Tabbed dashboard interface
- [ ] Parameter context per tab
- [ ] Widget validation
- [ ] Preview mode improvements

### Phase 5: Integration & Testing (2-3 days)
- [ ] End-to-end testing
- [ ] Permission testing
- [ ] Dashboard rendering tests
- [ ] Performance optimization

### Phase 6: Polish & Documentation (1-2 days)
- [ ] UI refinements
- [ ] User documentation
- [ ] API documentation
- [ ] Seed data updates

**Total Estimated Time: 17-23 days**

---

## Database Migration

```sql
-- Migration: Add service creation fields

ALTER TABLE sps_service_templates 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) DEFAULT 'GLOBAL',
ADD COLUMN IF NOT EXISTS has_public_dashboard BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS service_parameters JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS device_dashboard_layout JSONB DEFAULT '{"widgets": []}'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES sps_users(id);

-- Rename for clarity
ALTER TABLE sps_service_templates 
RENAME COLUMN main_dashboard_layout TO service_dashboard_layout;

-- Enhance device model linking
ALTER TABLE sps_service_device_models
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'primary',
ADD COLUMN IF NOT EXISTS min_devices INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_devices INTEGER;

-- Add icon to device models
ALTER TABLE sps_device_models
ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
```

---

## Verification Plan

### Automated Tests
1. **Unit Tests**: Service creation, dashboard CRUD, permission checks
2. **Integration Tests**: Full wizard flow, API endpoints
3. **E2E Tests**: Browser-based wizard completion

### Manual Verification
1. Create service as Super Admin
2. Configure all 3 dashboard types
3. Verify Service Supervisor can only edit public dashboard
4. Assign service to department
5. Verify dashboard rendering with real device data

---

## Files to Modify/Create

### Backend
- [MODIFY] [schema.prisma](file:///d:/sustainpro/packages/shared-database/prisma/schema.prisma)
- [MODIFY] [service.repository.ts](file:///d:/sustainpro/services/core-service/src/repositories/service.repository.ts)
- [MODIFY] [service.service.ts](file:///d:/sustainpro/services/core-service/src/services/service.service.ts)
- [MODIFY] [service.controller.ts](file:///d:/sustainpro/services/core-service/src/controllers/service.controller.ts)
- [MODIFY] [service.routes.ts](file:///d:/sustainpro/services/core-service/src/routes/service.routes.ts)
- [MODIFY] [seed.ts](file:///d:/sustainpro/packages/shared-database/prisma/seed.ts)

### Frontend
- [MODIFY] [dashboard.ts](file:///d:/sustainpro/frontend/src/types/dashboard.ts)
- [MODIFY] [api.ts](file:///d:/sustainpro/frontend/src/lib/api.ts)
- [MODIFY] [page.tsx (new service)](file:///d:/sustainpro/frontend/src/app/admin/services/new/page.tsx)
- [MODIFY] [dashboard page.tsx](file:///d:/sustainpro/frontend/src/app/admin/services/%5Bid%5D/dashboard/page.tsx)
- [MODIFY] [DashboardBuilderDragDrop.tsx](file:///d:/sustainpro/frontend/src/components/dashboard/DashboardBuilderDragDrop.tsx)
- [MODIFY] [WidgetRenderer.tsx](file:///d:/sustainpro/frontend/src/components/dashboard/WidgetRenderer.tsx)
- [NEW] `frontend/src/components/dashboard/widgets/` (15+ new widget files)
- [NEW] `frontend/src/components/service-wizard/` (wizard step components)

---

> [!IMPORTANT]
> This implementation plan covers a significant feature. I recommend reviewing this document and providing feedback on:
> 1. Priority of widget types to implement first
> 2. Confirmation of service_type values (GLOBAL vs INTERNAL naming)
> 3. Any additional widget requirements not listed
> 4. Timeline adjustments based on team capacity
