// =============================================
// WIDGET TYPE DEFINITIONS FOR DASHBOARD BUILDER
// =============================================

// All available widget types
export type WidgetType =
    // Layout widgets
    | 'container'
    | 'section'
    | 'row'
    | 'column'
    // Data display widgets
    | 'device_status'
    | 'parameter_card'
    | 'counter'
    | 'status_indicator'
    | 'transparent_parameter'
    // Visualization widgets
    | 'tank_gauge'
    | 'circular_gauge'
    | 'gauge'
    | 'line_chart'
    | 'table_view'
    | 'chart_table_toggle'
    // Control widgets
    | 'threshold_editor'
    | 'recording_control'
    | 'device_config'
    // Monitoring widgets
    | 'alert_widget'
    | 'audit_log'
    | 'available_devices'
    // Decorative widgets
    | 'text_widget'
    | 'logo_widget'
    | 'icon_widget'
    | 'background_image';

// Widget configuration interface
export interface WidgetConfig {
    id: string;
    type: WidgetType;
    title: string;
    parameter_key?: string; // Link to device model parameter
    children?: WidgetConfig[]; // For container widgets
    settings: WidgetSettings;
    position: WidgetPosition;
    visibility?: {
        dashboardTypes: ('device' | 'service' | 'public')[];
        roles?: string[];
    };
}

// Widget position on the grid
export interface WidgetPosition {
    x: number;
    y: number;
    w: number; // Grid width (1-12)
    h: number; // Grid height (1-10)
}

// Comprehensive widget settings
export interface WidgetSettings {
    // === Common Settings ===
    showTitle?: boolean;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;

    // === Container/Layout Settings ===
    columns?: number; // 1-6 columns
    rows?: number;
    gap?: number;
    colSpan?: number; // Span within parent container

    // === Device Status Settings ===
    showLastSeen?: boolean;
    showSignalStrength?: boolean;
    showBattery?: boolean;
    batteryParameter?: string;
    signalParameter?: string;
    firmwareParameter?: string;
    showOnlineIndicator?: boolean;

    // === Parameter Card Settings ===
    showIcon?: boolean;
    showUnit?: boolean;
    iconName?: string;
    iconColor?: string;
    valueSize?: 'sm' | 'md' | 'lg' | 'xl';
    
    // === Counter/Big Number Settings ===
    suffix?: string;
    prefix?: string;
    decimals?: number;
    animateValue?: boolean;

    // === Tank Gauge Settings ===
    minValue?: number;
    maxValue?: number;
    tankType?: 'water' | 'wastewater' | 'diesel' | 'fuel' | 'chemical';
    tankMode?: 'filling' | 'draining';
    showBubbles?: boolean;
    showPercentage?: boolean;
    thresholds?: { low?: number; high?: number };
    orientation?: 'vertical' | 'horizontal';

    // === Circular Gauge Settings ===
    gaugeType?: 'circular' | 'semi-circular' | 'arc';
    colors?: { low: string; mid: string; high: string };
    colorRanges?: { min: number; max: number; color: string }[];
    showNeedle?: boolean;
    showValue?: boolean;

    // === Chart Settings ===
    chartType?: 'line' | 'area' | 'bar';
    timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
    showLegend?: boolean;
    showGrid?: boolean;
    parameters?: string[]; // Multi-param support for charts
    refreshInterval?: number;

    // === Table View Settings ===
    tableColumns?: string[]; // Table columns (renamed to avoid conflict)
    sortable?: boolean;
    paginated?: boolean;
    pageSize?: number;

    // === Threshold Editor Settings ===
    thresholdParams?: string[];
    allowUserEdit?: boolean;
    
    // === Recording Control Settings ===
    recordingParam?: string;
    showDuration?: boolean;

    // === Device Config Settings ===
    configFields?: string[];
    sendIntervalEditable?: boolean;
    readOnly?: boolean;

    // === Alert Widget Settings ===
    maxAlerts?: number;
    severityFilter?: ('info' | 'warning' | 'critical')[];
    showAcknowledged?: boolean;

    // === Audit Log Settings ===
    maxEntries?: number;
    filterByDevice?: boolean;

    // === Available Devices Settings ===
    showAddButton?: boolean;
    groupByStatus?: boolean;
    maxDevices?: number;

