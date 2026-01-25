'use client';

import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { WidgetDefinition, DynamicWidgetInstance, StyleCondition } from '@/types/dynamic-widgets';

// =============================================
// DYNAMIC WIDGET RENDERER
// =============================================
// Renders any widget based on its definition and settings

interface DynamicWidgetRendererProps {
    definition: WidgetDefinition;
    instance: DynamicWidgetInstance;
    values?: Record<string, any>; // Current values for parameter slots
    isPreview?: boolean;
    isEditing?: boolean;
    onSettingsClick?: () => void;
    children?: React.ReactNode; // For container widgets
}

// Helper to get Lucide icon by name
const getIcon = (iconName?: string, className?: string) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className={className || 'w-5 h-5'} /> : null;
};

// Evaluate style conditions
const evaluateConditions = (
    conditions: StyleCondition[],
    values: Record<string, any>
): Partial<React.CSSProperties> => {
    let styles: Partial<React.CSSProperties> = {};

    // Sort by priority (higher first)
    const sorted = [...conditions].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const condition of sorted) {
        const value = values[condition.slot];
        if (value === undefined) continue;

        let matches = false;

        switch (condition.operator) {
            case 'eq':
                matches = value === condition.value;
                break;
            case 'neq':
                matches = value !== condition.value;
                break;
            case 'gt':
                matches = typeof value === 'number' && value > condition.value;
                break;
            case 'gte':
                matches = typeof value === 'number' && value >= condition.value;
                break;
            case 'lt':
                matches = typeof value === 'number' && value < condition.value;
                break;
            case 'lte':
                matches = typeof value === 'number' && value <= condition.value;
                break;
            case 'between':
                if (Array.isArray(condition.value) && condition.value.length === 2) {
                    matches = typeof value === 'number' && 
                              value >= condition.value[0] && 
                              value <= condition.value[1];
                }
                break;
            case 'in':
                matches = Array.isArray(condition.value) && condition.value.includes(value);
                break;
            case 'contains':
                matches = typeof value === 'string' && value.includes(condition.value);
                break;
            case 'regex':
                try {
                    matches = typeof value === 'string' && new RegExp(condition.value).test(value);
                } catch {
                    matches = false;
                }
                break;
        }

        if (matches) {
            styles = {
                ...styles,
                color: condition.styles.color || styles.color,
                backgroundColor: condition.styles.backgroundColor || styles.backgroundColor,
                borderColor: condition.styles.borderColor || styles.borderColor,
            };
        }
    }

    return styles;
};

