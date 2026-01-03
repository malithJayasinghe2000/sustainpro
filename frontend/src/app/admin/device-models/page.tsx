'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, X, Save, Activity, Zap, Droplet, Thermometer, Wind, Gauge, Battery, Clock, Pencil, Leaf, Sun, Cloud, Factory, Recycle, Flame, ChevronDown, Cpu, Wifi, Waves, Component } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import TimeDisplay from '@/components/TimeDisplay';
import { deviceModelsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import StatsCard from '@/components/StatsCard';


interface DeviceModel {
    id: string;
    name: string;
    description: string;
    parameters: ParameterDefinition[];
    created_at: string;
    updated_at: string;
}

interface ParameterDefinition {
    key: string;
    name: string;
    unit: string;
    dataType: 'float' | 'integer' | 'string' | 'boolean';
    category?: 'main' | 'common'; // main = live sensor data, common = calculated values
    min?: number;
    max?: number;
    icon?: string;
}

const COMMON_UNITS = [
    { label: 'Custom', value: 'custom' },
    { label: 'Temperature (°C)', value: '°C' },
    { label: 'Temperature (°F)', value: '°F' },
    { label: 'Humidity (%)', value: '%' },
    { label: 'Voltage (V)', value: 'V' },
    { label: 'Current (A)', value: 'A' },
    { label: 'Power (W)', value: 'W' },
    { label: 'Energy (kWh)', value: 'kWh' },
    { label: 'Pressure (hPa)', value: 'hPa' },
    { label: 'Pressure (PSI)', value: 'PSI' },
    { label: 'Speed (m/s)', value: 'm/s' },
    { label: 'Speed (km/h)', value: 'km/h' },
    { label: 'Volume (L)', value: 'L' },
    { label: 'Flow Rate (L/min)', value: 'L/min' },
    { label: 'CO2 (ppm)', value: 'ppm' },
    { label: 'PM2.5 (µg/m³)', value: 'µg/m³' },
    { label: 'AQI', value: 'AQI' },
    { label: 'Saved (kgCO2)', value: 'kgCO2' },
];

const AVAILABLE_ICONS = [
    { name: 'Thermometer', component: Thermometer },
    { name: 'Droplet', component: Droplet },
    { name: 'Zap', component: Zap },
    { name: 'Gauge', component: Gauge },
    { name: 'Activity', component: Activity },
    { name: 'Wind', component: Wind },
    { name: 'Battery', component: Battery },
    { name: 'Cpu', component: Cpu },
    { name: 'Wifi', component: Wifi },
    { name: 'Waves', component: Waves },
    { name: 'Leaf', component: Leaf },
    { name: 'Sun', component: Sun },
    { name: 'Cloud', component: Cloud },
    { name: 'Factory', component: Factory },
    { name: 'Recycle', component: Recycle },
    { name: 'Flame', component: Flame },
];

export default function DeviceModelsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [models, setModels] = useState<DeviceModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [openIconSelector, setOpenIconSelector] = useState<number | null>(null);

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [modelToDelete, setModelToDelete] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<DeviceModel>>({
        id: '',
        name: '',
        description: '',
        parameters: []
    });

    useEffect(() => {
        fetchModels();
    }, []);

    // Close icon selector when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenIconSelector(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchModels = async () => {
        try {
            const data = await deviceModelsApi.getAll();
            setModels(data);
        } catch (error) {
            toast.error('Failed to fetch device models');
        } finally {
            setIsLoading(false);
        }
    };

    // Restrict to Super Admin Only
    if (!user?.is_super_admin) {
        return null;
    }

    const canEdit = true; // Super admins have full access
    const canDelete = true;

    const handleOpenModal = (model?: DeviceModel) => {
        if (model) {
            // For edit, we'll implement later or keep modal
            // For now, just show a toast
            toast.error('Edit functionality coming soon!');
        } else {
            // Navigate to creation wizard
            router.push('/admin/device-models/new');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await deviceModelsApi.update(formData.id!, formData);
                toast.success('Device model updated');
            } else {
                await deviceModelsApi.create(formData);
                toast.success('Device model created');
            }
            setIsModalOpen(false);
            fetchModels();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async (id: string) => {
        setModelToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!modelToDelete) return;
        try {
            await deviceModelsApi.delete(modelToDelete);
            toast.success('Device model deleted');
            fetchModels();
        } catch (error) {
            toast.error('Failed to delete model');
        } finally {
            setDeleteConfirmOpen(false);
            setModelToDelete(null);
        }
    };

    const cancelDelete = () => {
        setDeleteConfirmOpen(false);
        setModelToDelete(null);
    };

    // Parameter Builder Logic
    const addParameter = () => {
        const newParam: ParameterDefinition = { key: '', name: '', unit: '', dataType: 'float', category: 'main', icon: 'Activity' };
        setFormData({ ...formData, parameters: [...(formData.parameters || []), newParam] });
    };

    const updateParameter = (index: number, field: keyof ParameterDefinition, value: any) => {
        const newParams = [...(formData.parameters || [])];
        newParams[index] = { ...newParams[index], [field]: value };
        setFormData({ ...formData, parameters: newParams });
    };

    const removeParameter = (index: number) => {
        const newParams = [...(formData.parameters || [])];
        newParams.splice(index, 1);
        setFormData({ ...formData, parameters: newParams });
    };

    const handleIconSelect = (index: number, iconName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        updateParameter(index, 'icon', iconName);
        setOpenIconSelector(null);
    };

    const toggleIconSelector = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setOpenIconSelector(openIconSelector === index ? null : index);
    };

    const filteredModels = models.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                <Toaster position="bottom-right" />
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title">
                            <Component className="w-6 h-6 text-primary" />
                            Device Models
                        </h1>
                        <p className="page-header-subtext">
                            Define templates and sensor parameters for your IoT devices.
                        </p>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="btn-primary"
                        >
                            <Plus className="w-4 h-4" />
                            Create Model
                        </button>
                    )}
                </div>

                {/* Search - Organizations Style */}
                <div className="relative w-full max-w-2xl">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Component className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        placeholder="Global Search Engine... (Name, ID, Parameters)"
                        className="block w-full pl-10 pr-3 py-3 border border-border/40 rounded-xl leading-5 bg-muted/30 placeholder-muted-foreground/60 focus:outline-none focus:bg-card focus:ring-1 focus:ring-primary/20 focus:border-primary/50 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Total Models"
                        value={models.length}
                        subtext="Device templates"
                        icon={Component}
                        intent="primary"
                    />
                    <StatsCard
                        title="Total Parameters"
                        value={models.reduce((acc, m) => acc + (m.parameters?.length || 0), 0)}
                        subtext="Sensor data points"
                        icon={Activity}
                        intent="default"
                    />
                    <StatsCard
                        title="Recent Updates"
                        value={models.filter(m => {
                            const dayAgo = new Date();
                            dayAgo.setDate(dayAgo.getDate() - 1);
                            return new Date(m.updated_at) > dayAgo;
                        }).length}
                        subtext="Last 24 hours"
                        icon={Clock}
                        intent="success"
                    />
                    <StatsCard
                        title="Avg Parameters"
                        value={models.length > 0
                            ? Math.round(models.reduce((acc, m) => acc + (m.parameters?.length || 0), 0) / models.length)
                            : 0}
                        subtext="Per model"
                        icon={Gauge}
                        intent="warning"
                    />
                </div>

                {/* Section Separator */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent my-8 opacity-60" />

                {/* Card Grid View */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading device models...</p>
                        </div>
                    </div>
                ) : filteredModels.length === 0 ? (
                    <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Component className="w-8 h-8 text-muted-foreground opacity-50" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Device Models Found</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                {searchQuery
                                    ? "No models match your search. Try adjusting your filters."
                                    : "Get started by creating your first device model template."}
                            </p>
                            {canEdit && !searchQuery && (
                                <button onClick={() => handleOpenModal()} className="btn-primary">
                                    <Plus className="w-4 h-4" />
                                    Create First Model
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Add New Model Card - First Item */}
                        {canEdit && (
                            <button
                                onClick={() => handleOpenModal()}
                                className="group relative flex flex-col items-center justify-center h-full min-h-[320px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-300 gap-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                    <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-semibold text-foreground">Add New Model</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Create a device template</p>
                                </div>
                            </button>
                        )}

                        {/* Model Cards */}
                        {filteredModels.map(model => {
                            const IconComponent = model.parameters?.[0]?.icon
                                ? AVAILABLE_ICONS.find(i => i.name === model.parameters[0].icon)?.component
                                : Component;
                            const Icon = IconComponent || Component;

                            return (
                                <div
                                    key={model.id}
                                    className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all group"
                                >
                                    {/* Card Header */}
                                    <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-6 border-b border-border">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 bg-background rounded-lg border border-border">
                                                        <Icon className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                                                        {model.id}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                                                    {model.name}
                                                </h3>
                                                {model.description && (
                                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                                        {model.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Activity className="w-3.5 h-3.5" />
                                                <span>{model.parameters?.length || 0} parameters</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                <TimeDisplay timestamp={model.updated_at} format="relative" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parameters Preview */}
                                    <div className="p-4 bg-muted/30">
                                        {model.parameters && model.parameters.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                                    Parameters
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {model.parameters.slice(0, 6).map((param, idx) => {
                                                        const ParamIcon = AVAILABLE_ICONS.find(i => i.name === param.icon)?.component || Activity;
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2.5 py-1.5 text-xs"
                                                                title={`${param.name} (${param.unit})`}
                                                            >
                                                                <ParamIcon className="w-3.5 h-3.5 text-primary" />
                                                                <span className="font-medium text-foreground">{param.key}</span>
                                                                {param.unit && (
                                                                    <span className="text-muted-foreground">· {param.unit}</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {model.parameters.length > 6 && (
                                                        <div className="flex items-center px-2.5 py-1.5 text-xs text-muted-foreground">
                                                            +{model.parameters.length - 6} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">No parameters defined</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="p-4 bg-card border-t border-border flex items-center justify-between">
                                        <div className="text-xs text-muted-foreground">
                                            <TimeDisplay timestamp={model.updated_at} format="long" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleOpenModal(model)}
                                                    className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-primary transition-all"
                                                    title="Edit Model"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(model.id)}
                                                    className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-all"
                                                    title="Delete Model"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Create/Edit Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={isEditing ? 'Edit Device Model' : 'Create New Model'}
                    size="lg"
                    footer={
                        <>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                            <button type="submit" form="device-model-form" className="btn-primary">
                                <Save className="w-4 h-4" />
                                {isEditing ? 'Save Changes' : 'Create Model'}
                            </button>
                        </>
                    }
                >
                    <form id="device-model-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Model ID (Unique)</label>
                                <input
                                    required
                                    disabled={isEditing}
                                    value={formData.id}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    placeholder="e.g. dm_weather_v1"
                                />
                                <p className="text-xs text-muted-foreground">Used by devices to link to this template.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Display Name</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    placeholder="e.g. Weather Station Pro"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-2 rounded-md border border-input bg-background h-20"
                                    placeholder="Describe the capabilities of this device..."
                                />
                            </div>
                        </div>

                        {/* Dynamic Parameter Builder */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold flex items-center gap-2">
                                    <Component className="w-4 h-4" />
                                    Data Parameters
                                </label>
                                <button type="button" onClick={addParameter} className="btn-link">
                                    <Plus className="w-3 h-3" /> Add Parameter
                                </button>
                            </div>

                            <div className="border border-border rounded-xl overflow-hidden bg-card flex flex-col">
                                <div className="overflow-x-auto overflow-y-auto max-h-[300px] custom-scrollbar">
                                    <table className="w-full text-left text-sm min-w-[600px]">
                                        <thead className="bg-muted border-b border-border text-foreground font-semibold sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-3 w-14 text-center text-xs uppercase tracking-wider bg-muted">Icon</th>
                                                <th className="px-3 py-3 text-xs uppercase tracking-wider bg-muted">Key</th>
                                                <th className="px-3 py-3 text-xs uppercase tracking-wider bg-muted">Display Name</th>
                                                <th className="px-3 py-3 w-32 text-xs uppercase tracking-wider bg-muted">Type</th>
                                                <th className="px-3 py-3 w-32 text-xs uppercase tracking-wider bg-muted">Category</th>
                                                <th className="px-3 py-3 w-40 text-xs uppercase tracking-wider bg-muted">Unit</th>
                                                <th className="px-3 py-3 w-12 text-xs uppercase tracking-wider bg-muted"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50 bg-white dark:bg-background">
                                            {formData.parameters?.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                                                        <div className="flex flex-col items-center justify-center gap-2">
                                                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                                                <Activity className="w-6 h-6 opacity-20" />
                                                            </div>
                                                            <p className="text-sm">No parameters added.</p>
                                                            <p className="text-xs opacity-60">Click "Add Parameter" to start.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {formData.parameters?.map((param, idx) => {
                                                const SelectedIcon = AVAILABLE_ICONS.find(i => i.name === param.icon)?.component || Activity;
                                                return (
                                                    <tr key={idx} className="group hover:bg-muted/20 transition-colors">
                                                        {/* Icon Selector */}
                                                        <td className="px-3 py-2 text-center relative">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => toggleIconSelector(idx, e)}
                                                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted hover:text-primary transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                title="Change Icon"
                                                            >
                                                                <SelectedIcon className="w-4 h-4" />
                                                            </button>
                                                        </td>

                                                        {/* Key */}
                                                        <td className="px-3 py-2">
                                                            <input
                                                                placeholder="e.g. temp_c"
                                                                value={param.key}
                                                                onChange={e => updateParameter(idx, 'key', e.target.value)}
                                                                className="w-full px-3 py-1.5 h-9 text-sm rounded-md border border-border bg-background hover:bg-muted/20 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono placeholder:text-muted-foreground/40"
                                                                required
                                                            />
                                                        </td>

                                                        {/* Display Name */}
                                                        <td className="px-3 py-2">
                                                            <input
                                                                placeholder="e.g. Temperature"
                                                                value={param.name}
                                                                onChange={e => updateParameter(idx, 'name', e.target.value)}
                                                                className="w-full px-3 py-1.5 h-9 text-sm rounded-md border border-border bg-background hover:bg-muted/20 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/40"
                                                                required
                                                            />
                                                        </td>

                                                        {/* Data Type */}
                                                        <td className="px-3 py-2">
                                                            <div className="relative">
                                                                <select
                                                                    value={param.dataType}
                                                                    onChange={e => updateParameter(idx, 'dataType', e.target.value)}
                                                                    className="w-full pl-3 pr-8 py-1.5 h-9 text-sm rounded-md border border-border bg-background hover:bg-muted/20 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                                                                >
                                                                    <option value="float">Float (1.2)</option>
                                                                    <option value="integer">Integer (10)</option>
                                                                    <option value="string">String (Text)</option>
                                                                    <option value="boolean">Boolean (T/F)</option>
                                                                </select>
                                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                                                    <ChevronDown className="w-3 h-3" />
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Category */}
                                                        <td className="px-3 py-2">
                                                            <div className="relative">
                                                                <select
                                                                    value={param.category || 'main'}
                                                                    onChange={e => updateParameter(idx, 'category', e.target.value)}
                                                                    className="w-full pl-3 pr-8 py-1.5 h-9 text-sm rounded-md border border-border bg-background hover:bg-muted/20 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                                                                >
                                                                    <option value="main">Main</option>
                                                                    <option value="common">Common</option>
                                                                </select>
                                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                                                    <ChevronDown className="w-3 h-3" />
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Unit */}
                                                        <td className="px-3 py-2">
                                                            <div className="relative group/unit">
                                                                {(!COMMON_UNITS.some(u => u.value === param.unit) && param.unit !== '') || param.unit === '' ? (
                                                                    <div className="relative w-full">
                                                                        <input
                                                                            placeholder="Custom"
                                                                            value={param.unit}
                                                                            onChange={e => updateParameter(idx, 'unit', e.target.value)}
                                                                            className="w-full px-3 py-1.5 pr-8 h-9 text-sm rounded-md border border-border bg-background hover:bg-muted/20 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateParameter(idx, 'unit', '°C')}
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted-foreground/10 rounded-full text-muted-foreground transition-colors"
                                                                            title="Reset to list"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="relative w-full">
                                                                        <select
                                                                            value={param.unit}
                                                                            onChange={e => {
                                                                                if (e.target.value === 'custom') {
                                                                                    updateParameter(idx, 'unit', '');
                                                                                } else {
                                                                                    updateParameter(idx, 'unit', e.target.value);
                                                                                }
                                                                            }}
                                                                            className="w-full pl-3 pr-8 py-1.5 h-9 text-sm rounded-md border border-border bg-background hover:bg-muted/20 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                                                                        >
                                                                            {COMMON_UNITS.map(u => (
                                                                                <option key={u.value} value={u.value}>{u.label}</option>
                                                                            ))}
                                                                            <option value="custom" className="font-semibold text-primary">+ Custom Unit</option>
                                                                        </select>
                                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                                                            <ChevronDown className="w-3 h-3" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Delete */}
                                                        <td className="px-3 py-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeParameter(idx)}
                                                                className="p-2 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                title="Remove Parameter"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </form>
                </Modal>
                {/* Icon Picker Modal */}
                {openIconSelector !== null && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]" onClick={() => setOpenIconSelector(null)}>
                        <div className="bg-background border border-border rounded-xl shadow-2xl p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold">Select Icon</h3>
                                <button onClick={() => setOpenIconSelector(null)} className="p-1 hover:bg-muted rounded-full"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="grid grid-cols-6 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                {AVAILABLE_ICONS.map(icon => {
                                    const IconComp = icon.component;
                                    const isSelected = formData.parameters?.[openIconSelector]?.icon === icon.name;
                                    return (
                                        <button
                                            key={icon.name}
                                            type="button"
                                            onClick={(e) => handleIconSelect(openIconSelector, icon.name, e)}
                                            className={`p-3 rounded-lg hover:bg-muted flex items-center justify-center transition-all ${isSelected ? 'bg-primary/10 text-primary ring-1 ring-primary' : 'bg-secondary/50 text-muted-foreground'}`}
                                            title={icon.name}
                                        >
                                            <IconComp className="w-5 h-5" />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={deleteConfirmOpen}
                    onClose={cancelDelete}
                    title="Delete Device Model"
                    size="sm"
                    variant="destructive"
                >
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 rounded-full bg-destructive/10">
                                <Trash2 className="w-6 h-6 text-destructive" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">
                                    Are you sure you want to delete this model? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-4">
                            <button
                                onClick={cancelDelete}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