    // === Text Widget Settings ===
    text?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    fontColor?: string;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';

    // === Logo Widget Settings ===
    logoUrl?: string;
    logoSize?: number;
    logoFit?: 'contain' | 'cover' | 'fill';

    // === Icon Widget Settings ===
    icon?: string;
    iconSize?: number;
    showLabel?: boolean;
    label?: string;
    labelPosition?: 'top' | 'bottom' | 'left' | 'right';
    labelColor?: string;
    isClickable?: boolean;
    hoverEffect?: boolean;

    // === Background Image Settings ===
    imageUrl?: string;
    opacity?: number;
    blur?: number;
    overlay?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none';
    objectPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
    overlayOpacity?: number;

    // === Line Chart / Visualization Settings ===
    lineColor?: string;
    fillColor?: string;
    showDots?: boolean;
    showTrend?: boolean;
    unit?: string;

    // === Audit Log Settings ===
    showTimestamp?: boolean;
    showUser?: boolean;
    filterActions?: string[];

    // === Device Config Settings ===
    collapsible?: boolean;

    // === Container/Layout Additional Settings ===
    borderColor?: string;
    borderWidth?: number;
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    titlePosition?: 'top' | 'bottom';
    titleColor?: string;

    // === Parameter Card Additional Settings ===
    valueColor?: string;
    showSparkline?: boolean;
    compactMode?: boolean;
}

// Dashboard template structure
export interface DashboardTemplate {
    widgets: WidgetConfig[];
    theme?: 'light' | 'dark';
    refreshInterval?: number; // seconds
    gridColumns?: number; // default 12
    rowHeight?: number; // default 60px
}

// Service parameter for aggregation
export interface ServiceParameter {
    key: string;
    name: string;
    icon?: string;
    dataType: 'number' | 'string' | 'boolean';
    unit?: string;
    aggregation?: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'LATEST';
    sourceParam?: string;
}

// Device model parameter
export interface DeviceParameter {
    key: string;
    name: string;
    dataType: 'number' | 'string' | 'boolean';
    unit?: string;
    icon?: string;
    min?: number;
    max?: number;
}

// Widget category type
export type WidgetCategory = 'layout' | 'data' | 'visualization' | 'control' | 'monitoring' | 'decorative';

// Widget type metadata for the toolbox
export interface WidgetTypeMeta {
    id: string;  // Unique identifier for React keys (combines type + source)
    type: WidgetType;
    label: string;
    icon: string;
    description: string;
    defaultSize: { w: number; h: number };
    category: WidgetCategory;
    requiresParameter?: boolean;
}

// =============================================
// WIDGET TYPES - NOW LOADED FROM DATABASE
// =============================================
// Widget definitions are fetched from the database via useDynamicWidgets hook.
// This empty array is kept for backward compatibility with any code that imports it.
// All widgets should be created and managed through the Widget Library Manager.
export const WIDGET_TYPES: WidgetTypeMeta[] = [];

// Helper to get widget metadata by type (deprecated - use useDynamicWidgets().getWidgetMeta instead)
export const getWidgetMeta = (type: WidgetType): WidgetTypeMeta | undefined => {
    return WIDGET_TYPES.find(w => w.type === type);
};

// Helper to get widgets by category (deprecated - use useDynamicWidgets().groupedByCategory instead)
export const getWidgetsByCategory = (category: WidgetCategory): WidgetTypeMeta[] => {
    return WIDGET_TYPES.filter(w => w.category === category);
};

// Default tank colors by type
export const TANK_COLORS: Record<string, { fill: string; border: string; wave: string }> = {
    water: { fill: '#3B82F6', border: '#2563EB', wave: '#60A5FA' },
    wastewater: { fill: '#22C55E', border: '#16A34A', wave: '#4ADE80' },
    diesel: { fill: '#F59E0B', border: '#D97706', wave: '#FBBF24' },
    fuel: { fill: '#EF4444', border: '#DC2626', wave: '#F87171' },
    chemical: { fill: '#A855F7', border: '#9333EA', wave: '#C084FC' },
};

// Default gauge color ranges
export const DEFAULT_GAUGE_COLORS = {
    low: '#22C55E',  // Green
    mid: '#F59E0B',  // Amber
    high: '#EF4444', // Red
};
