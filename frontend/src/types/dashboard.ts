// Widget type definitions for the Dashboard Builder
export type WidgetType = 'container' | 'device_status' | 'parameter_card' | 'tank_gauge' | 'line_chart' | 'gauge' | 'counter' | 'status_indicator';

export interface WidgetConfig {
    id: string;
    type: WidgetType;
    title: string;
    parameter_key?: string; // Link to device model parameter
    children?: WidgetConfig[]; // For container widgets
    settings: {
        // Container
        columns?: number; // 1-4 columns
        rows?: number; // Auto-calculated based on children
        colSpan?: number; // Span within parent container (1-4)

        // Device Status
        showLastSeen?: boolean;
        showSignalStrength?: boolean;
        showBattery?: boolean;
        batteryParameter?: string; // Parameter key for battery level
        signalParameter?: string; // Parameter key for signal strength
        firmwareParameter?: string; // Parameter key for firmware version

        // Parameter Card
        showIcon?: boolean;
        showUnit?: boolean;

        // Tank Gauge
        minValue?: number;
        maxValue?: number;
        tankType?: 'water' | 'waste' | 'diesel' | 'fuel' | 'chemical';
        tankMode?: 'filling' | 'draining';
        showBubbles?: boolean;
        thresholds?: { low?: number; high?: number };
        orientation?: 'vertical' | 'horizontal';

        // Chart
        chartType?: 'line' | 'area' | 'bar';
        timeRange?: '1h' | '24h' | '7d' | '30d';
        showLegend?: boolean;

        // Gauge
        gaugeType?: 'circular' | 'semi-circular' | 'arc';
        colors?: { low: string; mid: string; high: string };

        // Counter
        suffix?: string;
        prefix?: string;
        decimals?: number;
    };
    position: {
        x: number;
        y: number;
        w: number; // Grid width (1-12)
        h: number; // Grid height (1-6)
    };
}

export interface DashboardTemplate {
    widgets: WidgetConfig[];
    theme?: 'light' | 'dark';
    refreshInterval?: number; // seconds
}

// Widget type metadata for the toolbox
export const WIDGET_TYPES: {
    type: WidgetType;
    label: string;
    icon: string;
    description: string;
    defaultSize: { w: number; h: number };
    category: 'layout' | 'data' | 'visualization';
}[] = [
        {
            type: 'container',
            label: 'Card Container',
            icon: 'LayoutGrid',
            description: 'Grouped widgets in columns/rows',
            defaultSize: { w: 12, h: 4 },
            category: 'layout'
        },
        {
            type: 'device_status',
            label: 'Device Status',
            icon: 'Server',
            description: 'Online/offline, signal, battery',
            defaultSize: { w: 6, h: 2 },
            category: 'data'
        },
        {
            type: 'parameter_card',
            label: 'Parameter Card',
            icon: 'Square',
            description: 'Display a single parameter value with icon',
            defaultSize: { w: 3, h: 2 },
            category: 'data'
        },
        {
            type: 'tank_gauge',
            label: 'Tank Gauge',
            icon: 'Container',
            description: 'Visual liquid level indicator',
            defaultSize: { w: 4, h: 4 },
            category: 'visualization'
        },
        {
            type: 'line_chart',
            label: 'Time Series Chart',
            icon: 'LineChart',
            description: 'Historical data visualization',
            defaultSize: { w: 6, h: 3 },
            category: 'visualization'
        },
        {
            type: 'gauge',
            label: 'Circular Gauge',
            icon: 'Gauge',
            description: 'Analog-style meter',
            defaultSize: { w: 4, h: 3 },
            category: 'visualization'
        },
        {
            type: 'counter',
            label: 'Big Number',
            icon: 'Hash',
            description: 'Large numeric display',
            defaultSize: { w: 3, h: 2 },
            category: 'data'
        },
        {
            type: 'status_indicator',
            label: 'Status Badge',
            icon: 'Activity',
            description: 'Online/Offline/Alert status',
            defaultSize: { w: 3, h: 1 },
            category: 'data'
        }
    ];
