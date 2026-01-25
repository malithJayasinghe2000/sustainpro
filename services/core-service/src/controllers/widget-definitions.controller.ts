import { Request, Response } from 'express';
import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();

const logger = createLogger({ service: 'core-service' });

// =============================================
// RENDER TYPES DEFAULTS
// =============================================
const RENDER_TYPE_DEFAULTS: Record<string, {
    label: string;
    icon: string;
    description: string;
    default_size: { w: number; h: number };
    default_slots: any[];
    default_settings_schema: any;
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
            { key: 'value', label: 'Value', required: true, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'min_value', label: 'Min Value', type: 'number', default_value: 0 },
                { key: 'max_value', label: 'Max Value', type: 'number', default_value: 100 },
                { key: 'show_value', label: 'Show Value', type: 'boolean', default_value: true },
                { key: 'show_needle', label: 'Show Needle', type: 'boolean', default_value: true },
                { key: 'color_low', label: 'Low Color', type: 'color', default_value: '#22C55E' },
                { key: 'color_mid', label: 'Mid Color', type: 'color', default_value: '#F59E0B' },
                { key: 'color_high', label: 'High Color', type: 'color', default_value: '#EF4444' }
            ]
        }
    },
    tank_visual: {
        label: 'Tank Gauge',
        icon: 'Container',
        description: 'Tank/container fill visualization',
        default_size: { w: 4, h: 4 },
        default_slots: [
            { key: 'level', label: 'Level (%)', required: true, data_types: ['number'] }
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
                { key: 'show_bubbles', label: 'Show Bubbles', type: 'boolean', default_value: true },
                { key: 'show_percentage', label: 'Show Percentage', type: 'boolean', default_value: true }
            ]
        }
    },
    chart_line: {
        label: 'Line Chart',
        icon: 'LineChart',
        description: 'Time series line chart',
        default_size: { w: 6, h: 3 },
        default_slots: [
            { key: 'primary', label: 'Primary Series', required: true, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'time_range', label: 'Time Range', type: 'select', default_value: '24h', options: [
                    { value: '1h', label: '1 Hour' },
                    { value: '6h', label: '6 Hours' },
                    { value: '24h', label: '24 Hours' },
                    { value: '7d', label: '7 Days' }
                ]},
                { key: 'show_legend', label: 'Show Legend', type: 'boolean', default_value: true },
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
                { key: 'offline_color', label: 'Offline Color', type: 'color', default_value: '#EF4444' }
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
                { key: 'padding', label: 'Padding', type: 'number', default_value: 16, min: 0, max: 48 }
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
                    { value: 'bold', label: 'Bold' }
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
                ]}
            ]
        }
    },
    progress_bar: {
        label: 'Progress Bar',
        icon: 'BarChart3',
        description: 'Progress/completion indicator',
        default_size: { w: 4, h: 1 },
        default_slots: [
            { key: 'value', label: 'Value', required: true, data_types: ['number'] }
        ],
        default_settings_schema: {
            settings: [
                { key: 'color', label: 'Bar Color', type: 'color', default_value: '#3B82F6' },
                { key: 'show_percentage', label: 'Show Percentage', type: 'boolean', default_value: true }
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
                    { value: 'lg', label: 'Large' }
                ]},
                { key: 'icon_color', label: 'Icon Color', type: 'color', default_value: '#3B82F6' }
            ]
        }
    }
};

// =============================================
// CATEGORIES
// =============================================

