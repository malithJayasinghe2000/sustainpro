'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, Save, X, Trash2, Copy, ChevronDown, ChevronRight, 
    Settings, Eye, Palette, Layers, Code, FileJson, 
    GripVertical, AlertCircle, CheckCircle2
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { 
    WidgetDefinition, 
    WidgetCategory,
    WidgetRenderType,
    ParameterSlot,
    SettingDefinition,
    StyleCondition,
    RENDER_TYPE_DEFAULTS
} from '@/types/dynamic-widgets';
import widgetDefinitionsApi from '@/lib/widget-definitions-api';
import DynamicWidgetRenderer from './DynamicWidgetRenderer';

// =============================================
// WIDGET DEFINITION BUILDER
// =============================================
// UI for Super Admins to create and edit widget definitions

interface WidgetDefinitionBuilderProps {
    definition?: WidgetDefinition;
    onSave: (definition: Partial<WidgetDefinition>) => Promise<void>;
    onCancel: () => void;
}

export default function WidgetDefinitionBuilder({
    definition,
    onSave,
    onCancel
}: WidgetDefinitionBuilderProps) {
    const isEditing = !!definition;
    
    // Form state
    const [code, setCode] = useState(definition?.code || '');
    const [name, setName] = useState(definition?.name || '');
    const [description, setDescription] = useState(definition?.description || '');
    const [categoryId, setCategoryId] = useState(definition?.category_id || '');
    const [renderType, setRenderType] = useState<WidgetRenderType>(
        (definition?.render_type as WidgetRenderType) || 'value_display'
    );
    
    // Size
    const [defaultWidth, setDefaultWidth] = useState(definition?.default_width || 3);
    const [defaultHeight, setDefaultHeight] = useState(definition?.default_height || 2);
    const [minWidth, setMinWidth] = useState(definition?.min_width || 1);
    const [maxWidth, setMaxWidth] = useState(definition?.max_width || 12);
    const [minHeight, setMinHeight] = useState(definition?.min_height || 1);
    const [maxHeight, setMaxHeight] = useState(definition?.max_height || 10);
    
    // Appearance
    const [icon, setIcon] = useState(definition?.icon || '');
    const [iconColor, setIconColor] = useState(definition?.icon_color || '');
    const [backgroundColor, setBackgroundColor] = useState(definition?.background_color || '');
    const [borderRadius, setBorderRadius] = useState(definition?.border_radius || 8);
    const [hasShadow, setHasShadow] = useState(definition?.has_shadow ?? true);
    
    // Advanced
    const [parameterSlots, setParameterSlots] = useState<ParameterSlot[]>(
        definition?.parameter_slots || []
    );
    const [settingsSchema, setSettingsSchema] = useState<{ settings: SettingDefinition[] }>(
        (definition?.settings_schema as any) || { settings: [] }
    );
    const [defaultSettings, setDefaultSettings] = useState<Record<string, any>>(
        definition?.default_settings || {}
    );
    const [styleConditions, setStyleConditions] = useState<StyleCondition[]>(
        definition?.style_conditions || []
    );
    
    // UI state
    const [activeTab, setActiveTab] = useState<'basic' | 'size' | 'appearance' | 'slots' | 'settings' | 'conditions'>('basic');
    const [categories, setCategories] = useState<WidgetCategory[]>([]);
    const [renderTypes, setRenderTypes] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load categories and render types
    useEffect(() => {
        const load = async () => {
            try {
                const [cats, types] = await Promise.all([
                    widgetDefinitionsApi.getCategories(),
                    widgetDefinitionsApi.getRenderTypes()
                ]);
                setCategories(cats);
                setRenderTypes(types);
                
                if (!categoryId && cats.length > 0) {
                    setCategoryId(cats[0].id);
                }
            } catch (err) {
                console.error('Failed to load data:', err);
            }
        };
        load();
    }, []);

    // Apply render type defaults when changed
    useEffect(() => {
        if (!isEditing) {
            const defaults = RENDER_TYPE_DEFAULTS[renderType];
            if (defaults) {
                setDefaultWidth(defaults.default_size.w);
                setDefaultHeight(defaults.default_size.h);
                setParameterSlots(defaults.default_slots);
                setSettingsSchema(defaults.default_settings_schema);
                setIcon(defaults.icon);
            }
        }
    }, [renderType, isEditing]);

    const handleSave = async () => {
        if (!code || !name || !categoryId) {
            setError('Code, name, and category are required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave({
                code,
                name,
                description,
                category_id: categoryId,
                render_type: renderType,
                default_width: defaultWidth,
                default_height: defaultHeight,
                min_width: minWidth,
                max_width: maxWidth,
                min_height: minHeight,
                max_height: maxHeight,
                icon,
                icon_color: iconColor,
                background_color: backgroundColor,
                border_radius: borderRadius,
                has_shadow: hasShadow,
                parameter_slots: parameterSlots,
                settings_schema: settingsSchema,
                default_settings: defaultSettings,
                style_conditions: styleConditions
            });
        } catch (err: any) {
            setError(err.message || 'Failed to save widget');
        } finally {
            setSaving(false);
        }
    };

    // Get icon component
    const getIcon = (iconName: string, className = 'w-5 h-5') => {
        const Icon = (LucideIcons as any)[iconName];
        return Icon ? <Icon className={className} /> : null;
    };

    // Tabs configuration
    const tabs = [
        { key: 'basic', label: 'Basic Info', icon: 'FileJson' },
        { key: 'size', label: 'Size', icon: 'Layers' },
        { key: 'appearance', label: 'Appearance', icon: 'Palette' },
        { key: 'slots', label: 'Parameters', icon: 'Code' },
        { key: 'settings', label: 'Settings', icon: 'Settings' },
        { key: 'conditions', label: 'Conditions', icon: 'AlertCircle' }
    ];

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">
                        {isEditing ? 'Edit Widget Definition' : 'Create Widget Definition'}
                    </h2>
                    {code && (
                        <span className="text-xs bg-muted px-2 py-1 rounded font-mono">{code}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm hover:bg-muted rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Widget'}
                    </button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="mx-4 mt-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Form */}
                <div className="flex-1 flex flex-col border-r border-border">
                    {/* Tabs */}
                    <div className="flex border-b border-border bg-muted/30">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-primary text-primary bg-background'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {getIcon(tab.icon, 'w-4 h-4')}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'basic' && (
                            <BasicInfoTab
                                code={code}
                                setCode={setCode}
                                name={name}
                                setName={setName}
                                description={description}
                                setDescription={setDescription}
                                categoryId={categoryId}
                                setCategoryId={setCategoryId}
                                renderType={renderType}
                                setRenderType={setRenderType}
                                categories={categories}
                                renderTypes={renderTypes}
                                isEditing={isEditing}
                            />
                        )}

                        {activeTab === 'size' && (
                            <SizeTab
                                defaultWidth={defaultWidth}
                                setDefaultWidth={setDefaultWidth}
                                defaultHeight={defaultHeight}
                                setDefaultHeight={setDefaultHeight}
                                minWidth={minWidth}
                                setMinWidth={setMinWidth}
                                maxWidth={maxWidth}
                                setMaxWidth={setMaxWidth}
                                minHeight={minHeight}
                                setMinHeight={setMinHeight}
                                maxHeight={maxHeight}
                                setMaxHeight={setMaxHeight}
                            />
                        )}

                        {activeTab === 'appearance' && (
                            <AppearanceTab
                                icon={icon}
                                setIcon={setIcon}
                                iconColor={iconColor}
                                setIconColor={setIconColor}
                                backgroundColor={backgroundColor}
                                setBackgroundColor={setBackgroundColor}
                                borderRadius={borderRadius}
                                setBorderRadius={setBorderRadius}
                                hasShadow={hasShadow}
                                setHasShadow={setHasShadow}
                            />
                        )}

                        {activeTab === 'slots' && (
                            <ParameterSlotsTab
                                slots={parameterSlots}
                                setSlots={setParameterSlots}
                            />
                        )}

                        {activeTab === 'settings' && (
                            <SettingsSchemaTab
                                schema={settingsSchema}
                                setSchema={setSettingsSchema}
                                defaultSettings={defaultSettings}
                                setDefaultSettings={setDefaultSettings}
                            />
                        )}

                        {activeTab === 'conditions' && (
                            <StyleConditionsTab
                                conditions={styleConditions}
                                setConditions={setStyleConditions}
                                slots={parameterSlots}
                            />
                        )}
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="w-96 flex flex-col bg-muted/20">
                    <div className="p-4 border-b border-border bg-card">
                        <h3 className="font-medium flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Live Preview
                        </h3>
                    </div>
                    <div className="flex-1 p-6 flex items-center justify-center">
                        <div
                            className="bg-card border border-border overflow-hidden"
                            style={{
                                width: `${defaultWidth * 80}px`,
                                height: `${defaultHeight * 80}px`,
                                borderRadius: borderRadius,
                                boxShadow: hasShadow ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                backgroundColor: backgroundColor || undefined
                            }}
                        >
                            <WidgetPreviewContent
                                renderType={renderType}
                                settings={defaultSettings}
                                icon={icon}
                                name={name}
                            />
                        </div>
                    </div>
                    <div className="p-4 border-t border-border bg-card text-center text-sm text-muted-foreground">
                        {defaultWidth}×{defaultHeight} grid units
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================
// TAB COMPONENTS
// =============================================

