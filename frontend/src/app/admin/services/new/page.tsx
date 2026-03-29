'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import SetupWizard from '@/components/SetupWizard';
import { RichSelect } from '@/components/ui/RichSelect';
import { Input } from '@/components/ui/Input';
import { servicesApi, deviceModelsApi, uploadApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Layers, Globe, Lock, Building2, Plus, Trash2, Cpu, Activity, Square, CheckSquare, Upload, ImageIcon, X } from 'lucide-react';
import Image from 'next/image';
import { ServiceParameter } from '@/types/dashboard';

const SCOPE_OPTIONS = [
    { value: 'GLOBAL', label: 'Global Service', description: 'Available to all Organizations (e.g. Standard Water Mon)', icon: Globe },
    { value: 'INTERNAL', label: 'Internal Only', description: 'Restricted to SustainPro Operations', icon: Lock },
    { value: 'ORG_SPECIFIC', label: 'Organization Specific', description: 'Custom service for a single client', icon: Building2 },
];

const SERVICE_TYPE_OPTIONS = [
    { value: 'GLOBAL', label: 'Global Template', description: 'Standard service template used across organizations' },
    { value: 'INTERNAL', label: 'Internal Template', description: 'Private template for internal use only' },
];

const AGGREGATION_TYPES = ['SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'LATEST'];
const DATA_TYPES = ['number', 'string', 'boolean'];

export default function NewServicePage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data Loading
    const [availableDeviceModels, setAvailableDeviceModels] = useState<any[]>([]);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState('GLOBAL');
    const [serviceType, setServiceType] = useState<'GLOBAL' | 'INTERNAL'>('GLOBAL');
    const [isPublic, setIsPublic] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Service Parameters for aggregation
    const [serviceParameters, setServiceParameters] = useState<ServiceParameter[]>([]);

    // Linked Device Models
    const [serviceDeviceModels, setServiceDeviceModels] = useState<{ id: string; role: string; min_count: number; max_count: number }[]>([]);

    const steps = [
        { id: '1', label: 'Service Profile' },
        { id: '2', label: 'Device Models' },
        { id: '3', label: 'Parameters' },
        { id: '4', label: 'Review' },
    ];

    useEffect(() => {
        loadDeviceModels();
    }, []);

    const loadDeviceModels = async () => {
        try {
            const res = await deviceModelsApi.getAll();
            // API returns the array directly or inside data property depending on implementation
            // Based on api.ts it returns response.data.data, so res IS the array
            setAvailableDeviceModels(Array.isArray(res) ? res : (res?.data || []));
        } catch (error) {
            console.error('Failed to load device models', error);
            toast.error('Failed to load device models');
        }
    };

    const handleNext = () => {
        // Validation per step
        if (currentStep === 0) {
            if (!name?.trim()) {
                toast.error('Service name is required');
                return;
            }
            if (!scope) {
                toast.error('Please select a service scope');
                return;
            }
        }

        if (currentStep === 1) {
            if (serviceDeviceModels.length === 0) {
                toast.error('Please select at least one device model');
                return;
            }
        }

        if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const toggleDeviceModel = (modelId: string) => {
        if (serviceDeviceModels.find(m => m.id === modelId)) {
            setServiceDeviceModels(prev => prev.filter(m => m.id !== modelId));
        } else {
            setServiceDeviceModels(prev => [...prev, { id: modelId, role: 'main', min_count: 1, max_count: 10 }]);
        }
    };

    const updateDeviceModelConfig = (modelId: string, field: string, value: any) => {
        setServiceDeviceModels(prev => prev.map(m =>
            m.id === modelId ? { ...m, [field]: value } : m
        ));
    };

    // Image upload handler
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        try {
            const result = await uploadApi.uploadImage(file);
            setImageUrl(result.url);
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Failed to upload image', error);
            toast.error('Failed to upload image');
        } finally {
            setIsUploadingImage(false);
        }
    };

    // Service parameter handlers
    const addServiceParameter = () => {
        setServiceParameters(prev => [...prev, {
            key: `param_${Date.now()}`,
            name: '',
            dataType: 'number',
            unit: '',
            aggregation: 'LATEST',
        }]);
    };

    const updateServiceParameter = (index: number, field: keyof ServiceParameter, value: any) => {
        setServiceParameters(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    };

    const removeServiceParameter = (index: number) => {
        setServiceParameters(prev => prev.filter((_, i) => i !== index));
    };

    // Auto-generate parameters from selected device models
    const autoGenerateParameters = () => {
        const params: ServiceParameter[] = [];
        serviceDeviceModels.forEach(sdm => {
            const model = availableDeviceModels.find(m => m.id === sdm.id);
            if (model?.parameters) {
                model.parameters.forEach((p: any) => {
                    // Avoid duplicates
                    if (!params.find(ep => ep.key === p.key)) {
                        params.push({
                            key: p.key,
                            name: p.name,
                            dataType: p.data_type || 'number',
                            unit: p.unit || '',
                            aggregation: 'LATEST',
                            sourceParam: p.key,
                        });
                    }
                });
            }
        });
        setServiceParameters(params);
        toast.success(`Generated ${params.length} parameters from device models`);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            console.log('🚀 SUBMITTING SERVICE:', { name, scope, service_type: serviceType, device_models: serviceDeviceModels, isPublic });
            const response = await servicesApi.create({
                name,
                description,
                category: scope, // Map scope to category
                service_type: serviceType,
                image_url: imageUrl || null,
                has_public_dashboard: isPublic, // Correct field name for backend
                service_parameters: serviceParameters,
                config_schema: {},
                default_config: {},
                is_public: true, // Template visibility
                device_models: serviceDeviceModels.map(m => ({
                    device_model_id: m.id,
                    role: m.role,
                    min_devices: m.min_count, // Correct field name
                    max_devices: m.max_count, // Correct field name
                    is_required: true
                }))
            });
            toast.success('Service created successfully!');
            // Navigate to dashboard builder for the new service
            if (response.data?.id) {
                router.push(`/admin/services/${response.data.id}/dashboard`);
            } else {
                router.push('/admin/services');
            }
        } catch (error: any) {
            console.error('❌ SERVICE CREATION ERROR:', error);
            const errorMessage = error.response?.data?.error || 'Failed to create service';
            
            // Check for unique constraint violation
            if (errorMessage.includes('Unique constraint failed') && errorMessage.includes('name')) {
                toast.error(`A service with the name "${name}" already exists. Please choose a different name.`);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <SetupWizard
                title="Create New Service"
                description="Define a reusable IoT service template"
                breadcrumbs={[
                    { label: 'Services', href: '/admin/services' },
                    { label: 'New', href: '/admin/services/new' },
                ]}
                steps={steps}
                currentStep={currentStep}
                onNext={handleNext}
                onBack={handleBack}
                isLastStep={currentStep === steps.length - 1}
                isLoading={isLoading}
                onCancel={() => router.push('/admin/services')}
            >
                {/* Step 1: Profile */}
                {currentStep === 0 && (
                    <div className="space-y-6">
                        {/* Image Upload */}
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Service Image</label>
                            <div className="flex items-start gap-4">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5 ${
                                        imageUrl ? 'border-primary bg-primary/5' : 'border-border'
                                    }`}
                                >
                                    {imageUrl ? (
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={imageUrl}
                                                alt="Service"
                                                fill
                                                className="object-cover rounded-lg"
                                            />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setImageUrl(''); }}
                                                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : isUploadingImage ? (
                                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                                    ) : (
                                        <div className="text-center text-muted-foreground">
                                            <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                                            <span className="text-xs">Upload</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">Upload a representative image for this service template.</p>
                                    <p className="text-xs text-muted-foreground mt-1">Recommended: 512x512px, PNG or JPG</p>
                                </div>
                            </div>
                        </div>

                        <Input
                            label="Service Name *"
                            placeholder="e.g. Water Wall Monitor V2"
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            required
                        />
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-3 rounded-lg border border-border bg-background h-24 resize-none"
                                placeholder="What does this service do?"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {SCOPE_OPTIONS.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => setScope(opt.value)}
                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${scope === opt.value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/30'
                                        }`}
                                >
                                    <opt.icon className={`w-6 h-6 mb-3 ${scope === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <p className="font-semibold text-sm">{opt.label}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div>
                                <p className="font-medium text-sm">Enable Public Dashboard</p>
                                <p className="text-xs text-muted-foreground">Allow generating public share links for this service</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Device Models */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Select the device models required for this service.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {availableDeviceModels.map((model) => {
                                const isSelected = serviceDeviceModels.some(m => m.id === model.id);
                                const config = serviceDeviceModels.find(m => m.id === model.id);

                                return (
                                    <div key={model.id} className={`p-4 rounded-xl border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}>
                                        <div className="flex items-start gap-4">
                                            <div
                                                onClick={() => toggleDeviceModel(model.id)}
                                                className={`w-5 h-5 mt-1 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground'}`}
                                            >
                                                {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-medium">{model.name}</h4>
                                                        <p className="text-xs text-muted-foreground">{model.parameters?.length || 0} Parameters • {model.id}</p>
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                                        <Input
                                                            label="Role in Service"
                                                            value={config?.role || ''}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDeviceModelConfig(model.id, 'role', e.target.value)}
                                                            placeholder="e.g. Main Controller"
                                                            className="h-9 text-sm"
                                                        />
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-medium">Min Count</label>
                                                            <input
                                                                type="number"
                                                                value={config?.min_count || 1}
                                                                onChange={(e) => updateDeviceModelConfig(model.id, 'min_count', parseInt(e.target.value))}
                                                                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                                min={1}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 3: Parameters */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Define service-level parameters that aggregate data from devices.</p>
                            </div>
                            <button
                                onClick={autoGenerateParameters}
                                disabled={serviceDeviceModels.length === 0}
                                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                            >
                                <Activity className="w-4 h-4" />
                                Auto-Generate from Devices
                            </button>
                        </div>

                        {serviceParameters.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground">No parameters defined yet</p>
                                <p className="text-sm text-muted-foreground mb-4">Add parameters manually or auto-generate from device models</p>
                                <button
                                    onClick={addServiceParameter}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm flex items-center gap-2 mx-auto"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Parameter
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {serviceParameters.map((param, index) => (
                                    <div key={index} className="p-4 border border-border rounded-lg bg-card">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                            <Input
                                                label="Parameter Key"
                                                value={param.key}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateServiceParameter(index, 'key', e.target.value)}
                                                placeholder="e.g. total_volume"
                                            />
                                            <Input
                                                label="Display Name"
                                                value={param.name}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateServiceParameter(index, 'name', e.target.value)}
                                                placeholder="e.g. Total Volume"
                                            />
                                            <div>
                                                <label className="text-xs font-medium mb-1.5 block">Source Parameter</label>
                                                <select
                                                    value={param.sourceParam || ''}
                                                    onChange={(e) => updateServiceParameter(index, 'sourceParam', e.target.value)}
                                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                >
                                                    <option value="">Select device parameter...</option>
                                                    {serviceDeviceModels.flatMap(sdm => {
                                                        const model = availableDeviceModels.find(m => m.id === sdm.id);
                                                        return (model?.parameters || []).map((p: any) => (
                                                            <option key={`${model?.id}-${p.key}`} value={p.key}>
                                                                {p.name || p.key} ({model?.name})
                                                            </option>
                                                        ));
                                                    })}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium mb-1.5 block">Aggregation</label>
                                                <select
                                                    value={param.aggregation || 'LATEST'}
                                                    onChange={(e) => updateServiceParameter(index, 'aggregation', e.target.value)}
                                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                >
                                                    {AGGREGATION_TYPES.map(agg => (
                                                        <option key={agg} value={agg}>{agg}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="text-xs font-medium mb-1.5 block">Data Type</label>
                                                    <select
                                                        value={param.dataType}
                                                        onChange={(e) => updateServiceParameter(index, 'dataType', e.target.value)}
                                                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                    >
                                                        {DATA_TYPES.map(dt => (
                                                            <option key={dt} value={dt}>{dt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => removeServiceParameter(index)}
                                                    className="mt-6 p-2 text-destructive hover:bg-destructive/10 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-4">
                                            <Input
                                                label="Unit"
                                                value={param.unit || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateServiceParameter(index, 'unit', e.target.value)}
                                                placeholder="e.g. liters"
                                            />
                                            <Input
                                                label="Icon (optional)"
                                                value={param.icon || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateServiceParameter(index, 'icon', e.target.value)}
                                                placeholder="e.g. droplet"
                                            />
                                            <div className="flex items-end">
                                                <p className="text-xs text-muted-foreground pb-2">
                                                    {param.aggregation === 'SUM' && '∑ Sum of all device values'}
                                                    {param.aggregation === 'AVG' && 'x̄ Average of all device values'}
                                                    {param.aggregation === 'MIN' && '↓ Minimum value across devices'}
                                                    {param.aggregation === 'MAX' && '↑ Maximum value across devices'}
                                                    {param.aggregation === 'COUNT' && '# Count of devices'}
                                                    {param.aggregation === 'LATEST' && '→ Latest value from any device'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={addServiceParameter}
                                    className="w-full p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Another Parameter
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Review */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                {imageUrl && (
                                    <div className="w-20 h-20 rounded-lg overflow-hidden relative shrink-0">
                                        <Image src={imageUrl} alt={name} fill className="object-cover" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Service</p>
                                    <h3 className="text-xl font-bold">{name}</h3>
                                    <p className="text-sm text-muted-foreground">{description}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <div className="px-3 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                                    {SCOPE_OPTIONS.find(s => s.value === scope)?.label}
                                </div>
                                <div className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded text-sm font-medium">
                                    {serviceType === 'GLOBAL' ? 'Global Template' : 'Internal Template'}
                                </div>
                                {isPublic && (
                                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded text-sm font-medium">
                                        Public Dashboard
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-border pt-6">
                            <h4 className="font-semibold mb-4">Device Architecture ({serviceDeviceModels.length} models)</h4>
                            <div className="space-y-3">
                                {serviceDeviceModels.map((dm) => {
                                    const model = availableDeviceModels.find(m => m.id === dm.id);
                                    return (
                                        <div key={dm.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                            <div className="flex items-center gap-3">
                                                <Cpu className="w-5 h-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium text-sm">{model?.name}</p>
                                                    <p className="text-xs text-muted-foreground">{dm.role}</p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-mono bg-background px-2 py-1 rounded border border-border">
                                                {dm.min_count} - {dm.max_count} units
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {serviceParameters.length > 0 && (
                            <div className="border-t border-border pt-6">
                                <h4 className="font-semibold mb-4">Service Parameters ({serviceParameters.length})</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {serviceParameters.map((param, index) => (
                                        <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border">
                                            <p className="font-medium text-sm">{param.name || param.key}</p>
                                            <p className="text-xs text-muted-foreground">{param.dataType} • {param.aggregation}</p>
                                            {param.unit && <p className="text-xs text-muted-foreground mt-1">Unit: {param.unit}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                <strong>Next Step:</strong> After creating the service, you&apos;ll be redirected to configure the dashboard layouts.
                            </p>
                        </div>
                    </div>
                )}
            </SetupWizard>
        </DashboardLayout>
    );
}
