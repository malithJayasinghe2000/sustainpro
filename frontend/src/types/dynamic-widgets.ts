// =============================================
// DYNAMIC WIDGET SYSTEM TYPES
// =============================================
// Fully configurable widget definitions for dashboard building

// =============================================
// RENDER TYPES - Base visualization engines
// =============================================
export type WidgetRenderType =
    | 'value_display'      // Simple value with icon, label, unit
    | 'gauge_circular'     // Circular/radial gauge
    | 'gauge_linear'       // Linear/horizontal gauge
    | 'gauge_semi'         // Semi-circular gauge
    | 'tank_visual'        // Tank/container fill visualization
    | 'progress_bar'       // Progress/completion bar
    | 'chart_line'         // Time series line chart
    | 'chart_bar'          // Bar chart
    | 'chart_area'         // Area chart
    | 'status_badge'       // Status indicator badge
    | 'icon_value'         // Large icon with value display
    | 'table_data'         // Tabular data display
    | 'container'          // Layout container for nesting
    | 'text_block'         // Text/markdown display
    | 'image_display'      // Image/logo display
    | 'switch_control'     // Toggle/switch control
    | 'slider_control'     // Slider input
    | 'button_action'      // Action button
    | 'custom_svg';        // Custom SVG-based visualization

// =============================================
// PARAMETER SLOT - Data binding configuration
// =============================================
export interface ParameterSlot {
    key: string;                           // Unique key for this slot
    label: string;                         // Display label
    description?: string;                  // Help text
    required: boolean;                     // Whether binding is mandatory
    data_types: ('number' | 'string' | 'boolean')[]; // Acceptable data types
    default_value?: any;                   // Default if no mapping
    
    // Aggregation options for service-level dashboards
    aggregation_options?: ('SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'LATEST')[];
    default_aggregation?: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'LATEST';
}

// =============================================
// CONDITIONAL STYLING - Dynamic appearance
// =============================================
export type ConditionOperator = 
    | 'eq'       // Equal
    | 'neq'      // Not equal
    | 'gt'       // Greater than
    | 'gte'      // Greater than or equal
    | 'lt'       // Less than
    | 'lte'      // Less than or equal
    | 'between'  // Between two values (value is [min, max])
    | 'in'       // In array of values
    | 'contains' // String contains
    | 'regex';   // Regex match

export interface StyleCondition {
    slot: string;                          // Which parameter slot to check
    operator: ConditionOperator;
    value: any;                            // Comparison value
    styles: Partial<ConditionalStyles>;    // Styles to apply
    priority?: number;                     // Higher = checked first
}

export interface ConditionalStyles {
    color: string;
    backgroundColor: string;
    borderColor: string;
    iconColor: string;
    textColor: string;
    opacity: number;
    animation?: 'pulse' | 'blink' | 'shake' | 'glow' | 'none';
}

// =============================================
// SETTINGS SCHEMA - Configuration options
// =============================================
export type SettingType = 
    | 'string'
    | 'number'
    | 'boolean'
    | 'color'
    | 'icon'
    | 'select'
    | 'multi-select'
    | 'range'
    | 'json';

export interface SettingDefinition {
    key: string;
    label: string;
    type: SettingType;
    default_value: any;
    description?: string;
    
    // For select/multi-select
    options?: { value: string | number; label: string }[];
    
    // For range/number
    min?: number;
    max?: number;
    step?: number;
    
    // Visibility conditions
    show_if?: {
        setting: string;
        operator: 'eq' | 'neq' | 'in';
        value: any;
    };
    
    // Grouping
    group?: string;
}

export interface SettingsSchema {
    groups?: { key: string; label: string; collapsed?: boolean }[];
    settings: SettingDefinition[];
}

// =============================================
// WIDGET DEFINITION - Core structure
// =============================================
export interface WidgetDefinition {
    id: string;
    code: string;                          // Unique reference code
    
