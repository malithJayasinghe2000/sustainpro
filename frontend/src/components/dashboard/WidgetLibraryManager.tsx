'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Search, Filter, MoreVertical, Edit, Copy, Trash2,
    ChevronDown, Layers, Grid, List, CheckCircle2, XCircle,
    FolderPlus, Settings, Eye
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/Input';
import {
    WidgetDefinition,
    WidgetCategory,
    RENDER_TYPE_DEFAULTS
} from '@/types/dynamic-widgets';
import widgetDefinitionsApi from '@/lib/widget-definitions-api';
import WidgetDefinitionBuilder from './WidgetDefinitionBuilder';

// =============================================
// WIDGET LIBRARY MANAGER
// =============================================
// Main page for managing dynamic widget definitions

interface WidgetLibraryManagerProps {
    onSelect?: (definition: WidgetDefinition) => void;
    selectionMode?: boolean;
}

export default function WidgetLibraryManager({
    onSelect,
    selectionMode = false
}: WidgetLibraryManagerProps) {
    // Data
    const [definitions, setDefinitions] = useState<WidgetDefinition[]>([]);
    const [categories, setCategories] = useState<WidgetCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showDeprecated, setShowDeprecated] = useState(false);

    // UI state
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showBuilder, setShowBuilder] = useState(false);
    const [editingDefinition, setEditingDefinition] = useState<WidgetDefinition | null>(null);
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [defs, cats] = await Promise.all([
                widgetDefinitionsApi.getDefinitions({
                    category_id: selectedCategory || undefined,
                    include_deprecated: showDeprecated,
                    search: searchQuery || undefined
                }),
                widgetDefinitionsApi.getCategories()
            ]);
            setDefinitions(defs);
            setCategories(cats);
        } catch (err: any) {
            setError(err.message || 'Failed to load widgets');
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, showDeprecated, searchQuery]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Actions
    const handleCreate = async (data: Partial<WidgetDefinition>) => {
        await widgetDefinitionsApi.createDefinition(data as any);
        setShowBuilder(false);
        loadData();
    };

    const handleUpdate = async (data: Partial<WidgetDefinition>) => {
        if (!editingDefinition) return;
        await widgetDefinitionsApi.updateDefinition(editingDefinition.id, data);
        setEditingDefinition(null);
        loadData();
    };

    const handleDuplicate = async (definition: WidgetDefinition) => {
        await widgetDefinitionsApi.duplicateDefinition(definition.id);
        loadData();
    };

    const handleDelete = async (definition: WidgetDefinition) => {
        if (!confirm(`Delete widget "${definition.name}"? This cannot be undone.`)) return;
        await widgetDefinitionsApi.deleteDefinition(definition.id);
        loadData();
    };

    const handleCreateCategory = async (name: string, icon?: string, color?: string) => {
        await widgetDefinitionsApi.createCategory({ name, icon: icon || 'Folder', color });
        loadData();
    };

    // Get icon component
    const getIcon = (iconName?: string, className = 'w-5 h-5') => {
        if (!iconName) return null;
        const Icon = (LucideIcons as any)[iconName];
        return Icon ? <Icon className={className} /> : null;
    };

    // Show builder if creating or editing
    if (showBuilder || editingDefinition) {
        return (
            <WidgetDefinitionBuilder
                definition={editingDefinition || undefined}
                onSave={editingDefinition ? handleUpdate : handleCreate}
                onCancel={() => {
                    setShowBuilder(false);
                    setEditingDefinition(null);
                }}
            />
        );
    }

    // Group definitions by category
    const groupedDefinitions = categories.map(cat => ({
        category: cat,
        widgets: definitions.filter(d => d.category_id === cat.id)
    })).filter(g => g.widgets.length > 0 || selectedCategory === g.category.id);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="p-6 border-b border-border bg-card">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Widget Library</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Create and manage dynamic widgets for dashboards
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowCategoryManager(true)}
                            className="px-3 py-2 border border-border rounded-lg text-sm flex items-center gap-2 hover:bg-muted"
                        >
                            <FolderPlus className="w-4 h-4" />
                            Categories
                        </button>
                        <button
                            onClick={() => setShowBuilder(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 hover:bg-primary/90"
                        >
                            <Plus className="w-4 h-4" />
                            Create Widget
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search widgets..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm"
                        />
                    </div>

                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value || null)}
                        className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={showDeprecated}
                            onChange={(e) => setShowDeprecated(e.target.checked)}
                            className="w-4 h-4"
                        />
                        Show deprecated
                    </label>

                    <div className="flex border border-border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 ${viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 ${viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : error ? (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                        {error}
                    </div>
                ) : definitions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Layers className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">No widgets found</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery ? 'Try adjusting your search' : 'Create your first widget to get started'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setShowBuilder(true)}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                            >
                                Create Widget
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groupedDefinitions.map(({ category, widgets }) => (
                            <div key={category.id}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: category.color || '#E5E7EB' }}
                                    >
                                        {getIcon(category.icon, 'w-4 h-4')}
                                    </div>
                                    <h2 className="font-semibold">{category.name}</h2>
                                    <span className="text-sm text-muted-foreground">
                                        ({widgets.length})
                                    </span>
                                </div>

                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {widgets.map(widget => (
                                            <WidgetCard
                                                key={widget.id}
                                                widget={widget}
                                                onEdit={() => setEditingDefinition(widget)}
                                                onDuplicate={() => handleDuplicate(widget)}
                                                onDelete={() => handleDelete(widget)}
                                                onSelect={selectionMode ? () => onSelect?.(widget) : undefined}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {widgets.map(widget => (
                                            <WidgetListItem
                                                key={widget.id}
                                                widget={widget}
                                                onEdit={() => setEditingDefinition(widget)}
                                                onDuplicate={() => handleDuplicate(widget)}
                                                onDelete={() => handleDelete(widget)}
                                                onSelect={selectionMode ? () => onSelect?.(widget) : undefined}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Category Manager Modal */}
            {showCategoryManager && (
                <CategoryManagerModal
                    categories={categories}
                    onClose={() => setShowCategoryManager(false)}
                    onCreate={handleCreateCategory}
                    onRefresh={loadData}
                />
            )}
        </div>
    );
}

// =============================================
// WIDGET CARD COMPONENT
// =============================================

interface WidgetCardProps {
    widget: WidgetDefinition;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onSelect?: () => void;
}

function WidgetCard({ widget, onEdit, onDuplicate, onDelete, onSelect }: WidgetCardProps) {
    const [showMenu, setShowMenu] = useState(false);

    const Icon = widget.icon ? (LucideIcons as any)[widget.icon] : null;
    const renderDefaults = RENDER_TYPE_DEFAULTS[widget.render_type as keyof typeof RENDER_TYPE_DEFAULTS];

    return (
        <div
            className={`relative border border-border rounded-xl bg-card overflow-hidden hover:shadow-md transition-shadow ${
                onSelect ? 'cursor-pointer' : ''
            }`}
            onClick={onSelect}
        >
            {/* Preview area */}
            <div 
                className="h-32 flex items-center justify-center bg-muted/30"
                style={{ backgroundColor: widget.background_color || undefined }}
            >
                {Icon ? (
                    <Icon className="w-12 h-12" style={{ color: widget.icon_color || '#6B7280' }} />
                ) : (
                    <Layers className="w-12 h-12 text-muted-foreground" />
                )}
            </div>

            {/* Info */}
            <div className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-medium">{widget.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {renderDefaults?.label || widget.render_type}
                        </p>
                    </div>
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="p-1.5 hover:bg-muted rounded-lg"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-8 z-20 w-36 bg-card border border-border rounded-lg shadow-lg py-1">
                                    {widget.is_system ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit();
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" /> View Details
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit();
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                        >
                                            <Edit className="w-4 h-4" /> Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDuplicate();
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                    >
                                        <Copy className="w-4 h-4" /> Duplicate
                                    </button>
                                    {!widget.is_system && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete();
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {widget.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {widget.description}
                    </p>
                )}

                <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {widget.default_width}×{widget.default_height}
                    </span>
                    {widget.is_system && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            System
                        </span>
                    )}
                    {widget.is_deprecated && (
                        <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
                            Deprecated
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================
// WIDGET LIST ITEM COMPONENT
// =============================================

function WidgetListItem({ widget, onEdit, onDuplicate, onDelete, onSelect }: WidgetCardProps) {
    const Icon = widget.icon ? (LucideIcons as any)[widget.icon] : null;
    const renderDefaults = RENDER_TYPE_DEFAULTS[widget.render_type as keyof typeof RENDER_TYPE_DEFAULTS];

    return (
        <div
            className={`flex items-center gap-4 p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors ${
                onSelect ? 'cursor-pointer' : ''
            }`}
            onClick={onSelect}
        >
            <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: widget.background_color || '#F3F4F6' }}
            >
                {Icon ? (
                    <Icon className="w-6 h-6" style={{ color: widget.icon_color || '#6B7280' }} />
                ) : (
                    <Layers className="w-6 h-6 text-muted-foreground" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium">{widget.name}</h3>
                    <span className="text-xs text-muted-foreground font-mono">{widget.code}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    {renderDefaults?.label || widget.render_type} · {widget.default_width}×{widget.default_height}
                </p>
            </div>

            <div className="flex items-center gap-2">
                {widget.is_system && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">System</span>
                )}
                {widget.is_system ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-2 hover:bg-muted rounded-lg"
                        title="View Details"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-2 hover:bg-muted rounded-lg"
                        title="Edit"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                    className="p-2 hover:bg-muted rounded-lg"
                    title="Duplicate"
                >
                    <Copy className="w-4 h-4" />
                </button>
                {!widget.is_system && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

// =============================================
// CATEGORY MANAGER MODAL
// =============================================

// Preset category icons
const CATEGORY_ICONS = [
    'Folder', 'Layout', 'BarChart', 'Activity', 'Settings', 'Gauge',
    'Thermometer', 'Zap', 'Droplet', 'Wind', 'Sun', 'Bell',
    'Box', 'Grid', 'Layers', 'Monitor', 'Database', 'Radio'
];

// Preset category colors
const CATEGORY_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
    '#06B6D4', '#6366F1', '#14B8A6', '#F97316', '#84CC16', '#6B7280'
];

function CategoryManagerModal({
    categories,
    onClose,
    onCreate,
    onRefresh
}: {
    categories: WidgetCategory[];
    onClose: () => void;
    onCreate: (name: string, icon?: string, color?: string) => Promise<void>;
    onRefresh: () => void;
}) {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Folder');
    const [selectedColor, setSelectedColor] = useState('#3B82F6');
    const [creating, setCreating] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const handleCreate = async () => {
        if (!newCategoryName.trim()) return;
        setCreating(true);
        try {
            await onCreate(newCategoryName.trim(), selectedIcon, selectedColor);
            setNewCategoryName('');
            setSelectedIcon('Folder');
            setSelectedColor('#3B82F6');
            onRefresh();
        } finally {
            setCreating(false);
        }
    };

    const SelectedIconComponent = (LucideIcons as any)[selectedIcon];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold">Manage Categories</h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded">
                        <LucideIcons.X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 border-b border-border">
                    <label className="block text-sm font-medium mb-2">Create New Category</label>
                    <div className="flex gap-2 mb-3">
                        <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Category name..."
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            className="flex-1"
                        />
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                        {/* Icon Picker */}
                        <div className="relative">
                            <label className="block text-xs text-muted-foreground mb-1">Icon</label>
                            <button
                                type="button"
                                onClick={() => { setShowIconPicker(!showIconPicker); setShowColorPicker(false); }}
                                className="w-12 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                            >
                                {SelectedIconComponent && <SelectedIconComponent className="w-5 h-5" />}
                            </button>
                            {showIconPicker && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowIconPicker(false)} />
                                    <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-xl p-2 grid grid-cols-6 gap-1 w-48">
                                        {CATEGORY_ICONS.map(iconName => {
                                            const IconComponent = (LucideIcons as any)[iconName];
                                            return IconComponent ? (
                                                <button
                                                    key={iconName}
                                                    type="button"
                                                    onClick={() => { setSelectedIcon(iconName); setShowIconPicker(false); }}
                                                    className={`p-2 rounded hover:bg-muted ${selectedIcon === iconName ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
                                                    title={iconName}
                                                >
                                                    <IconComponent className="w-4 h-4" />
                                                </button>
                                            ) : null;
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Color Picker */}
                        <div className="relative">
                            <label className="block text-xs text-muted-foreground mb-1">Color</label>
                            <button
                                type="button"
                                onClick={() => { setShowColorPicker(!showColorPicker); setShowIconPicker(false); }}
                                className="w-12 h-10 rounded-lg border border-border flex items-center justify-center hover:ring-2 ring-primary/20"
                                style={{ backgroundColor: selectedColor }}
                            />
                            {showColorPicker && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
                                    <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-xl p-2 grid grid-cols-6 gap-1 w-48">
                                        {CATEGORY_COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => { setSelectedColor(color); setShowColorPicker(false); }}
                                                className={`w-6 h-6 rounded ${selectedColor === color ? 'ring-2 ring-primary' : ''}`}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Preview */}
                        <div className="flex-1">
                            <label className="block text-xs text-muted-foreground mb-1">Preview</label>
                            <div
                                className="h-10 px-3 rounded-lg flex items-center gap-2 text-sm font-medium"
                                style={{ backgroundColor: selectedColor + '20', color: selectedColor }}
                            >
                                {SelectedIconComponent && <SelectedIconComponent className="w-4 h-4" />}
                                {newCategoryName || 'Category Name'}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={creating || !newCategoryName.trim()}
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Category
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-60">
                    <label className="block text-sm font-medium mb-3">Existing Categories</label>
                    {categories.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            No categories yet
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="flex items-center gap-3 p-3 border border-border rounded-lg"
                                >
                                    <div
                                        className="w-8 h-8 rounded flex items-center justify-center text-white"
                                        style={{ backgroundColor: cat.color || '#6B7280' }}
                                    >
                                        {(() => {
                                            const Icon = (LucideIcons as any)[cat.icon || 'Folder'];
                                            return Icon ? <Icon className="w-4 h-4" /> : null;
                                        })()}
                                    </div>
                                    <span className="flex-1 font-medium">{cat.name}</span>
                                    {!cat.organization_id && (
                                        <span className="text-xs text-muted-foreground">System</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
