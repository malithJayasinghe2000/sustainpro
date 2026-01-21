'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardBuilderDragDrop from '@/components/dashboard/DashboardBuilderDragDrop';
import { servicesApi, deviceModelsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function ServiceDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const serviceId = params?.id as string;

    const [service, setService] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'device' | 'main' | 'public'>('device');
    const [availableParameters, setAvailableParameters] = useState<any[]>([]);

    // Separate templates for each view
    const [deviceTemplate, setDeviceTemplate] = useState<any>({ widgets: [] });
    const [mainTemplate, setMainTemplate] = useState<any>({ widgets: [] });
    const [publicTemplate, setPublicTemplate] = useState<any>({ widgets: [] });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadServiceAndParameters();
    }, [serviceId]);

    const loadServiceAndParameters = async () => {
        try {
            // Load service details
            const currentService = await servicesApi.getById(serviceId);
            console.log('🔍 DEBUG: Current Service:', currentService);

            if (!currentService) {
                toast.error('Service not found');
                router.push('/admin/services');
                return;
            }

            setService(currentService);

            // Load parameters from multiple sources:
            // 1. Service-level parameters (service_parameters)
            // 2. Embedded device model parameters (from service response)
            // 3. Fetched device model parameters (as fallback)
            
            // Start with service-level parameters
            const serviceParams = (currentService.service_parameters || []).map((p: any) => ({
                key: p.key || p.name,
                name: p.name || p.key,
                unit: p.unit || '',
                data_type: p.data_type || p.type || 'number'
            }));
            console.log('🔍 DEBUG: Service Parameters:', serviceParams);

            // Extract parameters from embedded device models in service response
            const embeddedDeviceModelParams = (currentService.device_models || []).flatMap((dm: any) => {
                const model = dm.device_model || dm;
                console.log(`🔍 DEBUG: Embedded device model:`, model);
                return (model.parameters || []).map((p: any) => ({
                    key: p.key || p.name,
                    name: p.name || p.key,
                    unit: p.unit || '',
                    data_type: p.data_type || p.type || 'number'
                }));
            });
            console.log('🔍 DEBUG: Embedded Device Model Parameters:', embeddedDeviceModelParams);

            // Also fetch device models separately as fallback
            let deviceModelParams: any[] = [];
            try {
                const deviceModels = await deviceModelsApi.getAll();
                console.log('🔍 DEBUG: Raw Device Models Response:', deviceModels);

                // Handle both 'id' (from list view) and 'device_model_id' (from detail view) conventions
                const serviceDeviceModelIds = currentService.device_models?.map((dm: any) => dm.device_model_id || dm.id) || [];
                console.log('🔍 DEBUG: Service Device Model IDs:', serviceDeviceModelIds);

                const deviceModelsArray = Array.isArray(deviceModels) ? deviceModels : (deviceModels?.data || []);
                console.log('🔍 DEBUG: Device Models Array:', deviceModelsArray);

                const relevantModels = deviceModelsArray.filter((m: any) => serviceDeviceModelIds.includes(m.id));
                console.log('🔍 DEBUG: Relevant Models:', relevantModels);

                deviceModelParams = relevantModels.flatMap((m: any) => {
                    console.log(`🔍 DEBUG: Model ${m.name} parameters:`, m.parameters);
                    return (m.parameters || []).map((p: any) => ({
                        key: p.key || p.name,
                        name: p.name || p.key,
                        unit: p.unit || '',
                        data_type: p.data_type || p.type || 'number'
                    }));
                });
                console.log('🔍 DEBUG: Fetched Device Model Parameters:', deviceModelParams);
            } catch (e) {
                console.log('🔍 DEBUG: Could not fetch device models separately:', e);
            }

            // Combine all parameters, removing duplicates by key
            const allParams = [...serviceParams, ...embeddedDeviceModelParams, ...deviceModelParams];
            const uniqueParams = allParams.filter((param, index, self) => 
                index === self.findIndex(p => p.key === param.key)
            );
            console.log('🔍 DEBUG: Final Combined Parameters:', uniqueParams);
            setAvailableParameters(uniqueParams);

            // Load dashboards - use correct field names from database
            console.log('🔍 DEBUG: device_dashboard_layout:', currentService.device_dashboard_layout);
            console.log('🔍 DEBUG: main_dashboard_layout:', currentService.main_dashboard_layout);
            console.log('🔍 DEBUG: public_dashboard_layout:', currentService.public_dashboard_layout);
            
            setDeviceTemplate(currentService.device_dashboard_layout || { widgets: [] });
            setMainTemplate(currentService.main_dashboard_layout || { widgets: [] });
            setPublicTemplate(currentService.public_dashboard_layout || { widgets: [] });
        } catch (error) {
            console.error('Failed to load service:', error);
            toast.error('Failed to load service');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (template: any) => {
        console.log(`Saving ${activeTab} dashboard template...`, template);
        setIsSaving(true);
        try {
            // Map activeTab to dashboard_type for the API
            const dashboardTypeMap: Record<string, 'main' | 'device' | 'public'> = {
                'device': 'device',
                'main': 'main',
                'public': 'public'
            };
            const dashboardType = dashboardTypeMap[activeTab];

            // Use the new updateDashboard API method
            const result = await servicesApi.updateDashboard(serviceId, dashboardType, template);

            console.log('Save result:', result);

            if (activeTab === 'device') setDeviceTemplate(template);
            if (activeTab === 'main') setMainTemplate(template);
            if (activeTab === 'public') setPublicTemplate(template);

            toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Dashboard saved!`);
        } catch (error) {
            console.error('Save error details:', error);
            toast.error('Failed to save dashboard');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground animate-pulse">Loading dashboard builder...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const getCurrentTemplate = () => {
        if (activeTab === 'main') return mainTemplate;
        if (activeTab === 'public') return publicTemplate;
        return deviceTemplate;
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-background z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                {service?.name || 'Loading...'}
                                <span className="text-muted-foreground font-normal text-sm">/ Dashboard Builder</span>
                            </h1>
                            <div className="flex gap-2 mt-1">
                                <button
                                    onClick={() => setActiveTab('device')}
                                    className={`text-xs px-3 py-1 rounded-full border ${activeTab === 'device' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted hover:bg-muted/80'}`}
                                >
                                    Device Detail
                                </button>
                                <button
                                    onClick={() => setActiveTab('main')}
                                    className={`text-xs px-3 py-1 rounded-full border ${activeTab === 'main' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted hover:bg-muted/80'}`}
                                >
                                    Main Service View
                                </button>
                                <button
                                    onClick={() => setActiveTab('public')}
                                    className={`text-xs px-3 py-1 rounded-full border ${activeTab === 'public' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted hover:bg-muted/80'}`}
                                >
                                    Public Widget
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Builder Content - Key ensures re-mount on tab change to reset builder state */}
                <div className="flex-1 overflow-hidden relative">
                    <DashboardBuilderDragDrop
                        key={activeTab} // Force re-render on tab switch
                        availableParameters={availableParameters}
                        initialTemplate={getCurrentTemplate()}
                        onSave={handleSave}
                        onCancel={() => router.back()}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