// Format value based on type and decimals
const formatValue = (value: any, decimals?: number): string => {
    if (value === null || value === undefined) return '--';
    if (typeof value === 'number') {
        return decimals !== undefined ? value.toFixed(decimals) : value.toString();
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
};

export default function DynamicWidgetRenderer({
    definition,
    instance,
    values = {},
    isPreview = false,
    isEditing = false,
    onSettingsClick,
    children
}: DynamicWidgetRendererProps) {
    // Merge default settings with instance settings
    const settings = useMemo(() => ({
        ...definition.default_settings,
        ...instance.settings
    }), [definition.default_settings, instance.settings]);

    // Get mapped values
    const mappedValues = useMemo(() => {
        const result: Record<string, any> = {};
        for (const slot of definition.parameter_slots) {
            const mappedKey = instance.parameter_mappings[slot.key];
            if (mappedKey && values[mappedKey] !== undefined) {
                result[slot.key] = values[mappedKey];
            } else if (slot.default_value !== undefined) {
                result[slot.key] = slot.default_value;
            }
        }
        return result;
    }, [definition.parameter_slots, instance.parameter_mappings, values]);

    // Evaluate conditional styles
    const conditionalStyles = useMemo(() => 
        evaluateConditions(definition.style_conditions, mappedValues),
        [definition.style_conditions, mappedValues]
    );

    // Base container styles
    const containerStyles: React.CSSProperties = {
        backgroundColor: settings.background_color || definition.background_color || 'var(--card)',
        borderRadius: settings.border_radius ?? definition.border_radius ?? 8,
        boxShadow: definition.has_shadow ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        ...conditionalStyles
    };

    // Render based on render_type
    const renderContent = () => {
        switch (definition.render_type) {
            case 'value_display':
                return <ValueDisplayRenderer 
                    settings={settings} 
                    values={mappedValues}
                    definition={definition}
                    conditionalStyles={conditionalStyles}
                />;
            
            case 'gauge_circular':
                return <CircularGaugeRenderer 
                    settings={settings} 
                    values={mappedValues}
                />;
            
            case 'tank_visual':
                return <TankVisualRenderer 
                    settings={settings} 
                    values={mappedValues}
                />;
            
            case 'status_badge':
                return <StatusBadgeRenderer 
                    settings={settings} 
                    values={mappedValues}
                />;
            
            case 'progress_bar':
                return <ProgressBarRenderer 
                    settings={settings} 
                    values={mappedValues}
                />;
            
            case 'icon_value':
                return <IconValueRenderer 
                    settings={settings} 
                    values={mappedValues}
                    definition={definition}
                />;
            
            case 'text_block':
                return <TextBlockRenderer settings={settings} />;
            
            case 'image_display':
                return <ImageDisplayRenderer settings={settings} />;
            
            case 'container':
                return <ContainerRenderer settings={settings}>{children}</ContainerRenderer>;
            
            case 'chart_line':
                return <ChartPlaceholder type="line" />;
            
            case 'chart_bar':
                return <ChartPlaceholder type="bar" />;
            
            default:
                return (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <span>Unknown render type: {definition.render_type}</span>
                    </div>
                );
        }
    };

    return (
        <div 
            className={`h-full relative overflow-hidden ${isEditing ? 'cursor-pointer' : ''}`}
            style={containerStyles}
            onClick={isEditing ? onSettingsClick : undefined}
        >
            {/* Title bar (if enabled) */}
            {settings.show_title !== false && instance.title && (
                <div className="px-4 py-2 border-b border-border">
                    <h4 className="text-sm font-medium truncate">{instance.title}</h4>
                </div>
            )}
            
            {/* Widget content */}
            <div className="h-full">
                {renderContent()}
            </div>

            {/* Edit overlay */}
            {isEditing && (
                <div className="absolute inset-0 bg-primary/5 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                        {getIcon('Settings', 'w-4 h-4')}
                        Configure
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================
// RENDER TYPE COMPONENTS
// =============================================

interface RendererProps {
    settings: Record<string, any>;
    values?: Record<string, any>;
    definition?: WidgetDefinition;
    conditionalStyles?: React.CSSProperties;
    children?: React.ReactNode;
}

// Value Display Renderer
function ValueDisplayRenderer({ settings, values = {}, definition, conditionalStyles }: RendererProps) {
    const value = values.value;
    const formattedValue = formatValue(value, settings.decimals);
    
    const sizeClasses: Record<string, string> = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl',
        xl: 'text-4xl'
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-4">
            {settings.show_icon && (
                <div className="mb-2" style={{ color: settings.icon_color || conditionalStyles?.color }}>
                    {getIcon(settings.icon || definition?.icon, 'w-8 h-8')}
                </div>
            )}
            <div 
                className={`font-bold ${sizeClasses[settings.value_size] || 'text-3xl'}`}
                style={{ color: conditionalStyles?.color }}
            >
                {settings.prefix}{formattedValue}{settings.suffix}
            </div>
            {settings.show_unit && settings.unit && (
                <div className="text-sm text-muted-foreground mt-1">{settings.unit}</div>
            )}
        </div>
    );
}

// Circular Gauge Renderer
function CircularGaugeRenderer({ settings, values = {} }: RendererProps) {
    const value = values.value ?? 0;
    const min = settings.min_value ?? 0;
    const max = settings.max_value ?? 100;
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    
    // Determine color based on thresholds
    let color = settings.color_low || '#22C55E';
    const lowThreshold = settings.low_threshold ?? 33;
    const highThreshold = settings.high_threshold ?? 66;
    
    if (percentage > highThreshold) {
        color = settings.color_high || '#EF4444';
    } else if (percentage > lowThreshold) {
        color = settings.color_mid || '#F59E0B';
    }

    const strokeDasharray = `${percentage * 2.83} 283`;

    return (
        <div className="h-full flex items-center justify-center p-4">
            <div className="relative">
                <svg viewBox="0 0 100 100" className="w-full h-full max-w-32 max-h-32">
                    {/* Background circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted/30"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={strokeDasharray}
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-500"
                    />
                </svg>
                {settings.show_value !== false && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{Math.round(value)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Tank Visual Renderer
function TankVisualRenderer({ settings, values = {} }: RendererProps) {
    const level = Math.min(100, Math.max(0, values.level ?? 0));
    
    const tankColors: Record<string, { fill: string; wave: string }> = {
        water: { fill: '#3B82F6', wave: '#60A5FA' },
        wastewater: { fill: '#22C55E', wave: '#4ADE80' },
        diesel: { fill: '#F59E0B', wave: '#FBBF24' },
        fuel: { fill: '#EF4444', wave: '#F87171' },
        chemical: { fill: '#A855F7', wave: '#C084FC' },
        custom: { fill: settings.custom_color || '#3B82F6', wave: settings.custom_color || '#60A5FA' }
    };

    const colors = tankColors[settings.tank_type] || tankColors.water;

    return (
        <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="relative w-24 h-32 border-4 border-muted-foreground/30 rounded-b-2xl overflow-hidden">
                {/* Water level */}
                <div 
                    className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                    style={{ 
                        height: `${level}%`,
                        backgroundColor: colors.fill
                    }}
                >
                    {/* Wave effect */}
                    {settings.show_waves !== false && (
                        <div 
                            className="absolute top-0 left-0 right-0 h-3"
                            style={{
                                background: `linear-gradient(to bottom, ${colors.wave}, ${colors.fill})`,
                                animation: 'wave 2s ease-in-out infinite'
                            }}
                        />
                    )}
                    
                    {/* Bubbles */}
                    {settings.show_bubbles && level > 10 && (
                        <>
                            <div className="absolute bottom-2 left-3 w-2 h-2 bg-white/30 rounded-full animate-bubble" />
                            <div className="absolute bottom-4 right-4 w-1.5 h-1.5 bg-white/20 rounded-full animate-bubble animation-delay-500" />
                            <div className="absolute bottom-1 left-1/2 w-1 h-1 bg-white/25 rounded-full animate-bubble animation-delay-1000" />
                        </>
                    )}
                </div>
            </div>
            
            {settings.show_percentage !== false && (
                <div className="mt-3 text-2xl font-bold">{Math.round(level)}%</div>
            )}
        </div>
    );
}

// Status Badge Renderer
function StatusBadgeRenderer({ settings, values = {} }: RendererProps) {
    const status = values.status;
    const isOnline = status === true || status === 'online' || status === 'active' || status === 1;
    
    return (
        <div className="h-full flex items-center justify-center p-3">
            <div className="flex items-center gap-2">
                {settings.show_dot !== false && (
                    <div 
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ backgroundColor: isOnline ? settings.online_color : settings.offline_color }}
                    />
                )}
                <span className="font-medium">
                    {isOnline ? settings.online_text : settings.offline_text}
                </span>
            </div>
        </div>
    );
}

// Progress Bar Renderer
function ProgressBarRenderer({ settings, values = {} }: RendererProps) {
    const value = values.value ?? 0;
    const max = values.max ?? 100;
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const heightClasses: Record<string, string> = {
        sm: 'h-2',
        md: 'h-4',
        lg: 'h-6'
    };

    return (
        <div className="h-full flex flex-col justify-center p-4">
            {settings.show_label && (
                <div className="flex justify-between mb-2 text-sm">
                    <span>{settings.label || 'Progress'}</span>
                    {settings.show_percentage && <span>{Math.round(percentage)}%</span>}
                </div>
            )}
            <div className={`w-full bg-muted rounded-full overflow-hidden ${heightClasses[settings.height] || 'h-4'}`}>
                <div 
                    className="h-full transition-all duration-500 rounded-full"
                    style={{ 
                        width: `${percentage}%`,
                        backgroundColor: settings.color || '#3B82F6'
                    }}
                />
            </div>
        </div>
    );
}

// Icon Value Renderer
function IconValueRenderer({ settings, values = {}, definition }: RendererProps) {
    const value = values.value;
    const formattedValue = formatValue(value);

    const sizeClasses: Record<string, string> = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-20 h-20'
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-4">
            <div style={{ color: settings.icon_color || '#3B82F6' }}>
                {getIcon(settings.icon || definition?.icon, sizeClasses[settings.icon_size] || 'w-12 h-12')}
            </div>
            <div className="mt-2 text-2xl font-bold">{formattedValue}</div>
            {settings.show_label && settings.label && (
                <div className="text-sm text-muted-foreground">{settings.label}</div>
            )}
        </div>
    );
}

// Text Block Renderer
function TextBlockRenderer({ settings }: RendererProps) {
    const alignClasses: Record<string, string> = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    };

    const weightClasses: Record<string, string> = {
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold'
    };

    return (
        <div 
            className={`h-full flex items-center p-4 ${alignClasses[settings.text_align] || 'text-left'}`}
            style={{ 
                fontSize: settings.font_size || 16,
                color: settings.text_color || 'inherit'
            }}
        >
            <span className={weightClasses[settings.font_weight] || 'font-normal'}>
                {settings.text || 'Text goes here...'}
            </span>
        </div>
    );
}