    // Basic info
    name: string;
    description?: string;
    version: string;
    
    // Categorization
    category_id: string;
    category?: WidgetCategory;             // Joined data
    
    // Rendering
    render_type: WidgetRenderType;
    
    // Size
    default_width: number;
    default_height: number;
    min_width: number;
    max_width: number;
    min_height: number;
    max_height: number;
    
    // Appearance
    icon?: string;
    icon_color?: string;
    background_color?: string;
    border_radius?: number;
    has_shadow: boolean;
    
    // Configuration
    parameter_slots: ParameterSlot[];
    settings_schema: SettingsSchema;
    default_settings: Record<string, any>;
    style_conditions: StyleCondition[];
    
    // Advanced
    custom_css?: string;
    preview_image?: string;
    
    // Scope & status
    organization_id?: string;
    is_active: boolean;
    is_system: boolean;
    is_deprecated: boolean;
    
    // Audit
    created_by?: string;
    created_at: string;
    updated_at: string;
}

// =============================================
// WIDGET CATEGORY
// =============================================
export interface WidgetCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    sort_order: number;
    organization_id?: string;
    is_active: boolean;
}

// =============================================
// WIDGET PRESET - Pre-configured instance
// =============================================
export interface WidgetPreset {
    id: string;
    widget_definition_id: string;
    widget_definition?: WidgetDefinition;  // Joined data
    
    name: string;
    description?: string;
    
    // Configuration
    settings: Record<string, any>;
    width?: number;
    height?: number;
    
    // Parameter mappings
    device_model_id?: string;
    parameter_mappings: Record<string, string>; // slot_key -> param_key
    
    // Metadata
    tags: string[];
    organization_id?: string;
    is_active: boolean;
    
    // Audit
    created_by?: string;
    created_at: string;
    updated_at: string;
}

// =============================================
// WIDGET INSTANCE - Used in dashboards
// =============================================
export interface DynamicWidgetInstance {
    id: string;                            // Unique instance ID
    definition_id: string;                 // Reference to widget definition
    preset_id?: string;                    // Optional preset used as base
    
    // Instance overrides
    title?: string;                        // Custom title
    settings: Record<string, any>;         // Instance-specific settings
    
    // Parameter mappings for this instance
    parameter_mappings: Record<string, string>; // slot_key -> device_param_key
    
    // Position in dashboard
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    
    // Container nesting
    parent_id?: string;                    // If inside a container
    children?: DynamicWidgetInstance[];    // If this is a container
}

// =============================================
// DASHBOARD TEMPLATE (Updated)
// =============================================
export interface DynamicDashboardTemplate {
    widgets: DynamicWidgetInstance[];
    theme?: 'light' | 'dark' | 'system';
    refresh_interval?: number;
    grid_columns?: number;
    row_height?: number;
}

// =============================================
// API TYPES
// =============================================
export interface CreateWidgetDefinitionInput {
    code: string;
    name: string;
    description?: string;
    category_id: string;
    render_type: WidgetRenderType;
    default_width?: number;
    default_height?: number;
    min_width?: number;
    max_width?: number;
    min_height?: number;
    max_height?: number;
    icon?: string;
    icon_color?: string;
    background_color?: string;
    border_radius?: number;
    has_shadow?: boolean;
    parameter_slots?: ParameterSlot[];
    settings_schema?: SettingsSchema;
    default_settings?: Record<string, any>;
    style_conditions?: StyleCondition[];
    custom_css?: string;
    preview_image?: string;
}

export interface UpdateWidgetDefinitionInput extends Partial<CreateWidgetDefinitionInput> {
    is_active?: boolean;
    is_deprecated?: boolean;
}

export interface CreateWidgetCategoryInput {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    sort_order?: number;
}

