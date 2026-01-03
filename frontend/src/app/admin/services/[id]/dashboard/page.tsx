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
    const [availableParameters, setAvailableParameters] = useState<any[]>([]);
    const [dashboardTemplate, setDashboardTemplate] = useState<any>({ widgets: [] });
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

            // Load existing dashboard template
            if (currentService.dashboard_template && currentService.dashboard_template.widgets) {
                setDashboardTemplate(currentService.dashboard_template);
            } else {
                setDashboardTemplate({ widgets: [] });
            }
        } catch (error) {
            console.error('Failed to load service:', error);
            toast.error('Failed to load service');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (template: any) => {
        console.log('Saving dashboard template...', template);
        setIsSaving(true);
        try {
            const result = await servicesApi.update(serviceId, {
                dashboard_template: template
            });
            console.log('Save result:', result);
            setDashboardTemplate(template);
            toast.success('Dashboard saved successfully!');
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

    return (
        <DashboardLayout>
            <div className="h-screen flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/services')}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold">{service?.name} - Dashboard Builder</h1>
                            <p className="text-sm text-muted-foreground">
                                Design the dashboard template for this service
                            </p>
                        </div>
                    </div>
                </div>

                {/* Builder */}
                <div className="flex-1 overflow-hidden">
                    <DashboardBuilderDragDrop
                        availableParameters={availableParameters}
                        initialTemplate={dashboardTemplate}
                        onSave={handleSave}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
