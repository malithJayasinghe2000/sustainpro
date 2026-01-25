'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import widgetDefinitionsApi from '@/lib/widget-definitions-api';
import { WidgetDefinition, WidgetCategory as DBCategory } from '@/types/dynamic-widgets';
import { WidgetTypeMeta, WidgetType, WidgetCategory, WIDGET_TYPES } from '@/types/dashboard';

// =============================================
// DYNAMIC WIDGETS HOOK
// =============================================
// This hook fetches widget definitions from the database
// and converts them to the format expected by DashboardBuilder

interface UseDynamicWidgetsReturn {
    widgetTypes: WidgetTypeMeta[];
    categories: DBCategory[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    // Get widget meta by type
    getWidgetMeta: (type: string) => WidgetTypeMeta | undefined;
    // Grouped by category for the sidebar
    groupedByCategory: Record<string, WidgetTypeMeta[]>;
}

// Map database category name to dashboard category
const mapCategoryNameToType = (categoryName: string): WidgetCategory => {
    const lowerName = categoryName.toLowerCase();
    
    // Direct mapping from database category names
    if (lowerName.includes('layout')) return 'layout';
    if (lowerName.includes('data') || lowerName.includes('display')) return 'data';
    if (lowerName.includes('visual') || lowerName.includes('chart') || lowerName.includes('gauge')) return 'visualization';
    if (lowerName.includes('control')) return 'control';
    if (lowerName.includes('monitor') || lowerName.includes('alert') || lowerName.includes('audit')) return 'monitoring';
    if (lowerName.includes('decorat') || lowerName.includes('text') || lowerName.includes('logo') || lowerName.includes('icon')) return 'decorative';
    
    // Fallback based on render_type patterns
    return 'data';
};

// Map render_type to category as fallback
const mapRenderTypeToCategory = (renderType: string): WidgetCategory => {
    const categoryMap: Record<string, WidgetCategory> = {
        // Layout
        'container': 'layout',
        'section': 'layout',
        'row': 'layout',
        'column': 'layout',
        // Data Display
        'device_status': 'data',
        'parameter_card': 'data',
        'counter': 'data',
        'status_indicator': 'data',
        'transparent_parameter': 'data',
        'value_display': 'data',
        'icon_value': 'data',
        'status_badge': 'data',
        // Visualization
        'tank_gauge': 'visualization',
        'tank_visual': 'visualization',
        'circular_gauge': 'visualization',
        'gauge_circular': 'visualization',
        'gauge': 'visualization',
        'line_chart': 'visualization',
        'chart_line': 'visualization',
        'table_view': 'visualization',
        'table_data': 'visualization',
        'chart_table_toggle': 'visualization',
        // Control
        'threshold_editor': 'control',
        'recording_control': 'control',
        'device_config': 'control',
        'slider_control': 'control',
        'switch_control': 'control',
        // Monitoring
        'alert_widget': 'monitoring',
        'audit_log': 'monitoring',
        'available_devices': 'monitoring',
        // Decorative
        'text_widget': 'decorative',
        'text_block': 'decorative',
        'logo_widget': 'decorative',
        'icon_widget': 'decorative',
        'background_image': 'decorative',
        'image_display': 'decorative',
    };
    return categoryMap[renderType] || 'data';
};

// Map database render_type to standard WidgetType that WidgetRenderer understands
const mapRenderTypeToWidgetType = (renderType: string): WidgetType => {
    const typeMap: Record<string, WidgetType> = {
        // Direct matches (no mapping needed)
        'container': 'container',
        'section': 'section',
        'device_status': 'device_status',
        'parameter_card': 'parameter_card',
        'counter': 'counter',
        'status_indicator': 'status_indicator',
        'transparent_parameter': 'transparent_parameter',
        'tank_gauge': 'tank_gauge',
        'gauge': 'gauge',
        'line_chart': 'line_chart',
        'table_view': 'table_view',
        'chart_table_toggle': 'chart_table_toggle',
        'threshold_editor': 'threshold_editor',
        'recording_control': 'recording_control',
        'device_config': 'device_config',
        'alert_widget': 'alert_widget',
        'audit_log': 'audit_log',
        'available_devices': 'available_devices',
        'text_widget': 'text_widget',
        'logo_widget': 'logo_widget',
        'icon_widget': 'icon_widget',
        'background_image': 'background_image',
        
        // Custom database render_types -> standard widget types
        'value_display': 'parameter_card',      // Maps to parameter card
        'icon_value': 'parameter_card',         // Maps to parameter card with icon
        'status_badge': 'status_indicator',     // Maps to status indicator
        'tank_visual': 'tank_gauge',            // Maps to tank gauge
        'gauge_circular': 'gauge',              // Maps to circular gauge
        'chart_line': 'line_chart',             // Maps to line chart
        'table_data': 'table_view',             // Maps to table view
        'text_block': 'text_widget',            // Maps to text widget
        'image_display': 'logo_widget',         // Maps to logo widget
        'slider_control': 'threshold_editor',   // Maps to threshold editor
        'switch_control': 'recording_control',  // Maps to recording control (toggle)
    };
    
    return typeMap[renderType] || (renderType as WidgetType);
};

// Convert database widget to DashboardBuilder format
const convertToWidgetMeta = (def: WidgetDefinition, categoriesMap: Map<string, DBCategory>): WidgetTypeMeta => {
    // Try to get category from database first
    let category: WidgetCategory = 'data';
    if (def.category_id && categoriesMap.has(def.category_id)) {
        const dbCategory = categoriesMap.get(def.category_id)!;
        category = mapCategoryNameToType(dbCategory.name);
    } else {
        // Fallback to render_type mapping
        category = mapRenderTypeToCategory(def.render_type);
    }

    // Map custom render_type to standard widget type that WidgetRenderer understands
    const mappedType = mapRenderTypeToWidgetType(def.render_type);

    return {
        id: `db-${def.id}`,  // Unique ID using database record ID
        type: mappedType,    // Use mapped type for rendering compatibility
        label: def.name,
        icon: def.icon || 'Box',
        description: def.description || '',
        defaultSize: {
            w: def.default_width || 4,
            h: def.default_height || 2
        },
        category,
        requiresParameter: (def.parameter_slots?.length ?? 0) > 0
    };
};

export function useDynamicWidgets(options?: {
    useDatabaseWidgets?: boolean;
    fallbackToStatic?: boolean;
}): UseDynamicWidgetsReturn {
    // Default: use database widgets only, no static fallback to avoid duplicates
    const { useDatabaseWidgets = true, fallbackToStatic = false } = options || {};
    
    const [definitions, setDefinitions] = useState<WidgetDefinition[]>([]);
    const [categories, setCategories] = useState<DBCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!useDatabaseWidgets) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [defsData, catsData] = await Promise.all([
                widgetDefinitionsApi.getDefinitions({ include_deprecated: false }),
                widgetDefinitionsApi.getCategories()
            ]);
            setDefinitions(defsData);
            setCategories(catsData);
        } catch (err) {
            console.error('[useDynamicWidgets] Error fetching widgets:', err);
            setError(err instanceof Error ? err.message : 'Failed to load widgets');
            // If fallback is enabled and there's an error, we'll use static widgets
        } finally {
            setLoading(false);
        }
    }, [useDatabaseWidgets]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Create categories lookup map
    const categoriesMap = useMemo(() => {
        const map = new Map<string, DBCategory>();
        categories.forEach(cat => map.set(cat.id, cat));
        return map;
    }, [categories]);

    // Convert database widgets to WidgetTypeMeta format
    const widgetTypes = useMemo<WidgetTypeMeta[]>(() => {
        if (!useDatabaseWidgets) {
            return WIDGET_TYPES;
        }

        if (definitions.length === 0) {
            // No database widgets yet - use static as fallback
            if (fallbackToStatic) {
                return WIDGET_TYPES;
            }
            return [];
        }

        // Convert database widgets with category mapping
        const dbWidgets = definitions
            .filter(d => !d.is_deprecated)
            .map(d => convertToWidgetMeta(d, categoriesMap));

        // Remove duplicates (prefer database over static)
        const dbTypes = new Set(dbWidgets.map(w => w.type));
        const staticWidgets = fallbackToStatic 
            ? WIDGET_TYPES.filter(w => !dbTypes.has(w.type))
            : [];

        return [...dbWidgets, ...staticWidgets];
    }, [definitions, categories, categoriesMap, useDatabaseWidgets, fallbackToStatic]);

    // Group by category for sidebar display
    const groupedByCategory = useMemo(() => {
        const groups: Record<string, WidgetTypeMeta[]> = {
            layout: [],
            data: [],
            visualization: [],
            control: [],
            monitoring: [],
            decorative: []
        };

        widgetTypes.forEach(widget => {
            if (groups[widget.category]) {
                groups[widget.category].push(widget);
            }
        });

        return groups;
    }, [widgetTypes]);

    // Get widget meta by type
    const getWidgetMeta = useCallback((type: string): WidgetTypeMeta | undefined => {
        return widgetTypes.find(w => w.type === type);
    }, [widgetTypes]);

    return {
        widgetTypes,
        categories,
        loading,
        error,
        refetch: fetchData,
        getWidgetMeta,
        groupedByCategory
    };
}

export default useDynamicWidgets;
