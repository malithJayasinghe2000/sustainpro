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

            // Load device model parameters
            const deviceModels = await deviceModelsApi.getAll();
            console.log('🔍 DEBUG: Raw Device Models Response:', deviceModels);

            // Handle both 'id' (from list view) and 'device_model_id' (from detail view) conventions
            const serviceDeviceModelIds = currentService.device_models?.map((dm: any) => dm.device_model_id || dm.id) || [];
            console.log('🔍 DEBUG: Service Device Model IDs:', serviceDeviceModelIds);

            const deviceModelsArray = Array.isArray(deviceModels) ? deviceModels : (deviceModels?.data || []);
            console.log('🔍 DEBUG: Device Models Array:', deviceModelsArray);

            const relevantModels = deviceModelsArray.filter((m: any) => serviceDeviceModelIds.includes(m.id));
            console.log('🔍 DEBUG: Relevant Models:', relevantModels);

            const params = relevantModels.flatMap((m: any) => {
                console.log(`🔍 DEBUG: Model ${m.name} parameters:`, m.parameters);
                return m.parameters || [];
            });
            console.log('🔍 DEBUG: Final Parameters:', params);
            setAvailableParameters(params);

            // Load dashboards
            setDeviceTemplate(currentService.dashboard_template || { widgets: [] });
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
            const updatePayload: any = {};
            if (activeTab === 'device') updatePayload.dashboard_template = template;
            if (activeTab === 'main') updatePayload.main_dashboard_layout = template;
            if (activeTab === 'public') updatePayload.public_dashboard_layout = template;

            const result = await servicesApi.update(serviceId, updatePayload);

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