// Image Display Renderer
function ImageDisplayRenderer({ settings }: RendererProps) {
    if (!settings.image_url) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <LucideIcons.Image className="w-12 h-12" />
            </div>
        );
    }

    return (
        <div className="h-full p-2">
            <img 
                src={settings.image_url}
                alt=""
                className="w-full h-full"
                style={{ 
                    objectFit: settings.object_fit || 'contain',
                    borderRadius: settings.border_radius || 8
                }}
            />
        </div>
    );
}

// Container Renderer
function ContainerRenderer({ settings, children }: RendererProps) {
    return (
        <div 
            className="h-full grid"
            style={{
                gridTemplateColumns: `repeat(${settings.columns || 2}, 1fr)`,
                gap: settings.gap || 16,
                padding: settings.padding || 16,
                backgroundColor: settings.background_color || 'transparent',
                borderWidth: settings.border_width || 1,
                borderColor: settings.border_color || '#E5E7EB',
                borderStyle: 'solid'
            }}
        >
            {children || (
                <div className="col-span-full flex items-center justify-center text-muted-foreground">
                    Drop widgets here
                </div>
            )}
        </div>
    );
}

// Chart Placeholder (actual charts need proper data integration)
function ChartPlaceholder({ type }: { type: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-4 text-muted-foreground">
            {type === 'line' ? (
                <LucideIcons.LineChart className="w-12 h-12 mb-2" />
            ) : (
                <LucideIcons.BarChart className="w-12 h-12 mb-2" />
            )}
            <span className="text-sm">{type === 'line' ? 'Line Chart' : 'Bar Chart'}</span>
            <span className="text-xs">Connect to data source</span>
        </div>
    );
}
