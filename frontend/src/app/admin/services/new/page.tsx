'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import SetupWizard from '@/components/SetupWizard';
import { RichSelect } from '@/components/ui/RichSelect';
import { Input } from '@/components/ui/Input';
import { servicesApi, deviceModelsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Layers, Globe, Lock, Building2, Plus, Trash2, Cpu, Activity, Square, CheckSquare } from 'lucide-react';

const SCOPE_OPTIONS = [
    { value: 'GLOBAL', label: 'Global Service', description: 'Available to all Organizations (e.g. Standard Water Mon)', icon: Globe },
    { value: 'INTERNAL', label: 'Internal Only', description: 'Restricted to SustainPro Operations', icon: Lock },
    { value: 'ORG_SPECIFIC', label: 'Organization Specific', description: 'Custom service for a single client', icon: Building2 },
];

export default function NewServicePage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Data Loading
    const [availableDeviceModels, setAvailableDeviceModels] = useState<any[]>([]);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState('GLOBAL');
    const [isPublic, setIsPublic] = useState(false);

    // Linked Device Models
    const [serviceDeviceModels, setServiceDeviceModels] = useState<{ id: string; role: string; min_count: number }[]>([]);

    const steps = [
        { id: '1', label: 'Service Profile' },
        { id: '2', label: 'Device Models' },
        { id: '3', label: 'Review' },
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
            setServiceDeviceModels(prev => [...prev, { id: modelId, role: 'main', min_count: 1 }]);
        }
    };

    const updateDeviceModelConfig = (modelId: string, field: string, value: any) => {
        setServiceDeviceModels(prev => prev.map(m =>
            m.id === modelId ? { ...m, [field]: value } : m
        ));
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            console.log('🚀 SUBMITTING SERVICE:', { name, scope, device_models: serviceDeviceModels });
            const response = await servicesApi.create({
                name,
                description,
                scope,
                is_public_dashboard_supported: isPublic,
                config: {},
                device_models: serviceDeviceModels.map(m => ({
                    device_model_id: m.id,
                    role: m.role,
                    min_count: m.min_count
                }))
            });
            toast.success('Service created successfully!');
            router.push('/admin/services');
        } catch (error: any) {
            console.error('❌ SERVICE CREATION ERROR:', error);
            toast.error(error.response?.data?.error || 'Failed to create service');
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
                        <Input
                            label="Service Name"
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

                {/* Step 3: Review */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Service</p>
                                <h3 className="text-xl font-bold">{name}</h3>
                                <p className="text-sm text-muted-foreground">{description}</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-3 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                                    {SCOPE_OPTIONS.find(s => s.value === scope)?.label}
                                </div>
                                {isPublic && (
                                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded text-sm font-medium">
                                        Public Dashboard
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-border pt-6">
                            <h4 className="font-semibold mb-4">Device Architecture</h4>
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
                                                Min: {dm.min_count}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </SetupWizard>
        </DashboardLayout>
    );
}
