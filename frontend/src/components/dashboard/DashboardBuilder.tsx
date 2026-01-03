'use client';

import React, { useState } from 'react';
import { Plus, Settings, Trash2, Eye, Code, Save, X } from 'lucide-react';
import { WidgetConfig, WidgetType, WIDGET_TYPES, DashboardTemplate } from '@/types/dashboard';
import WidgetRenderer from './WidgetRenderer';
import { RichSelect } from '../ui/RichSelect';
import { Input } from '../ui/Input';

interface DashboardBuilderProps {
    availableParameters: { key: string; name: string; unit?: string; data_type: string }[];
    initialTemplate?: DashboardTemplate;
    onSave: (template: DashboardTemplate) => void;
    onCancel?: () => void;
}

export default function DashboardBuilder({
    availableParameters,
    initialTemplate,
    onSave,
    onCancel
}: DashboardBuilderProps) {
    const [widgets, setWidgets] = useState<WidgetConfig[]>(initialTemplate?.widgets || []);
    const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);

    const addWidget = (type: WidgetType) => {
        const widgetType = WIDGET_TYPES.find(w => w.type === type);
        if (!widgetType) return;

        const newWidget: WidgetConfig = {
            id: `widget_${Date.now()}`,
            type,
            title: widgetType.label,
            settings: {
                showIcon: true,
                showUnit: true,
            },
            position: {
                x: 0,
                y: widgets.length * 2,
                w: widgetType.defaultSize.w,
                h: widgetType.defaultSize.h
            }
        };

        setWidgets([...widgets, newWidget]);
        setSelectedWidget(newWidget.id);
    };

    const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
        setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
    };

    const deleteWidget = (id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
        if (selectedWidget === id) setSelectedWidget(null);
    };

    // Sub-widget management for containers
    const addSubWidget = (containerId: string, type: WidgetType) => {
        const widgetType = WIDGET_TYPES.find(w => w.type === type);
        if (!widgetType) return;

        const newSubWidget: WidgetConfig = {
            id: `widget_${Date.now()}`,
            type,
            title: widgetType.label,
            settings: {
                showIcon: true,
                showUnit: true,
            },
            position: { x: 0, y: 0, w: 12, h: 2 }
        };

        setWidgets(widgets.map(w => {
            if (w.id === containerId) {
                return {
                    ...w,
                    children: [...(w.children || []), newSubWidget]
                };
            }
            return w;
        }));
    };

    const updateSubWidget = (containerId: string, subWidgetId: string, updates: Partial<WidgetConfig>) => {
        setWidgets(widgets.map(w => {
            if (w.id === containerId && w.children) {
                return {
                    ...w,
                    children: w.children.map(child =>
                        child.id === subWidgetId ? { ...child, ...updates } : child
                    )
                };
            }
            return w;
        }));
    };

    const deleteSubWidget = (containerId: string, subWidgetId: string) => {
        setWidgets(widgets.map(w => {
            if (w.id === containerId && w.children) {
                return {
                    ...w,
                    children: w.children.filter(child => child.id !== subWidgetId)
                };
            }
            return w;
        }));
    };

    const handleSave = () => {
        onSave({ widgets });
    };

    const selectedWidgetData = widgets.find(w => w.id === selectedWidget);

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold">Dashboard Builder</h3>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {widgets.length} widgets
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${previewMode
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        {previewMode ? 'Edit Mode' : 'Preview'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 hover:bg-primary/90"
                    >
                        <Save className="w-4 h-4" />
                        Save Template
                    </button>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="p-1.5 hover:bg-muted rounded-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Widget Toolbox */}
                {!previewMode && (
                    <div className="w-64 border-r border-border bg-card p-4 overflow-y-auto">
                        <h4 className="text-sm font-semibold mb-3">Widget Library</h4>

                        {/* Layout Widgets */}
                        <div className="mb-4">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Layout</h5>
                            <div className="space-y-2">
                                {WIDGET_TYPES.filter(w => w.category === 'layout').map((widgetType) => (
                                    <button
                                        key={widgetType.type}
                                        onClick={() => addWidget(widgetType.type)}
                                        className="w-full p-3 bg-muted/30 hover:bg-muted rounded-lg text-left transition-colors group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">{widgetType.label}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {widgetType.description}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Data Widgets */}
                        <div className="mb-4">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Data Display</h5>
                            <div className="space-y-2">
                                {WIDGET_TYPES.filter(w => w.category === 'data').map((widgetType) => (
                                    <button
                                        key={widgetType.type}
                                        onClick={() => addWidget(widgetType.type)}
                                        className="w-full p-3 bg-muted/30 hover:bg-muted rounded-lg text-left transition-colors group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">{widgetType.label}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {widgetType.description}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Visualization Widgets */}
                        <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Visualizations</h5>
                            <div className="space-y-2">
                                {WIDGET_TYPES.filter(w => w.category === 'visualization').map((widgetType) => (
                                    <button
                                        key={widgetType.type}
                                        onClick={() => addWidget(widgetType.type)}
                                        className="w-full p-3 bg-muted/30 hover:bg-muted rounded-lg text-left transition-colors group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">{widgetType.label}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {widgetType.description}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Canvas */}
                <div className="flex-1 p-6 overflow-y-auto bg-muted/20">
                    <div className="grid grid-cols-12 gap-4 max-w-7xl mx-auto">
                        {widgets.map((widget) => (
                            <div
                                key={widget.id}
                                className={`relative group`}
                                style={{
                                    gridColumn: `span ${widget.position.w}`,
                                    minHeight: `${widget.position.h * 80}px`
                                }}
                                onClick={() => !previewMode && setSelectedWidget(widget.id)}
                            >
                                <div className={`h-full transition-all ${selectedWidget === widget.id && !previewMode
                                    ? 'ring-2 ring-primary ring-offset-2'
                                    : ''
                                    }`}>
                                    <WidgetRenderer widget={widget} isPreview={previewMode} />
                                </div>

                                {!previewMode && (
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedWidget(widget.id);
                                            }}
                                            className="p-1.5 bg-background border border-border rounded hover:bg-muted"
                                        >
                                            <Settings className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteWidget(widget.id);
                                            }}
                                            className="p-1.5 bg-background border border-border rounded hover:bg-destructive hover:text-destructive-foreground"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {widgets.length === 0 && (
                            <div className="col-span-12 flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <Plus className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h4 className="text-lg font-semibold mb-2">Start Building</h4>
                                <p className="text-sm text-muted-foreground max-w-md">
                                    Add widgets from the library to create your dashboard template.<br />
                                    Configure each widget to display device parameters.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Properties Panel */}
                {selectedWidgetData && !previewMode && (
                    <div className="w-80 border-l border-border bg-card p-4 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">Widget Settings</h4>
                            <button
                                onClick={() => setSelectedWidget(null)}
                                className="p-1 hover:bg-muted rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Widget Title"
                                value={selectedWidgetData.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateWidget(selectedWidgetData.id, { title: e.target.value })
                                }
                            />

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Parameter</label>
                                <select
                                    value={selectedWidgetData.parameter_key || ''}
                                    onChange={(e) => updateWidget(selectedWidgetData.id, { parameter_key: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                >
                                    <option value="">Select parameter...</option>
                                    {availableParameters.map((param) => (
                                        <option key={param.key} value={param.key}>
                                            {param.name} ({param.key})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Type-specific settings */}
                            {selectedWidgetData.type === 'container' && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Columns</label>
                                        <select
                                            value={selectedWidgetData.settings.columns || 2}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, columns: parseInt(e.target.value) }
                                            })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            <option value="1">1 Column</option>
                                            <option value="2">2 Columns</option>
                                            <option value="3">3 Columns</option>
                                            <option value="4">4 Columns</option>
                                        </select>
                                    </div>
                                    <div className="pt-4 border-t border-border">
                                        <div className="flex items-center justify-between mb-3">
                                            <h5 className="text-sm font-medium">Sub-Widgets</h5>
                                            <span className="text-xs text-muted-foreground">
                                                {selectedWidgetData.children?.length || 0} items
                                            </span>
                                        </div>

                                        {/* Add Sub-Widget Dropdown */}
                                        <div className="mb-3">
                                            <label className="text-xs font-medium mb-1.5 block">Add Widget</label>
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        addSubWidget(selectedWidgetData.id, e.target.value as WidgetType);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                            >
                                                <option value="">Select widget type...</option>
                                                <optgroup label="Data">
                                                    {WIDGET_TYPES.filter(w => w.category === 'data').map(w => (
                                                        <option key={w.type} value={w.type}>{w.label}</option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Visualizations">
                                                    {WIDGET_TYPES.filter(w => w.category === 'visualization').map(w => (
                                                        <option key={w.type} value={w.type}>{w.label}</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>

                                        {/* Sub-Widget List */}
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {selectedWidgetData.children?.map((child, index) => (
                                                <div
                                                    key={child.id}
                                                    className="p-3 bg-muted/30 rounded-lg border border-border"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <input
                                                                type="text"
                                                                value={child.title}
                                                                onChange={(e) => updateSubWidget(
                                                                    selectedWidgetData.id,
                                                                    child.id,
                                                                    { title: e.target.value }
                                                                )}
                                                                className="w-full px-2 py-1 text-sm font-medium bg-background border border-border rounded"
                                                            />
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {WIDGET_TYPES.find(w => w.type === child.type)?.label}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => deleteSubWidget(selectedWidgetData.id, child.id)}
                                                            className="ml-2 p-1 hover:bg-destructive/10 text-destructive rounded"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    {/* Parameter Selection for sub-widget */}
                                                    <select
                                                        value={child.parameter_key || ''}
                                                        onChange={(e) => updateSubWidget(
                                                            selectedWidgetData.id,
                                                            child.id,
                                                            { parameter_key: e.target.value }
                                                        )}
                                                        className="w-full p-1.5 rounded border border-border bg-background text-xs mt-2"
                                                    >
                                                        <option value="">Select parameter...</option>
                                                        {availableParameters.map((param) => (
                                                            <option key={param.key} value={param.key}>
                                                                {param.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )) || (
                                                    <div className="text-xs text-center text-muted-foreground py-4">
                                                        No sub-widgets yet.<br />Select a type above to add.
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedWidgetData.type === 'device_status' && (
                                <>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedWidgetData.settings.showLastSeen}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, showLastSeen: e.target.checked }
                                            })}
                                            className="rounded"
                                        />
                                        Show Last Seen
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedWidgetData.settings.showSignalStrength}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, showSignalStrength: e.target.checked }
                                            })}
                                            className="rounded"
                                        />
                                        Show Signal Strength
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedWidgetData.settings.showBattery}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, showBattery: e.target.checked }
                                            })}
                                            className="rounded"
                                        />
                                        Show Battery Level
                                    </label>
                                </>
                            )}

                            {selectedWidgetData.type === 'parameter_card' && (
                                <>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedWidgetData.settings.showIcon}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, showIcon: e.target.checked }
                                            })}
                                            className="rounded"
                                        />
                                        Show Icon
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedWidgetData.settings.showUnit}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, showUnit: e.target.checked }
                                            })}
                                            className="rounded"
                                        />
                                        Show Unit
                                    </label>
                                </>
                            )}

                            {selectedWidgetData.type === 'counter' && (
                                <>
                                    <Input
                                        label="Prefix"
                                        placeholder="e.g. $"
                                        value={selectedWidgetData.settings.prefix || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, prefix: e.target.value }
                                            })
                                        }
                                    />
                                    <Input
                                        label="Suffix"
                                        placeholder="e.g. km/h"
                                        value={selectedWidgetData.settings.suffix || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, suffix: e.target.value }
                                            })
                                        }
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
