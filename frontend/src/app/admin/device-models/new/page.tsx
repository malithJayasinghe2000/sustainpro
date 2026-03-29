'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import SetupWizard from '@/components/SetupWizard';
import { RichSelect } from '@/components/ui/RichSelect';
import { Input } from '@/components/ui/Input';
import { deviceModelsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Activity, Thermometer, Droplet, Zap, Gauge, Wind, Battery, Cpu, Wifi, Waves, Leaf, Sun, Cloud, Factory, Recycle, Flame, Component } from 'lucide-react';

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

const COMMON_UNITS = [
    { value: 'custom', label: 'Custom' },
    { value: '°C', label: 'Temperature (°C)' },
    { value: '°F', label: 'Temperature (°F)' },
    { value: '%', label: 'Humidity (%)' },
    { value: 'V', label: 'Voltage (V)' },
    { value: 'A', label: 'Current (A)' },
    { value: 'W', label: 'Power (W)' },
    { value: 'kWh', label: 'Energy (kWh)' },
    { value: 'hPa', label: 'Pressure (hPa)' },
    { value: 'PSI', label: 'Pressure (PSI)' },
    { value: 'm/s', label: 'Speed (m/s)' },
    { value: 'km/h', label: 'Speed (km/h)' },
    { value: 'L', label: 'Volume (L)' },
    { value: 'L/min', label: 'Flow Rate (L/min)' },
    { value: 'ppm', label: 'CO2 (ppm)' },
    { value: 'µg/m³', label: 'PM2.5 (µg/m³)' },
    { value: 'AQI', label: 'AQI' },
    { value: 'kgCO2', label: 'Saved (kgCO2)' },
];

const DATA_TYPES = [
    { value: 'float', label: 'Float (1.2)' },
    { value: 'integer', label: 'Integer (10)' },
    { value: 'string', label: 'String (Text)' },
    { value: 'boolean', label: 'Boolean (T/F)' },
];

const CATEGORIES = [
    { value: 'main', label: 'Main' },
    { value: 'common', label: 'Common' },
];

interface ParameterDefinition {
    key: string;
    name: string;
    unit: string;
    dataType: 'float' | 'integer' | 'string' | 'boolean';
    category?: 'main' | 'common';
    min?: number;
    max?: number;
    icon?: string;
}

