'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi, deviceModelsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Globe, Lock, Building2, Cpu, Edit, LayoutTemplate, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

const SCOPE_OPTIONS = [
    { value: 'GLOBAL', label: 'Global Service', description: 'Available to all Organizations', icon: Globe },
    { value: 'INTERNAL', label: 'Internal Only', description: 'Restricted to SustainPro Operations', icon: Lock },
    { value: 'ORG_SPECIFIC', label: 'Organization Specific', description: 'Custom service for a single client', icon: Building2 },
];

export default function ViewServicePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: serviceId } = use(params);
    const [isLoading, setIsLoading] = useState(true);
    const [service, setService] = useState<any>(null);
    const [deviceModels, setDeviceModels] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [serviceId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load Device Models
            const modelsRes = await deviceModelsApi.getAll();
            const models = Array.isArray(modelsRes) ? modelsRes : (modelsRes?.data || []);
            setDeviceModels(models);

            // Load Service Data
            const serviceData = await servicesApi.getById(serviceId);
            if (!serviceData) {
                toast.error('Service not found');
                router.push('/admin/services');
                return;
            }
            setService(serviceData);
        } catch (error) {
            console.error('Failed to load data', error);
            toast.error('Failed to load service data');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground animate-pulse">Loading service...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!service) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-screen gap-4">
                    <h2 className="text-xl font-semibold">Service Not Found</h2>
                    <button
                        onClick={() => router.push('/admin/services')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                    >
                        Back to Services
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const scopeInfo = SCOPE_OPTIONS.find(s => s.value === service.scope) || SCOPE_OPTIONS[0];
    const ScopeIcon = scopeInfo.icon;

    // Get linked device models with details
    const linkedDeviceModels = (service.device_models || []).map((dm: any) => {
        const fullModel = deviceModels.find(m => m.id === (dm.device_model_id || dm.id));
        return {
            ...dm,
            model: fullModel || { name: 'Unknown Model', parameters: [] }
        };
    });

    return (
        <DashboardLayout>
            <div className="p-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin/services')}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">{service.name}</h1>
                            <p className="text-sm text-muted-foreground">Service Template Details</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push(`/admin/services/${serviceId}/dashboard`)}
                            className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <LayoutTemplate className="w-4 h-4" />
                            Dashboard Builder
                        </button>
                        <button
                            onClick={() => router.push(`/admin/services/${serviceId}/edit`)}
                            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            Edit Service
                        </button>
                    </div>
                </div>

                {/* Service Overview Card */}
                <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
                    {/* Banner with Image */}
                    <div className="h-32 relative bg-gradient-to-br from-primary/80 via-primary/60 to-primary/40">
                        {service.image_url && (
                            <Image
                                src={service.image_url}
                                alt={service.name}
                                fill
                                className="object-cover opacity-30"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* Icon */}
                    <div className="relative -mt-10 ml-6">
                        <div className="w-20 h-20 rounded-xl bg-card shadow-lg overflow-hidden flex items-center justify-center border-4 border-background">
                            {service.image_url ? (
                                <Image
                                    src={service.image_url}
                                    alt={service.name}
                                    width={80}
                                    height={80}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                    <ScopeIcon className="w-10 h-10 text-primary" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 pt-4">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold">{service.name}</h2>
                                <p className="text-muted-foreground mt-1">
                                    {service.description || 'No description provided.'}
                                </p>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                <ScopeIcon className="w-4 h-4" />
                                {scopeInfo.label}
                            </div>
                            {service.is_public_dashboard_supported && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full text-sm font-medium">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Public Dashboard Enabled
                                </div>
                            )}
                            {service.has_public_dashboard && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full text-sm font-medium">
                                    <Globe className="w-4 h-4" />
                                    Has Public Dashboard
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Device Models Section */}
                <div className="bg-card border border-border rounded-xl p-6 mb-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-primary" />
                        Device Models ({linkedDeviceModels.length})
                    </h3>

                    {linkedDeviceModels.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Cpu className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No device models linked to this service.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {linkedDeviceModels.map((dm: any, index: number) => (
                                <div key={dm.device_model_id || dm.id || index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Cpu className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{dm.model?.name || 'Unknown Model'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Role: {dm.role || 'primary'} • {dm.model?.parameters?.length || 0} parameters
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono bg-background px-2 py-1 rounded border border-border">
                                            Min: {dm.min_devices || dm.min_count || 1}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Service Parameters Section */}
                {service.service_parameters && service.service_parameters.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="font-semibold text-lg mb-4">Service Parameters ({service.service_parameters.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {service.service_parameters.map((param: any, index: number) => (
                                <div key={param.key || index} className="p-3 bg-muted/30 rounded-lg border border-border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{param.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{param.key}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs bg-background px-2 py-0.5 rounded border border-border">
                                                {param.dataType || param.data_type || 'number'}
                                            </span>
                                            {param.unit && (
                                                <span className="ml-1 text-xs text-muted-foreground">
                                                    {param.unit}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