function BasicInfoTab({
    code, setCode, name, setName, description, setDescription,
    categoryId, setCategoryId, renderType, setRenderType,
    categories, renderTypes, isEditing
}: any) {
    return (
        <div className="space-y-6 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Widget Code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    placeholder="e.g., water_tank_gauge"
                    disabled={isEditing}
                    required
                />
                <Input
                    label="Display Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Water Tank Gauge"
                    required
                />
            </div>

            <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this widget does..."
                    className="w-full p-3 rounded-lg border border-border bg-background text-sm min-h-20"
                />
            </div>

            <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm"
                >
                    <option value="">Select category...</option>
                    {categories.map((cat: WidgetCategory) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="text-sm font-medium mb-1.5 block">Render Type</label>
                <div className="grid grid-cols-2 gap-2">
                    {renderTypes.map((rt: any) => (
                        <button
                            key={rt.type}
                            onClick={() => setRenderType(rt.type)}
                            className={`p-3 rounded-lg border text-left transition-colors ${
                                renderType === rt.type
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {(() => {
                                    const Icon = (LucideIcons as any)[rt.icon];
                                    return Icon ? <Icon className="w-4 h-4" /> : null;
                                })()}
                                <span className="font-medium text-sm">{rt.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{rt.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SizeTab({
    defaultWidth, setDefaultWidth, defaultHeight, setDefaultHeight,
    minWidth, setMinWidth, maxWidth, setMaxWidth,
    minHeight, setMinHeight, maxHeight, setMaxHeight
}: any) {
    return (
        <div className="space-y-6 max-w-xl">
            <div>
                <h4 className="font-medium mb-3">Default Size</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Width (grid units)</label>
                        <input
                            type="range"
                            min="1"
                            max="12"
                            value={defaultWidth}
                            onChange={(e) => setDefaultWidth(parseInt(e.target.value))}
                            className="w-full"
                        />
                        <div className="text-center font-mono text-sm">{defaultWidth}</div>
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Height (grid units)</label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={defaultHeight}
                            onChange={(e) => setDefaultHeight(parseInt(e.target.value))}
                            className="w-full"
                        />
                        <div className="text-center font-mono text-sm">{defaultHeight}</div>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="font-medium mb-3">Size Constraints</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Min Width"
                        type="number"
                        value={minWidth}
                        onChange={(e) => setMinWidth(parseInt(e.target.value))}
                        min={1}
                        max={12}
                    />
                    <Input
                        label="Max Width"
                        type="number"
                        value={maxWidth}
                        onChange={(e) => setMaxWidth(parseInt(e.target.value))}
                        min={1}
                        max={12}
                    />
                    <Input
                        label="Min Height"
                        type="number"
                        value={minHeight}
                        onChange={(e) => setMinHeight(parseInt(e.target.value))}
                        min={1}
                        max={10}
                    />
                    <Input
                        label="Max Height"
                        type="number"
                        value={maxHeight}
                        onChange={(e) => setMaxHeight(parseInt(e.target.value))}
                        min={1}
                        max={10}
                    />
                </div>
            </div>
        </div>
    );
}

function AppearanceTab({
    icon, setIcon, iconColor, setIconColor,
    backgroundColor, setBackgroundColor,
    borderRadius, setBorderRadius, hasShadow, setHasShadow
}: any) {
    const iconOptions = [
        'Activity', 'Gauge', 'Container', 'LineChart', 'BarChart', 
        'Zap', 'Droplet', 'Thermometer', 'Battery', 'Wifi',
        'Server', 'Database', 'Cpu', 'HardDrive', 'Cloud',
        'Sun', 'Moon', 'Wind', 'Waves', 'Flame',
        'Heart', 'Star', 'AlertTriangle', 'CheckCircle', 'XCircle'
    ];

    return (
        <div className="space-y-6 max-w-xl">
            <div>
                <label className="text-sm font-medium mb-1.5 block">Icon</label>
                <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg max-h-40 overflow-y-auto">
                    {iconOptions.map((iconName) => {
                        const Icon = (LucideIcons as any)[iconName];
                        return (
                            <button
                                key={iconName}
                                onClick={() => setIcon(iconName)}
                                className={`p-2 rounded-lg border transition-colors ${
                                    icon === iconName
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-transparent hover:bg-muted'
                                }`}
                                title={iconName}
                            >
                                {Icon && <Icon className="w-5 h-5" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1.5 block">Icon Color</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={iconColor || '#3B82F6'}
                            onChange={(e) => setIconColor(e.target.value)}
                            className="w-12 h-10 rounded border border-border cursor-pointer"
                        />
                        <Input
                            value={iconColor}
                            onChange={(e) => setIconColor(e.target.value)}
                            placeholder="#3B82F6"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium mb-1.5 block">Background Color</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={backgroundColor || '#FFFFFF'}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                            className="w-12 h-10 rounded border border-border cursor-pointer"
                        />
                        <Input
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                            placeholder="transparent"
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="text-sm font-medium mb-1.5 block">Border Radius: {borderRadius}px</label>
                <input
                    type="range"
                    min="0"
                    max="24"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                    className="w-full"
                />
            </div>

            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="hasShadow"
                    checked={hasShadow}
                    onChange={(e) => setHasShadow(e.target.checked)}
                    className="w-4 h-4"
                />
                <label htmlFor="hasShadow" className="text-sm">Enable shadow</label>
            </div>
        </div>
    );
}

function ParameterSlotsTab({ slots, setSlots }: { slots: ParameterSlot[], setSlots: (s: ParameterSlot[]) => void }) {
    const addSlot = () => {
        setSlots([
            ...slots,
            {
                key: `param_${Date.now()}`,
                label: 'New Parameter',
                required: false,
                data_types: ['number']
            }
        ]);
    };

    const updateSlot = (index: number, updates: Partial<ParameterSlot>) => {
        const newSlots = [...slots];
        newSlots[index] = { ...newSlots[index], ...updates };
        setSlots(newSlots);
    };

    const removeSlot = (index: number) => {
        setSlots(slots.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            {/* Explanation Box */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📊 Data Connections</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    Parameter slots connect your widget to real device data. When users add this widget to a dashboard, 
                    they&apos;ll choose which measurement (like temperature, pressure, or level) to display.
                </p>
                <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-3 text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Example:</p>
                    <p className="text-blue-700 dark:text-blue-300">
                        A &quot;Temperature Card&quot; widget needs one slot called &quot;Temperature Value&quot;. 
                        When a user adds it to their dashboard, they select which sensor&apos;s temperature to show.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Add data connections for this widget
                </p>
                <button
                    onClick={addSlot}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Data Slot
                </button>
            </div>

            {slots.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground mb-2">No data connections yet</p>
                    <p className="text-sm text-muted-foreground/70">Click &quot;Add Data Slot&quot; to connect this widget to device data like temperature, pressure, or status.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {slots.map((slot, index) => (
                        <div key={slot.key} className="p-4 border border-border rounded-lg bg-card">
                            <div className="flex items-start gap-3">
                                <GripVertical className="w-4 h-4 text-muted-foreground mt-2 cursor-grab" />
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                    <Input
                                        label="Slot Key"
                                        value={slot.key}
                                        onChange={(e) => updateSlot(index, { key: e.target.value })}
                                        placeholder="e.g., value"
                                    />
                                    <Input
                                        label="Display Label"
                                        value={slot.label}
                                        onChange={(e) => updateSlot(index, { label: e.target.value })}
                                        placeholder="e.g., Main Value"
                                    />
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Data Types</label>
                                        <div className="flex gap-2">
                                            {['number', 'string', 'boolean'].map((type) => (
                                                <label key={type} className="flex items-center gap-1.5 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={slot.data_types.includes(type as any)}
                                                        onChange={(e) => {
                                                            const types = e.target.checked
                                                                ? [...slot.data_types, type]
                                                                : slot.data_types.filter((t) => t !== type);
                                                            updateSlot(index, { data_types: types as any });
                                                        }}
                                                        className="w-4 h-4"
                                                    />
                                                    {type}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-5">
                                        <label className="flex items-center gap-1.5 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={slot.required}
                                                onChange={(e) => updateSlot(index, { required: e.target.checked })}
                                                className="w-4 h-4"
                                            />
                                            Required
                                        </label>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeSlot(index)}
                                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SettingsSchemaTab({ schema, setSchema, defaultSettings, setDefaultSettings }: any) {
    const addSetting = () => {
        const newSetting: SettingDefinition = {
            key: `setting_${Date.now()}`,
            label: 'New Setting',
            type: 'string',
            default_value: ''
        };
        setSchema({ settings: [...schema.settings, newSetting] });
    };

    const updateSetting = (index: number, updates: Partial<SettingDefinition>) => {
        const newSettings = [...schema.settings];
        newSettings[index] = { ...newSettings[index], ...updates };
        setSchema({ settings: newSettings });
        
        // Update default settings if default_value changed
        if (updates.default_value !== undefined) {
            setDefaultSettings({
                ...defaultSettings,
                [newSettings[index].key]: updates.default_value
            });
        }
    };

    const removeSetting = (index: number) => {
        const key = schema.settings[index].key;
        setSchema({ settings: schema.settings.filter((_: any, i: number) => i !== index) });
        const newDefaults = { ...defaultSettings };
        delete newDefaults[key];
        setDefaultSettings(newDefaults);
    };

    return (
        <div className="space-y-4">
            {/* Explanation Box */}
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">🎛️ Customization Options</h4>
                <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                    Settings let users personalize how this widget looks and behaves when they add it to their dashboard.
                </p>
                <div className="bg-green-100 dark:bg-green-900/40 rounded-lg p-3 text-sm">
                    <p className="font-medium text-green-900 dark:text-green-100 mb-2">Common settings you might add:</p>
                    <div className="grid grid-cols-2 gap-2 text-green-700 dark:text-green-300">
                        <span>✓ Show/hide the unit (°C, %, etc.)</span>
                        <span>✓ Choose display size (small, large)</span>
                        <span>✓ Pick a custom icon</span>
                        <span>✓ Set background color</span>
                        <span>✓ Number of decimal places</span>
                        <span>✓ Show/hide title</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Add options users can customize
                </p>
                <button
                    onClick={addSetting}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Option
                </button>
            </div>

            {schema.settings.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground mb-2">No customization options yet</p>
                    <p className="text-sm text-muted-foreground/70">Click &quot;Add Option&quot; to let users customize things like colors, sizes, or visibility.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {schema.settings.map((setting: SettingDefinition, index: number) => (
                        <div key={setting.key} className="p-4 border border-border rounded-lg bg-card">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 grid grid-cols-3 gap-3">
                                    <Input
                                        label="Key"
                                        value={setting.key}
                                        onChange={(e) => updateSetting(index, { key: e.target.value })}
                                    />
                                    <Input
                                        label="Label"
                                        value={setting.label}
                                        onChange={(e) => updateSetting(index, { label: e.target.value })}
                                    />
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Type</label>
                                        <select
                                            value={setting.type}
                                            onChange={(e) => updateSetting(index, { type: e.target.value as any })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            <option value="string">String</option>
                                            <option value="number">Number</option>
                                            <option value="boolean">Boolean</option>
                                            <option value="color">Color</option>
                                            <option value="icon">Icon</option>
                                            <option value="select">Select</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeSetting(index)}
                                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StyleConditionsTab({ conditions, setConditions, slots }: any) {
    const addCondition = () => {
        const newCondition: StyleCondition = {
            slot: slots[0]?.key || '',
            operator: 'gt',
            value: 0,
            styles: { color: '#EF4444' }
        };
        setConditions([...conditions, newCondition]);
    };

    const updateCondition = (index: number, updates: Partial<StyleCondition>) => {
        const newConditions = [...conditions];
        newConditions[index] = { ...newConditions[index], ...updates };
        setConditions(newConditions);
    };

    const removeCondition = (index: number) => {
        setConditions(conditions.filter((_: any, i: number) => i !== index));
    };

    return (
        <div className="space-y-4">
            {/* Explanation Box */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">🚨 Automatic Color Changes</h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                    Make the widget automatically change color based on the data value — perfect for alerts!
                </p>
                <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-3 text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">Example: Temperature Alert</p>
                    <div className="space-y-1 text-amber-700 dark:text-amber-300">
                        <p>🟢 Green when temperature is normal (below 25°C)</p>
                        <p>🟡 Yellow when getting warm (25°C - 35°C)</p>
                        <p>🔴 Red when too hot (above 35°C)</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Add automatic color alerts
                </p>
                <button
                    onClick={addCondition}
                    disabled={slots.length === 0}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                    title={slots.length === 0 ? 'Add a data connection first' : ''}
                >
                    <Plus className="w-4 h-4" />
                    Add Alert Rule
                </button>
            </div>

            {slots.length === 0 && (
                <div className="p-4 text-center text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    💡 First, add a &quot;Data Connection&quot; in the Slots tab. Then you can create alert rules based on that data.
                </div>
            )}

            {conditions.length === 0 && slots.length > 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground mb-2">No alert rules yet</p>
                    <p className="text-sm text-muted-foreground/70">Click &quot;Add Alert Rule&quot; to change colors automatically when values go high or low.</p>
                </div>
            ) : conditions.length > 0 ? (
                <div className="space-y-3">
                    {conditions.map((condition: StyleCondition, index: number) => (
                        <div key={index} className="p-4 border border-border rounded-lg bg-card">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 grid grid-cols-4 gap-3">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Parameter</label>
                                        <select
                                            value={condition.slot}
                                            onChange={(e) => updateCondition(index, { slot: e.target.value })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            {slots.map((slot: ParameterSlot) => (
                                                <option key={slot.key} value={slot.key}>{slot.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Operator</label>
                                        <select
                                            value={condition.operator}
                                            onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            <option value="eq">Equals</option>
                                            <option value="neq">Not Equals</option>
                                            <option value="gt">Greater Than</option>
                                            <option value="gte">Greater/Equal</option>
                                            <option value="lt">Less Than</option>
                                            <option value="lte">Less/Equal</option>
                                        </select>
                                    </div>
                                    <Input
                                        label="Value"
                                        type="number"
                                        value={condition.value}
                                        onChange={(e) => updateCondition(index, { value: parseFloat(e.target.value) })}
                                    />
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Color</label>
                                        <input
                                            type="color"
                                            value={condition.styles.color || '#EF4444'}
                                            onChange={(e) => updateCondition(index, { 
                                                styles: { ...condition.styles, color: e.target.value } 
                                            })}
                                            className="w-full h-10 rounded border border-border cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeCondition(index)}
                                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

// Preview content component
function WidgetPreviewContent({ renderType, settings, icon, name }: any) {
    const Icon = icon ? (LucideIcons as any)[icon] : null;

    switch (renderType) {
        case 'value_display':
            return (
                <div className="h-full flex flex-col items-center justify-center p-4">
                    {Icon && <Icon className="w-8 h-8 mb-2 text-primary" />}
                    <div className="text-3xl font-bold">42</div>
                    <div className="text-sm text-muted-foreground">{name || 'Value Display'}</div>
                </div>
            );
        case 'gauge_circular':
            return (
                <div className="h-full flex items-center justify-center">
                    <div className="relative w-24 h-24">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#3B82F6" strokeWidth="8" 
                                strokeDasharray="180 283" transform="rotate(-90 50 50)" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-bold">64%</span>
                        </div>
                    </div>
                </div>
            );
        case 'tank_visual':
            return (
                <div className="h-full flex flex-col items-center justify-center">
                    <div className="relative w-16 h-24 border-4 border-muted-foreground/30 rounded-b-xl overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-blue-500" />
                    </div>
                    <div className="mt-2 font-bold">75%</div>
                </div>
            );
        case 'status_badge':
            return (
                <div className="h-full flex items-center justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-medium">Online</span>
                    </div>
                </div>
            );
        default:
            return (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                    {Icon && <Icon className="w-8 h-8" />}
                </div>
            );
    }
}