export const getCategories = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        
        const categories = await prisma.sps_widget_categories.findMany({
            where: {
                is_active: true,
                OR: [
                    { organization_id: null }, // System categories
                    { organization_id: user?.organization_id }
                ]
            },
            orderBy: { sort_order: 'asc' }
        });

        return res.json({ success: true, data: categories });
    } catch (error) {
        logger.error('Failed to get widget categories', { error });
        return res.status(500).json({ success: false, error: 'Failed to get categories' });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { name, description, icon, color, sort_order } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }

        // Only super admin can create system categories (org_id = null)
        const organization_id = user?.is_super_admin ? null : user?.organization_id;

        const category = await prisma.sps_widget_categories.create({
            data: {
                name,
                description,
                icon,
                color,
                sort_order: sort_order || 0,
                organization_id
            }
        });

        logger.info('Widget category created', { categoryId: category.id, name });
        return res.status(201).json({ success: true, data: category });
    } catch (error) {
        logger.error('Failed to create widget category', { error });
        return res.status(500).json({ success: false, error: 'Failed to create category' });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, icon, color, sort_order, is_active } = req.body;

        const category = await prisma.sps_widget_categories.update({
            where: { id },
            data: {
                name,
                description,
                icon,
                color,
                sort_order,
                is_active,
                updated_at: new Date()
            }
        });

        return res.json({ success: true, data: category });
    } catch (error) {
        logger.error('Failed to update widget category', { error });
        return res.status(500).json({ success: false, error: 'Failed to update category' });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if category has widgets
        const widgetCount = await prisma.sps_widget_definitions.count({
            where: { category_id: id, deleted_at: null }
        });

        if (widgetCount > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot delete category with ${widgetCount} widgets. Move or delete widgets first.` 
            });
        }

        await prisma.sps_widget_categories.delete({ where: { id } });

        return res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        logger.error('Failed to delete widget category', { error });
        return res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
};

// =============================================
// WIDGET DEFINITIONS
// =============================================

export const getRenderTypes = async (req: Request, res: Response) => {
    try {
        const renderTypes = Object.entries(RENDER_TYPE_DEFAULTS).map(([key, value]) => ({
            type: key,
            ...value
        }));

        return res.json({ success: true, data: renderTypes });
    } catch (error) {
        logger.error('Failed to get render types', { error });
        return res.status(500).json({ success: false, error: 'Failed to get render types' });
    }
};

export const getDefinitions = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { 
            category_id, 
            render_type, 
            include_system = 'true',
            include_deprecated = 'false',
            search
        } = req.query;

        const where: any = {
            deleted_at: null,
            OR: [
                { organization_id: null },
                { organization_id: user?.organization_id }
            ]
        };

        if (category_id) {
            where.category_id = category_id;
        }

        if (render_type) {
            where.render_type = render_type;
        }

        if (include_system !== 'true') {
            where.is_system = false;
        }

        if (include_deprecated !== 'true') {
            where.is_deprecated = false;
        }

        if (search) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: search as string, mode: 'insensitive' } },
                        { description: { contains: search as string, mode: 'insensitive' } },
                        { code: { contains: search as string, mode: 'insensitive' } }
                    ]
                }
            ];
        }

        const definitions = await prisma.sps_widget_definitions.findMany({
            where,
            include: {
                sps_widget_categories: true,
                sps_users: {
                    select: { id: true, full_name: true, email: true }
                }
            },
            orderBy: [
                { sps_widget_categories: { sort_order: 'asc' } },
                { name: 'asc' }
            ]
        });

        // Transform the response
        const transformed = definitions.map((d: any) => ({
            ...d,
            category: d.sps_widget_categories,
            created_by_user: d.sps_users,
            sps_widget_categories: undefined,
            sps_users: undefined
        }));

        return res.json({ success: true, data: transformed });
    } catch (error) {
        logger.error('Failed to get widget definitions', { error });
        return res.status(500).json({ success: false, error: 'Failed to get definitions' });
    }
};

export const getDefinition = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const definition = await prisma.sps_widget_definitions.findUnique({
            where: { id },
            include: {
                sps_widget_categories: true,
                sps_widget_presets: true
            }
        });

        if (!definition) {
            return res.status(404).json({ success: false, error: 'Widget definition not found' });
        }

        return res.json({ 
            success: true, 
            data: {
                ...definition,
                category: definition.sps_widget_categories,
                presets: definition.sps_widget_presets
            }
        });
    } catch (error) {
        logger.error('Failed to get widget definition', { error });
        return res.status(500).json({ success: false, error: 'Failed to get definition' });
    }
};

export const createDefinition = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const {
            code,
            name,
            description,
            category_id,
            render_type,
            default_width,
            default_height,
            min_width,
            max_width,
            min_height,
            max_height,
            icon,
            icon_color,
            background_color,
            border_radius,
            has_shadow,
            parameter_slots,
            settings_schema,
            default_settings,
            style_conditions,
            custom_css,
            preview_image
        } = req.body;

        if (!code || !name || !category_id || !render_type) {
            return res.status(400).json({ 
                success: false, 
                error: 'code, name, category_id, and render_type are required' 
            });
        }

        // Check for duplicate code
        const existing = await prisma.sps_widget_definitions.findUnique({
            where: { code }
        });

        if (existing) {
            return res.status(400).json({ 
                success: false, 
                error: `Widget with code "${code}" already exists` 
            });
        }

        // Get render type defaults
        const renderDefaults = RENDER_TYPE_DEFAULTS[render_type] || {
            default_size: { w: 3, h: 2 },
            default_slots: [],
            default_settings_schema: { settings: [] }
        };

        const definition = await prisma.sps_widget_definitions.create({
            data: {
                code,
                name,
                description,
                category_id,
                render_type,
                default_width: default_width || renderDefaults.default_size.w,
                default_height: default_height || renderDefaults.default_size.h,
                min_width: min_width || 1,
                max_width: max_width || 12,
                min_height: min_height || 1,
                max_height: max_height || 10,
                icon: icon || renderDefaults.icon,
                icon_color,
                background_color,
                border_radius: border_radius ?? 8,
                has_shadow: has_shadow ?? true,
                parameter_slots: parameter_slots || renderDefaults.default_slots,
                settings_schema: settings_schema || renderDefaults.default_settings_schema,
                default_settings: default_settings || {},
                style_conditions: style_conditions || [],
                custom_css,
                preview_image,
                organization_id: user?.is_super_admin ? null : user?.organization_id,
                created_by: user?.id,
                is_system: user?.is_super_admin && !user?.organization_id
            }
        });

        logger.info('Widget definition created', { 
            definitionId: definition.id, 
            code, 
            name 
        });

        return res.status(201).json({ success: true, data: definition });
    } catch (error) {
        logger.error('Failed to create widget definition', { error });
        return res.status(500).json({ success: false, error: 'Failed to create definition' });
    }
};

export const updateDefinition = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if definition exists and is not a system widget (unless super admin)
        const existing = await prisma.sps_widget_definitions.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({ success: false, error: 'Widget definition not found' });
        }

        const user = (req as any).user;
        if (existing.is_system && !user?.is_super_admin) {
            return res.status(403).json({ 
                success: false, 
                error: 'Cannot modify system widgets' 
            });
        }

        // Remove fields that shouldn't be updated
        delete updates.id;
        delete updates.code; // Code is immutable
        delete updates.is_system;
        delete updates.created_by;
        delete updates.created_at;

        const definition = await prisma.sps_widget_definitions.update({
            where: { id },
            data: {
                ...updates,
                updated_at: new Date()
            }
        });

        logger.info('Widget definition updated', { definitionId: id });
        return res.json({ success: true, data: definition });
    } catch (error) {
        logger.error('Failed to update widget definition', { error });
        return res.status(500).json({ success: false, error: 'Failed to update definition' });
    }
};

export const deleteDefinition = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const existing = await prisma.sps_widget_definitions.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({ success: false, error: 'Widget definition not found' });
        }

        const user = (req as any).user;
        if (existing.is_system && !user?.is_super_admin) {
            return res.status(403).json({ 
                success: false, 
                error: 'Cannot delete system widgets' 
            });
        }

        // Soft delete
        await prisma.sps_widget_definitions.update({
            where: { id },
            data: {
                deleted_at: new Date(),
                is_active: false
            }
        });

        logger.info('Widget definition deleted', { definitionId: id });
        return res.json({ success: true, message: 'Widget definition deleted' });
    } catch (error) {
        logger.error('Failed to delete widget definition', { error });
        return res.status(500).json({ success: false, error: 'Failed to delete definition' });
    }
};

export const duplicateDefinition = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const original = await prisma.sps_widget_definitions.findUnique({
            where: { id }
        });

        if (!original) {
            return res.status(404).json({ success: false, error: 'Widget definition not found' });
        }

        // Generate new code
        const newCode = `${original.code}_copy_${Date.now()}`;

        const duplicate = await prisma.sps_widget_definitions.create({
            data: {
                code: newCode,
                name: `${original.name} (Copy)`,
                description: original.description,
                version: '1.0.0',
                category_id: original.category_id,
                render_type: original.render_type,
                default_width: original.default_width,
                default_height: original.default_height,
                min_width: original.min_width,
                max_width: original.max_width,
                min_height: original.min_height,
                max_height: original.max_height,
                icon: original.icon,
                icon_color: original.icon_color,
                background_color: original.background_color,
                border_radius: original.border_radius,
                has_shadow: original.has_shadow,
                parameter_slots: original.parameter_slots as any,
                settings_schema: original.settings_schema as any,
                default_settings: original.default_settings as any,
                style_conditions: original.style_conditions as any,
                custom_css: original.custom_css,
                preview_image: original.preview_image,
                organization_id: user?.organization_id,
                created_by: user?.id,
                is_system: false
            }
        });

        logger.info('Widget definition duplicated', { 
            originalId: id, 
            duplicateId: duplicate.id 
        });

        return res.status(201).json({ success: true, data: duplicate });
    } catch (error) {
        logger.error('Failed to duplicate widget definition', { error });
        return res.status(500).json({ success: false, error: 'Failed to duplicate definition' });
    }
};

// =============================================
// WIDGET PRESETS
// =============================================

export const getPresets = async (req: Request, res: Response) => {
    try {
        const { definitionId } = req.params;
        const user = (req as any).user;

        const presets = await prisma.sps_widget_presets.findMany({
            where: {
                widget_definition_id: definitionId,
                is_active: true,
                OR: [
                    { organization_id: null },
                    { organization_id: user?.organization_id }
                ]
            },
            include: {
                sps_device_models: true
            },
            orderBy: { name: 'asc' }
        });

        return res.json({ success: true, data: presets });
    } catch (error) {
        logger.error('Failed to get widget presets', { error });
        return res.status(500).json({ success: false, error: 'Failed to get presets' });
    }
};

export const createPreset = async (req: Request, res: Response) => {
    try {
        const { definitionId } = req.params;
        const user = (req as any).user;
        const {
            name,
            description,
            settings,
            width,
            height,
            device_model_id,
            parameter_mappings,
            tags
        } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }

        const preset = await prisma.sps_widget_presets.create({
            data: {
                widget_definition_id: definitionId,
                name,
                description,
                settings: settings || {},
                width,
                height,
                device_model_id,
                parameter_mappings: parameter_mappings || {},
                tags: tags || [],
                organization_id: user?.is_super_admin ? null : user?.organization_id,
                created_by: user?.id
            }
        });

        logger.info('Widget preset created', { presetId: preset.id, name });
        return res.status(201).json({ success: true, data: preset });
    } catch (error) {
        logger.error('Failed to create widget preset', { error });
        return res.status(500).json({ success: false, error: 'Failed to create preset' });
    }
};

export const updatePreset = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        delete updates.id;
        delete updates.widget_definition_id;
        delete updates.created_by;
        delete updates.created_at;

        const preset = await prisma.sps_widget_presets.update({
            where: { id },
            data: {
                ...updates,
                updated_at: new Date()
            }
        });

        return res.json({ success: true, data: preset });
    } catch (error) {
        logger.error('Failed to update widget preset', { error });
        return res.status(500).json({ success: false, error: 'Failed to update preset' });
    }
};

export const deletePreset = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.sps_widget_presets.delete({ where: { id } });

        logger.info('Widget preset deleted', { presetId: id });
        return res.json({ success: true, message: 'Preset deleted' });
    } catch (error) {
        logger.error('Failed to delete widget preset', { error });
        return res.status(500).json({ success: false, error: 'Failed to delete preset' });
    }
};