export default function NewDeviceModelPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Form Data
    const [modelId, setModelId] = useState('');
    const [modelName, setModelName] = useState('');
    const [description, setDescription] = useState('');
    const [parameters, setParameters] = useState<ParameterDefinition[]>([]);
    const [customUnit, setCustomUnit] = useState<{ [key: number]: string }>({});

    const steps = [
        { id: '1', label: 'Basic Info' },
        { id: '2', label: 'Parameters' },
        { id: '3', label: 'Review' },
    ];

    const handleNext = () => {
        // Validation per step
        if (currentStep === 0) {
            if (!modelId?.trim()) {
                toast.error('Model ID is required');
                return;
            }
            // Validate Model ID format (alphanumeric and underscores only)
            if (!/^[A-Za-z0-9_-]+$/.test(modelId)) {
                toast.error('Model ID can only contain letters, numbers, underscores, and hyphens');
                return;
            }
            if (!modelName?.trim()) {
                toast.error('Display Name is required');
                return;
            }
        }

        if (currentStep === 1) {
            if (parameters.length === 0) {
                toast.error('Please add at least one parameter');
                return;
            }
            // Validate each parameter
            for (let i = 0; i < parameters.length; i++) {
                const param = parameters[i];
                if (!param.key?.trim()) {
                    toast.error(`Parameter ${i + 1}: Key is required`);
                    return;
                }
                if (!/^[A-Za-z0-9_]+$/.test(param.key)) {
                    toast.error(`Parameter ${i + 1}: Key can only contain letters, numbers, and underscores`);
                    return;
                }
                if (!param.name?.trim()) {
                    toast.error(`Parameter ${i + 1}: Name is required`);
                    return;
                }
            }
        }

        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            await deviceModelsApi.create({
                id: modelId,
                name: modelName,
                description,
                parameters,
            });
            toast.success('Device model created successfully!');
            router.push('/admin/device-models');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create device model');
        } finally {
            setIsLoading(false);
        }
    };

    const addParameter = () => {
        setParameters([...parameters, {
            key: '',
            name: '',
            unit: '',
            dataType: 'float',
            category: 'main',
            icon: 'Activity'
        }]);
    };

    const updateParameter = (index: number, field: keyof ParameterDefinition, value: any) => {
        const newParams = [...parameters];
        newParams[index] = { ...newParams[index], [field]: value };
        setParameters(newParams);
    };

    const removeParameter = (index: number) => {
        const newParams = [...parameters];
        newParams.splice(index, 1);
        setParameters(newParams);
    };

    return (
        <DashboardLayout>
            <SetupWizard
                title="Create Device Model"
                description="Define a new IoT device template with sensor parameters"
                breadcrumbs={[
                    { label: 'Device Models', href: '/admin/device-models' },
                    { label: 'Create New', href: '/admin/device-models/new' },
                ]}
                steps={steps}
                currentStep={currentStep}
                onNext={handleNext}
                onBack={handleBack}
                isLastStep={currentStep === steps.length - 1}
                isLoading={isLoading}
                onCancel={() => router.push('/admin/device-models')}
            >
                {/* Step 1: Basic Info */}
                {currentStep === 0 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Enter the basic details for your device model template.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Model ID (Unique) *"
                                placeholder="e.g. SPS_WV01"
                                value={modelId}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModelId(e.target.value)}
                                required
                            />
                            <Input
                                label="Display Name *"
                                placeholder="e.g. Weather Station Pro"
                                value={modelName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModelName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Description</label>
                            <textarea
                                value={description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                                className="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                rows={4}
                                placeholder="Describe the capabilities of this device..."
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Parameters */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Component className="w-5 h-5" />
                                    Data Parameters
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Define the sensor data points this model will report.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addParameter}
                                className="btn-primary"
                            >
                                <Plus className="w-4 h-4" />
                                Add Parameter
                            </button>
                        </div>

                        {parameters.length === 0 ? (
                            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
                                <Component className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground">No parameters added yet.</p>
                                <p className="text-xs text-muted-foreground mt-1">Click "Add Parameter" to start.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {parameters.map((param, idx) => {
                                    // available icons is global constant
                                    return (
                                        <div key={idx} className="group relative bg-card border border-border rounded-lg p-4 hover:shadow-sm hover:border-primary/30 transition-all">
                                            <button
                                                type="button"
                                                onClick={() => removeParameter(idx)}
                                                className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove Parameter"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                            <div className="grid grid-cols-12 gap-4 items-start pr-8">
                                                {/* Icon Col */}
                                                <div className="col-span-12 sm:col-span-2 lg:col-span-1">
                                                    <RichSelect
                                                        label="Icon"
                                                        value={param.icon || 'Activity'}
                                                        onChange={(val) => updateParameter(idx, 'icon', val)}
                                                        options={AVAILABLE_ICONS.map(i => ({
                                                            value: i.name,
                                                            label: '', // Hide label for compactness
                                                            icon: i.component
                                                        }))}
                                                        className="min-w-[60px]"
                                                        placeholder="Icon"
                                                    />
                                                </div>

                                                {/* Main Fields */}
                                                <div className="col-span-12 sm:col-span-10 lg:col-span-11 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                                    <div className="lg:col-span-1">
                                                        <Input
                                                            label="Key"
                                                            placeholder="e.g. temp"
                                                            value={param.key}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateParameter(idx, 'key', e.target.value)}
                                                            required
                                                            className="h-10"
                                                        />
                                                    </div>
                                                    <div className="lg:col-span-1">
                                                        <Input
                                                            label="Name"
                                                            placeholder="Display Name"
                                                            value={param.name}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateParameter(idx, 'name', e.target.value)}
                                                            required
                                                            className="h-10"
                                                        />
                                                    </div>
                                                    <div className="lg:col-span-1">
                                                        <RichSelect
                                                            label="Data Type"
                                                            value={param.dataType}
                                                            onChange={(val) => updateParameter(idx, 'dataType', val)}
                                                            options={DATA_TYPES}
                                                            icon={Activity}
                                                        />
                                                    </div>
                                                    <div className="lg:col-span-1">
                                                        {customUnit[idx] ? (
                                                            <Input
                                                                label="Unit"
                                                                placeholder="Custom"
                                                                value={param.unit}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateParameter(idx, 'unit', e.target.value)}
                                                            />
                                                        ) : (
                                                            <RichSelect
                                                                label="Unit"
                                                                value={param.unit || 'custom'}
                                                                onChange={(val) => {
                                                                    if (val === 'custom') {
                                                                        setCustomUnit({ ...customUnit, [idx]: 'true' });
                                                                        updateParameter(idx, 'unit', '');
                                                                    } else {
                                                                        updateParameter(idx, 'unit', val);
                                                                    }
                                                                }}
                                                                options={COMMON_UNITS}
                                                                icon={Gauge}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="lg:col-span-1">
                                                        <RichSelect
                                                            label="Category"
                                                            value={param.category || 'main'}
                                                            onChange={(val) => updateParameter(idx, 'category', val)}
                                                            options={CATEGORIES}
                                                            icon={Component}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Review */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-4">Review & Create</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Review your device model configuration before creating.
                            </p>
                        </div>

                        <div className="bg-muted/30 border border-border rounded-xl p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Model ID</p>
                                        <p className="font-mono text-sm">{modelId || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Display Name</p>
                                        <p className="text-sm font-medium">{modelName || '—'}</p>
                                    </div>
                                </div>
                                {description && (
                                    <div className="mt-3">
                                        <p className="text-xs text-muted-foreground">Description</p>
                                        <p className="text-sm mt-1">{description}</p>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-border pt-4">
                                <h3 className="text-sm font-medium text-muted-foreground mb-3">Parameters ({parameters.length})</h3>
                                {parameters.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No parameters defined</p>
                                ) : (
                                    <div className="space-y-2">
                                        {parameters.map((param, idx) => {
                                            const IconComponent = AVAILABLE_ICONS.find(i => i.name === param.icon)?.component || Activity;
                                            return (
                                                <div key={idx} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                                                    <IconComponent className="w-4 h-4 text-primary" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{param.name || param.key}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {param.key} • {param.dataType} • {param.unit || 'no unit'}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary">
                                                        {param.category}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </SetupWizard>
        </DashboardLayout>
    );
}