export interface CreateWidgetPresetInput {
    widget_definition_id: string;
    name: string;
    description?: string;
    settings?: Record<string, any>;
    width?: number;
    height?: number;
    device_model_id?: string;
    parameter_mappings?: Record<string, string>;
    tags?: string[];
}

// =============================================
// DEFAULT RENDER TYPE CONFIGURATIONS
// =============================================
export const RENDER_TYPE_DEFAULTS: Record<WidgetRenderType, {
    label: string;
    icon: string;
    description: string;
    default_size: { w: number; h: number };
    default_slots: ParameterSlot[];
    default_settings_schema: SettingsSchema;
}> = {
    value_display: {
        label: 'Value Display',
        icon: 'Hash',
        description: 'Display a single value with optional icon and unit',
        default_size: { w: 3, h: 2 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number', 'string'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'show_icon', label: 'Show Icon', type: 'boolean', default_value: true },
                { key: 'show_unit', label: 'Show Unit', type: 'boolean', default_value: true },
                { key: 'value_size', label: 'Value Size', type: 'select', default_value: 'lg', options: [
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' },
                    { value: 'xl', label: 'Extra Large' }
                ]},
                { key: 'icon', label: 'Icon', type: 'icon', default_value: 'Activity' },
                { key: 'decimals', label: 'Decimal Places', type: 'number', default_value: 2, min: 0, max: 6 }
            ]
        }
    },
    gauge_circular: {
        label: 'Circular Gauge',
        icon: 'Gauge',
        description: 'Circular/radial gauge meter',
        default_size: { w: 4, h: 3 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number'] },
            { key: 'min', label: 'Min Value', required: false, data_types: ['number'], default_value: 0 },
            { key: 'max', label: 'Max Value', required: false, data_types: ['number'], default_value: 100 }
        ],
        default_settings_schema: {
            settings: [
                { key: 'min_value', label: 'Min Value', type: 'number', default_value: 0 },
                { key: 'max_value', label: 'Max Value', type: 'number', default_value: 100 },
                { key: 'show_value', label: 'Show Value', type: 'boolean', default_value: true },
                { key: 'show_needle', label: 'Show Needle', type: 'boolean', default_value: true },
                { key: 'color_low', label: 'Low Color', type: 'color', default_value: '#22C55E' },
                { key: 'color_mid', label: 'Mid Color', type: 'color', default_value: '#F59E0B' },
                { key: 'color_high', label: 'High Color', type: 'color', default_value: '#EF4444' },
                { key: 'low_threshold', label: 'Low Threshold', type: 'number', default_value: 33 },
                { key: 'high_threshold', label: 'High Threshold', type: 'number', default_value: 66 }
            ]
        }
    },
    gauge_linear: {
        label: 'Linear Gauge',
        icon: 'ArrowRight',
        description: 'Horizontal/vertical linear gauge',
        default_size: { w: 4, h: 2 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'min_value', label: 'Min Value', type: 'number', default_value: 0 },
                { key: 'max_value', label: 'Max Value', type: 'number', default_value: 100 },
                { key: 'orientation', label: 'Orientation', type: 'select', default_value: 'horizontal', options: [
                    { value: 'horizontal', label: 'Horizontal' },
                    { value: 'vertical', label: 'Vertical' }
                ]},
                { key: 'show_labels', label: 'Show Labels', type: 'boolean', default_value: true }
            ]
        }
    },
    gauge_semi: {
        label: 'Semi-Circular Gauge',
        icon: 'Gauge',
        description: 'Half-circle gauge meter',
        default_size: { w: 4, h: 3 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'min_value', label: 'Min Value', type: 'number', default_value: 0 },
                { key: 'max_value', label: 'Max Value', type: 'number', default_value: 100 },
                { key: 'show_value', label: 'Show Value', type: 'boolean', default_value: true }
            ]
        }
    },
    tank_visual: {
        label: 'Tank Gauge',
        icon: 'Container',
        description: 'Tank/container fill visualization',
        default_size: { w: 4, h: 4 },
        default_slots: [
            { key: 'level', label: 'Level (%)', required: true, data_types: ['number'] },
            { key: 'capacity', label: 'Capacity', required: false, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'tank_type', label: 'Tank Type', type: 'select', default_value: 'water', options: [
                    { value: 'water', label: 'Water (Blue)' },
                    { value: 'wastewater', label: 'Wastewater (Green)' },
                    { value: 'diesel', label: 'Diesel (Amber)' },
                    { value: 'fuel', label: 'Fuel (Red)' },
                    { value: 'chemical', label: 'Chemical (Purple)' },
                    { value: 'custom', label: 'Custom Color' }
                ]},
                { key: 'custom_color', label: 'Custom Color', type: 'color', default_value: '#3B82F6', show_if: { setting: 'tank_type', operator: 'eq', value: 'custom' } },
                { key: 'show_bubbles', label: 'Show Bubbles', type: 'boolean', default_value: true },
                { key: 'show_percentage', label: 'Show Percentage', type: 'boolean', default_value: true },
                { key: 'show_waves', label: 'Show Waves', type: 'boolean', default_value: true },
                { key: 'low_threshold', label: 'Low Level (%)', type: 'number', default_value: 20, min: 0, max: 100 },
                { key: 'high_threshold', label: 'High Level (%)', type: 'number', default_value: 80, min: 0, max: 100 }
            ]
        }
    },
    progress_bar: {
        label: 'Progress Bar',
        icon: 'BarChart3',
        description: 'Progress/completion indicator',
        default_size: { w: 4, h: 1 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number'] },
            { key: 'max', label: 'Max Value', required: false, data_types: ['number'], default_value: 100 }
        ],
        default_settings_schema: {
            settings: [
                { key: 'color', label: 'Bar Color', type: 'color', default_value: '#3B82F6' },
                { key: 'show_label', label: 'Show Label', type: 'boolean', default_value: true },
                { key: 'show_percentage', label: 'Show Percentage', type: 'boolean', default_value: true },
                { key: 'height', label: 'Bar Height', type: 'select', default_value: 'md', options: [
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' }
                ]}
            ]
        }
    },
    chart_line: {
        label: 'Line Chart',
        icon: 'LineChart',
        description: 'Time series line chart',
        default_size: { w: 6, h: 3 },
        default_slots: [
            { key: 'primary', label: 'Primary Series', required: true, data_types: ['number'] },
            { key: 'secondary', label: 'Secondary Series', required: false, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'time_range', label: 'Time Range', type: 'select', default_value: '24h', options: [
                    { value: '1h', label: '1 Hour' },
                    { value: '6h', label: '6 Hours' },
                    { value: '24h', label: '24 Hours' },
                    { value: '7d', label: '7 Days' },
                    { value: '30d', label: '30 Days' }
                ]},
                { key: 'show_legend', label: 'Show Legend', type: 'boolean', default_value: true },
                { key: 'show_grid', label: 'Show Grid', type: 'boolean', default_value: true },
                { key: 'line_style', label: 'Line Style', type: 'select', default_value: 'smooth', options: [
                    { value: 'smooth', label: 'Smooth' },
                    { value: 'linear', label: 'Linear' },
                    { value: 'step', label: 'Step' }
                ]},
                { key: 'primary_color', label: 'Primary Color', type: 'color', default_value: '#3B82F6' },
                { key: 'secondary_color', label: 'Secondary Color', type: 'color', default_value: '#10B981' }
            ]
        }
    },
    chart_bar: {
        label: 'Bar Chart',
        icon: 'BarChart',
        description: 'Bar/column chart',
        default_size: { w: 6, h: 3 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'orientation', label: 'Orientation', type: 'select', default_value: 'vertical', options: [
                    { value: 'vertical', label: 'Vertical' },
                    { value: 'horizontal', label: 'Horizontal' }
                ]},
                { key: 'color', label: 'Bar Color', type: 'color', default_value: '#3B82F6' },
                { key: 'show_labels', label: 'Show Labels', type: 'boolean', default_value: true }
            ]
        }
    },
    chart_area: {
        label: 'Area Chart',
        icon: 'AreaChart',
        description: 'Area/filled line chart',
        default_size: { w: 6, h: 3 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'fill_opacity', label: 'Fill Opacity', type: 'range', default_value: 0.3, min: 0, max: 1, step: 0.1 },
                { key: 'color', label: 'Color', type: 'color', default_value: '#3B82F6' },
                { key: 'show_grid', label: 'Show Grid', type: 'boolean', default_value: true }
            ]
        }
    },
    status_badge: {
        label: 'Status Badge',
        icon: 'Activity',
        description: 'Status indicator with icon',
        default_size: { w: 2, h: 1 },
        default_slots: [
            { key: 'status', label: 'Status', required: true, data_types: ['boolean', 'string'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'online_text', label: 'Online Text', type: 'string', default_value: 'Online' },
                { key: 'offline_text', label: 'Offline Text', type: 'string', default_value: 'Offline' },
                { key: 'online_color', label: 'Online Color', type: 'color', default_value: '#22C55E' },
                { key: 'offline_color', label: 'Offline Color', type: 'color', default_value: '#EF4444' },
                { key: 'show_dot', label: 'Show Status Dot', type: 'boolean', default_value: true }
            ]
        }
    },
    icon_value: {
        label: 'Icon Value',
        icon: 'Zap',
        description: 'Large icon with value display',
        default_size: { w: 2, h: 2 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number', 'string'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'icon', label: 'Icon', type: 'icon', default_value: 'Zap' },
                { key: 'icon_size', label: 'Icon Size', type: 'select', default_value: 'lg', options: [
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' },
                    { value: 'xl', label: 'Extra Large' }
                ]},
                { key: 'icon_color', label: 'Icon Color', type: 'color', default_value: '#3B82F6' },
                { key: 'show_label', label: 'Show Label', type: 'boolean', default_value: true }
            ]
        }
    },
    table_data: {
        label: 'Data Table',
        icon: 'Table',
        description: 'Tabular data display',
        default_size: { w: 6, h: 4 },
        default_slots: [],
        default_settings_schema: {
            settings: [
                { key: 'columns', label: 'Columns', type: 'multi-select', default_value: [], options: [] },
                { key: 'sortable', label: 'Sortable', type: 'boolean', default_value: true },
                { key: 'paginated', label: 'Paginated', type: 'boolean', default_value: true },
                { key: 'page_size', label: 'Page Size', type: 'number', default_value: 10, min: 5, max: 100 }
            ]
        }
    },
    container: {
        label: 'Container',
        icon: 'LayoutGrid',
        description: 'Layout container for grouping widgets',
        default_size: { w: 12, h: 4 },
        default_slots: [],
        default_settings_schema: {
            settings: [
                { key: 'columns', label: 'Columns', type: 'number', default_value: 2, min: 1, max: 6 },
                { key: 'gap', label: 'Gap', type: 'number', default_value: 16, min: 0, max: 48 },
                { key: 'padding', label: 'Padding', type: 'number', default_value: 16, min: 0, max: 48 },
                { key: 'background_color', label: 'Background', type: 'color', default_value: 'transparent' },
                { key: 'border_width', label: 'Border Width', type: 'number', default_value: 1, min: 0, max: 8 },
                { key: 'border_color', label: 'Border Color', type: 'color', default_value: '#E5E7EB' }
            ]
        }
    },
    text_block: {
        label: 'Text Block',
        icon: 'Type',
        description: 'Custom text display',
        default_size: { w: 4, h: 1 },
        default_slots: [],
        default_settings_schema: {
            settings: [
                { key: 'text', label: 'Text', type: 'string', default_value: 'Enter text here...' },
                { key: 'font_size', label: 'Font Size', type: 'number', default_value: 16, min: 10, max: 72 },
                { key: 'font_weight', label: 'Font Weight', type: 'select', default_value: 'normal', options: [
                    { value: 'normal', label: 'Normal' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'semibold', label: 'Semi Bold' },
                    { value: 'bold', label: 'Bold' }
                ]},
                { key: 'text_color', label: 'Text Color', type: 'color', default_value: '#111827' },
                { key: 'text_align', label: 'Alignment', type: 'select', default_value: 'left', options: [
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Center' },
                    { value: 'right', label: 'Right' }
                ]}
            ]
        }
    },
    image_display: {
        label: 'Image',
        icon: 'Image',
        description: 'Image/logo display',
        default_size: { w: 3, h: 3 },
        default_slots: [],
        default_settings_schema: {
            settings: [
                { key: 'image_url', label: 'Image URL', type: 'string', default_value: '' },
                { key: 'object_fit', label: 'Fit', type: 'select', default_value: 'contain', options: [
                    { value: 'contain', label: 'Contain' },
                    { value: 'cover', label: 'Cover' },
                    { value: 'fill', label: 'Fill' }
                ]},
                { key: 'border_radius', label: 'Border Radius', type: 'number', default_value: 8, min: 0, max: 100 }
            ]
        }
    },
    switch_control: {
        label: 'Switch Control',
        icon: 'ToggleRight',
        description: 'Toggle switch for device control',
        default_size: { w: 2, h: 1 },
        default_slots: [
            { key: 'state', label: 'State', required: true, data_types: ['boolean'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'on_label', label: 'On Label', type: 'string', default_value: 'On' },
                { key: 'off_label', label: 'Off Label', type: 'string', default_value: 'Off' },
                { key: 'disabled', label: 'Disabled', type: 'boolean', default_value: false }
            ]
        }
    },
    slider_control: {
        label: 'Slider Control',
        icon: 'Sliders',
        description: 'Slider input for device settings',
        default_size: { w: 4, h: 2 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'min', label: 'Min', type: 'number', default_value: 0 },
                { key: 'max', label: 'Max', type: 'number', default_value: 100 },
                { key: 'step', label: 'Step', type: 'number', default_value: 1 },
                { key: 'show_value', label: 'Show Value', type: 'boolean', default_value: true }
            ]
        }
    },
    button_action: {
        label: 'Action Button',
        icon: 'MousePointer',
        description: 'Button for triggering actions',
        default_size: { w: 2, h: 1 },
        default_slots: [],
        default_settings_schema: {
            settings: [
                { key: 'label', label: 'Button Label', type: 'string', default_value: 'Click' },
                { key: 'icon', label: 'Icon', type: 'icon', default_value: '' },
                { key: 'variant', label: 'Style', type: 'select', default_value: 'primary', options: [
                    { value: 'primary', label: 'Primary' },
                    { value: 'secondary', label: 'Secondary' },
                    { value: 'danger', label: 'Danger' },
                    { value: 'outline', label: 'Outline' }
                ]},
                { key: 'action', label: 'Action Type', type: 'select', default_value: 'command', options: [
                    { value: 'command', label: 'Send Command' },
                    { value: 'navigate', label: 'Navigate' },
                    { value: 'refresh', label: 'Refresh Data' }
                ]}
            ]
        }
    },
    custom_svg: {
        label: 'Custom SVG',
        icon: 'Shapes',
        description: 'Custom SVG visualization',
        default_size: { w: 4, h: 4 },
        default_slots: [
            { key: 'value', label: 'Value', required: false, data_types: ['number', 'string'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'svg_content', label: 'SVG Content', type: 'string', default_value: '' },
                { key: 'preserve_aspect', label: 'Preserve Aspect Ratio', type: 'boolean', default_value: true }
            ]
        }
    }
};
