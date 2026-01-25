'use client';

import React, { useState } from 'react';
import GridLayout from 'react-grid-layout';
import { Plus, Settings, Trash2, Eye, Save, X, Loader2 } from 'lucide-react';
import { WidgetConfig, WidgetType, DashboardTemplate } from '@/types/dashboard';
import WidgetRenderer from './WidgetRenderer';
import { Input } from '../ui/Input';
import useDynamicWidgets from '@/hooks/useDynamicWidgets';
import 'react-grid-layout/css/styles.css';

interface DashboardBuilderDragDropProps {
    availableParameters: { key: string; name: string; unit?: string; data_type: string }[];
    initialTemplate?: DashboardTemplate;
    onSave: (template: DashboardTemplate) => void;
    onCancel?: () => void;
    onChange?: () => void; // Called when widgets are modified
}

export default function DashboardBuilderDragDrop({
    availableParameters,
    initialTemplate,
    onSave,
    onCancel,
    onChange
}: DashboardBuilderDragDropProps) {
    // Robust initialization
    const [widgets, setWidgets] = useState<WidgetConfig[]>(
        Array.isArray(initialTemplate?.widgets) ? initialTemplate.widgets : []
    );
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [canvasPadding, setCanvasPadding] = useState(24);

    // Fetch widgets from database (with fallback to static)
    const { widgetTypes, loading: widgetsLoading, groupedByCategory, getWidgetMeta } = useDynamicWidgets({
        useDatabaseWidgets: true,
        fallbackToStatic: true
    });

    // --- Helpers for Deep Search/Update ---

    const findWidgetPath = (id: string, list: WidgetConfig[], parentId: string | null = null): { widget: WidgetConfig, parentId: string | null } | null => {
        for (const w of list) {
            if (w.id === id) return { widget: w, parentId };
            if (w.children) {
                const found = findWidgetPath(id, w.children, w.id);
                if (found) return found;
            }
        }
        return null;
    };

    const updateWidgetDeep = (list: WidgetConfig[], id: string, updates: Partial<WidgetConfig>): WidgetConfig[] => {
        return list.map(w => {
            if (w.id === id) return { ...w, ...updates };
            if (w.children) return { ...w, children: updateWidgetDeep(w.children, id, updates) };
            return w;
        });
    };

    const deleteWidgetDeep = (list: WidgetConfig[], id: string): WidgetConfig[] => {
        return list.filter(w => w.id !== id).map(w => ({
            ...w,
            children: w.children ? deleteWidgetDeep(w.children, id) : undefined
        }));
    };

    // --- Actions ---

    const addWidget = (type: WidgetType) => {
        const widgetType = getWidgetMeta(type);
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
                y: Infinity,
                w: widgetType.defaultSize.w,
                h: widgetType.defaultSize.h
            },
            children: type === 'container' ? [] : undefined
        };

        setWidgets([...widgets, newWidget]);
        onChange?.(); // Track changes
    };

    const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
        setWidgets(updateWidgetDeep(widgets, id, updates));
        onChange?.(); // Track changes
    };

    const deleteWidget = (id: string) => {
        setWidgets(deleteWidgetDeep(widgets, id));
        if (selectedWidgetId === id) {
            setSelectedWidgetId(null);
            setShowSettings(false);
        }
        onChange?.(); // Track changes
    };

    const moveWidget = (widgetId: string, newParentId: string | null) => {
        const found = findWidgetPath(widgetId, widgets);
        if (!found) return;
        const { widget, parentId: oldParentId } = found;

        if (oldParentId === newParentId) return; // No change

        // 1. Remove from old location
        let newWidgets = deleteWidgetDeep(widgets, widgetId);

        // 2. Add to new location
        if (newParentId === null) {
            // Add to top level
            newWidgets = [...newWidgets, widget];
        } else {
            // Add to container
            newWidgets = updateWidgetDeep(newWidgets, newParentId, {
                // Ensure children array exists and add widget
                // We utilize a callback approach for cleaner logic if possible, 
                // but updateWidgetDeep expects simple partial.
                // We need to fetch the target container first to append?
                // Actually updateWidgetDeep replaces properties.
                // We need a specific "appendChild" helper or modification logic.
                // Let's implement a specialized map:
                // Simpler: Use recursion to Find and Modify.
            });

            // Re-implementing correctly:
            const addToContainer = (list: WidgetConfig[]): WidgetConfig[] => {
                return list.map(w => {
                    if (w.id === newParentId) {
                        return { ...w, children: [...(w.children || []), widget] };
                    }
                    if (w.children) {
                        return { ...w, children: addToContainer(w.children) };
                    }
                    return w;
                });
            };
            newWidgets = addToContainer(newWidgets);
        }
        setWidgets(newWidgets);
    };

    const onLayoutChange = (layout: readonly any[]) => {
        // Only updates top-level widgets
        let hasChanged = false;
        setWidgets(currentWidgets => {
            const updatedWidgets = currentWidgets.map(w => {
                const layoutItem = layout.find(l => l.i === w.id);
                if (layoutItem) {
                    // Check if position actually changed
                    if (w.position.x !== layoutItem.x || 
                        w.position.y !== layoutItem.y || 
                        w.position.w !== layoutItem.w || 
                        w.position.h !== layoutItem.h) {
                        hasChanged = true;
                    }
                    return {
                        ...w,
                        position: {
                            x: layoutItem.x,
                            y: layoutItem.y,
                            w: layoutItem.w,
                            h: layoutItem.h
                        }
                    };
                }
                return w;
            });
            return updatedWidgets;
        });
        // Only trigger onChange if positions actually changed
        if (hasChanged) {
            onChange?.();
        }
    };

    const handleSave = () => {
        onSave({ widgets });
    };

    const openSettings = (widgetId: string) => {
        setSelectedWidgetId(widgetId);
        setShowSettings(true);
    };

    // Derived State
    const foundData = selectedWidgetId ? findWidgetPath(selectedWidgetId, widgets) : null;
    const selectedWidgetData = foundData?.widget;
    const parentContainerId = foundData?.parentId || null;

    // Get list of potential parent containers (Top Level Only for simplicity, or recursive flattening)
    // To prevent cycles, we filter out self and children.
    const getPotentialParents = () => {
        if (!selectedWidgetId) return [];
        // Flatten list of all containers
        const containers: { id: string, title: string }[] = [];
        const scan = (list: WidgetConfig[]) => {
            list.forEach(w => {
                if (w.id !== selectedWidgetId && w.type === 'container') {
                    // Simple cycle check: ensure selectedWidget is not an ancestor (handled by scan order not entering selectedWidget)
                    containers.push({ id: w.id, title: w.title });
                    if (w.children) scan(w.children);
                } else if (w.id !== selectedWidgetId && w.children) {
                    scan(w.children);
                }
            });
        };
        scan(widgets);
        return containers;
    };

    const potentialParents = getPotentialParents();

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold">Dashboard Builder</h3>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {widgets.length} top-level items
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Padding Control */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-xs">
                        <span className="text-muted-foreground">Padding:</span>
                        <input
                            type="range"
                            min="0"
                            max="48"
                            step="8"
                            value={canvasPadding}
                            onChange={(e) => setCanvasPadding(parseInt(e.target.value))}
                            className="w-20"
                        />
                        <span className="font-mono w-8">{canvasPadding}px</span>
                    </div>

                    <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${previewMode
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        {previewMode ? 'Edit' : 'Preview'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 hover:bg-primary/90"
                    >
                        <Save className="w-4 h-4" />
                        Save
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Widget Toolbox */}
                {!previewMode && (
                    <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
                        <div className="p-4 border-b border-border">
                            <h4 className="text-sm font-semibold">Widget Library</h4>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Loading State */}
                            {widgetsLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            )}

                            {/* Layout Widgets */}
                            {groupedByCategory.layout.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Layout</h5>
                                    <div className="space-y-2">
                                        {groupedByCategory.layout.map((widgetType) => (
                                            <button
                                                key={widgetType.id}
                                                onClick={() => addWidget(widgetType.type)}
                                                className="w-full p-3 bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent rounded-lg text-left transition-all group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{widgetType.label}</div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">{widgetType.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Data Widgets */}
                            {groupedByCategory.data.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Data Display</h5>
                                    <div className="space-y-2">
                                        {groupedByCategory.data.map((widgetType) => (
                                            <button
                                                key={widgetType.id}
                                                onClick={() => addWidget(widgetType.type)}
                                                className="w-full p-3 bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent rounded-lg text-left transition-all group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{widgetType.label}</div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">{widgetType.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Visualization Widgets */}
                            {groupedByCategory.visualization.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Visualizations</h5>
                                    <div className="space-y-2">
                                        {groupedByCategory.visualization.map((widgetType) => (
                                            <button
                                                key={widgetType.id}
                                                onClick={() => addWidget(widgetType.type)}
                                                className="w-full p-3 bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent rounded-lg text-left transition-all group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{widgetType.label}</div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">{widgetType.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Control Widgets */}
                            {groupedByCategory.control.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Control</h5>
                                    <div className="space-y-2">
                                        {groupedByCategory.control.map((widgetType) => (
                                            <button
                                                key={widgetType.id}
                                                onClick={() => addWidget(widgetType.type)}
                                                className="w-full p-3 bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent rounded-lg text-left transition-all group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{widgetType.label}</div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">{widgetType.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Monitoring Widgets */}
                            {groupedByCategory.monitoring.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Monitoring</h5>
                                    <div className="space-y-2">
                                        {groupedByCategory.monitoring.map((widgetType) => (
                                            <button
                                                key={widgetType.id}
                                                onClick={() => addWidget(widgetType.type)}
                                                className="w-full p-3 bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent rounded-lg text-left transition-all group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{widgetType.label}</div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">{widgetType.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Decorative Widgets */}
                            {groupedByCategory.decorative.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">Decorative</h5>
                                    <div className="space-y-2">
                                        {groupedByCategory.decorative.map((widgetType) => (
                                            <button
                                                key={widgetType.id}
                                                onClick={() => addWidget(widgetType.type)}
                                                className="w-full p-3 bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent rounded-lg text-left transition-all group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg bg-pink-500/10 text-pink-600">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{widgetType.label}</div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">{widgetType.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Canvas */}
                <div className="flex-1 overflow-y-auto bg-muted/20">
                    <div className="flex items-start justify-center min-h-full" style={{ paddingTop: `${canvasPadding + 24}px`, paddingBottom: `${canvasPadding}px`, paddingLeft: `${canvasPadding}px`, paddingRight: `${canvasPadding}px` }}>
                        <div
                            className="bg-background border-2 border-dashed border-border rounded-xl shadow-lg"
                            style={{
                                width: '1200px',
                                minHeight: widgets.length === 0 ? '600px' : 'auto',
                                padding: `${canvasPadding}px`
                            }}
                        >
                            {widgets.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-32">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <Plus className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h4 className="text-lg font-semibold mb-2">Start Building Your Dashboard</h4>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        Add widgets from the left panel • Drag to position • Resize from corners
                                    </p>
                                    <div className="mt-6 text-xs text-muted-foreground">
                                        Canvas Size: 1200px × Auto
                                    </div>
                                </div>
                            ) : (
                                <GridLayout
                                    className="layout"
                                    layout={widgets.map(w => ({ i: w.id, x: w.position.x, y: w.position.y, w: w.position.w, h: w.position.h }))}
                                    cols={12}
                                    rowHeight={80}
                                    width={1200}
                                    onLayoutChange={onLayoutChange}
                                    isDraggable={!previewMode}
                                    isResizable={!previewMode}
                                    compactType="vertical"
                                    {...({} as any)}
                                >
                                    {widgets.map((widget) => (
                                        <div key={widget.id} className="group">
                                            <div className="h-full">
                                                <WidgetRenderer
                                                    widget={widget}
                                                    isPreview={previewMode}
                                                    availableParameters={availableParameters}
                                                    onEdit={openSettings}
                                                    onDelete={deleteWidget}
                                                />
                                            </div>
                                            {!previewMode && (
                                                <div className="absolute -top-8 right-0 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openSettings(widget.id); }}
                                                        className="p-1.5 bg-background shadow-md border border-border rounded hover:bg-muted transition-colors"
                                                        title="Settings"
                                                    >
                                                        <Settings className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteWidget(widget.id); }}
                                                        className="p-1.5 bg-background shadow-md border border-border rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </GridLayout>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && selectedWidgetData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="font-semibold">Widget Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-muted rounded">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <Input
                                label="Widget Title"
                                value={selectedWidgetData.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateWidget(selectedWidgetData.id, { title: e.target.value })
                                }
                            />

                            {/* Parent Group Selection */}
                            {potentialParents.length > 0 && selectedWidgetData.type !== 'container' && (
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Parent Group</label>
                                    <select
                                        value={parentContainerId || ''}
                                        onChange={(e) => moveWidget(selectedWidgetData.id, e.target.value || null)}
                                        className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                    >
                                        <option value="">None (Top Level)</option>
                                        {potentialParents.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Nested Widget Settings */}
                            {parentContainerId && (
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Column Span</label>
                                    <select
                                        value={selectedWidgetData.settings.colSpan || 1}
                                        onChange={(e) => updateWidget(selectedWidgetData.id, {
                                            settings: { ...selectedWidgetData.settings, colSpan: parseInt(e.target.value) }
                                        })}
                                        className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                    >
                                        <option value="1">1 Column</option>
                                        <option value="2">2 Columns</option>
                                        <option value="3">3 Columns</option>
                                        <option value="4">4 Columns</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Span across columns within the parent container.
                                    </p>
                                </div>
                            )}

                            {/* Device Status Widget - Parameter Selection */}
                            {selectedWidgetData.type === 'device_status' && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Battery Level Parameter (Optional)</label>
                                        <select
                                            value={selectedWidgetData.settings.batteryParameter || ''}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, batteryParameter: e.target.value }
                                            })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            <option value="">None</option>
                                            {availableParameters.map((param) => (
                                                <option key={param.key} value={param.key}>
                                                    {param.name} ({param.key})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Signal Strength Parameter (Optional)</label>
                                        <select
                                            value={selectedWidgetData.settings.signalParameter || ''}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, signalParameter: e.target.value }
                                            })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            <option value="">None</option>
                                            {availableParameters.map((param) => (
                                                <option key={param.key} value={param.key}>
                                                    {param.name} ({param.key})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Firmware Version Parameter (Optional)</label>
                                        <select
                                            value={selectedWidgetData.settings.firmwareParameter || ''}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, firmwareParameter: e.target.value }
                                            })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            <option value="">None</option>
                                            {availableParameters.map((param) => (
                                                <option key={param.key} value={param.key}>
                                                    {param.name} ({param.key})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Regular widgets - Single parameter selection */}
                            {selectedWidgetData.type !== 'container' && selectedWidgetData.type !== 'device_status' && (
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
                            )}

                            {/* Tank Gauge Specific Settings */}
                            {selectedWidgetData.type === 'tank_gauge' && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Tank Type</label>
                                        <select
                                            value={selectedWidgetData.settings.tankType || 'water'}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, tankType: e.target.value as any }
                                            })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            <option value="water">💧 Water Tank</option>
                                            <option value="waste">♻️ Waste Water Tank</option>
                                            <option value="diesel">⛽ Diesel Tank</option>
                                            <option value="fuel">⛽ Fuel Tank</option>
                                            <option value="chemical">⚗️ Chemical Tank</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Tank Mode</label>
                                        <select
                                            value={selectedWidgetData.settings.tankMode || 'draining'}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, tankMode: e.target.value as any }
                                            })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            <option value="filling">↑ Filling</option>
                                            <option value="draining">↓ Draining</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="showBubbles"
                                            checked={selectedWidgetData.settings.showBubbles !== false}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, showBubbles: e.target.checked }
                                            })}
                                            className="w-4 h-4"
                                        />
                                        <label htmlFor="showBubbles" className="text-sm">Show Animated Bubbles</label>
                                    </div>
                                </>
                            )}

                            {/* Container Settings */}
                            {selectedWidgetData.type === 'container' && (
                                <div className="space-y-4">
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
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Rows (Optional)</label>
                                        <select
                                            value={selectedWidgetData.settings.rows || ''}
                                            onChange={(e) => updateWidget(selectedWidgetData.id, {
                                                settings: { ...selectedWidgetData.settings, rows: e.target.value ? parseInt(e.target.value) : undefined }
                                            })}
                                            className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                                        >
                                            <option value="">Auto (Based on items)</option>
                                            <option value="1">1 Row</option>
                                            <option value="2">2 Rows</option>
                                            <option value="3">3 Rows</option>
                                            <option value="4">4 Rows</option>
                                            <option value="5">5 Rows</option>
                                            <option value="6">6 Rows</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex gap-2">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
