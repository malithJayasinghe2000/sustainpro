'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { departmentServicesApi, devicesApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import ProvisioningModal from '@/components/provisioning/ProvisioningModal';
import WidgetRenderer from '@/components/dashboard/WidgetRenderer';
import DeviceTable from '@/components/devices/DeviceTable';
import { WidgetConfig } from '@/types/dashboard';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Layers,
    Smartphone,
    Activity,
    CheckCircle,
    Copy,
    Cpu,
    Usb,
    LayoutDashboard,
    Settings,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ServiceInstancePageProps {
    params: Promise<{ id: string; deptId: string; serviceId: string }>;
}

export default function ServiceInstancePage({ params }: ServiceInstancePageProps) {
    const { id: eventId, deptId, serviceId } = use(params);
    const router = useRouter();

    const [serviceInstance, setServiceInstance] = useState<any>(null);
    const [assignedDevices, setAssignedDevices] = useState<any[]>([]);
    const [availableDevices, setAvailableDevices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [aggregatedData, setAggregatedData] = useState<Record<string, any>>({});

    // Modals
    const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
    const [showProvisioningModal, setShowProvisioningModal] = useState(false);

    // Modal State
    const [activeTab, setActiveTab] = useState<'existing' | 'create'>('create');

    useEffect(() => {
        loadData();

        // Socket.IO: Listen for real-time telemetry updates
        const socket = getSocket();

        const handleTelemetry = (payload: any) => {
            console.log('📡 Telemetry received:', payload);

            // Update assigned devices with new telemetry data
            setAssignedDevices((prev: any[]) => prev.map(device => {
                if (device.hardware_id === payload.hardware_id || device.device_code === payload.device_code) {
                    return {
                        ...device,
                        status: 'ONLINE',
                        last_seen: payload.timestamp || new Date().toISOString(),
                        metadata: {
                            ...device.metadata,
                            ...payload.data
                        }
                    };
                }
                return device;
            }));

            // Also update aggregated data for dashboard widgets
            setAggregatedData((prev: Record<string, any>) => ({
                ...prev,
                ...payload.data,
                status: 'ONLINE',
                last_seen: payload.timestamp || new Date().toISOString()
            }));
        };

        socket.on('dashboard:telemetry', handleTelemetry);

        // Offline detection: Check every 5 seconds if device is silent > 10s
        const offlineCheckInterval = setInterval(() => {
            setAssignedDevices((prev: any[]) => prev.map(device => {
                if (device.status === 'ONLINE' && device.last_seen) {
                    const timeSinceLastSeen = Date.now() - new Date(device.last_seen).getTime();
                    if (timeSinceLastSeen > 10000) { // 10 seconds timeout
                        return { ...device, status: 'OFFLINE' };
                    }
                }
                return device;
            }));
        }, 5000); // Check every 5 seconds

        return () => {
            socket.off('dashboard:telemetry', handleTelemetry);
            clearInterval(offlineCheckInterval);
        };
    }, [serviceId]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [instanceData, devicesData, allDevicesData] = await Promise.all([
                departmentServicesApi.getById(serviceId),
                departmentServicesApi.getDevices(serviceId),
                devicesApi.getAll()
            ]);

            setServiceInstance(instanceData);
            
            // Debug: Log the dashboard layout to understand what's being returned
            console.log('🔍 DEBUG: Service Instance Data:', instanceData);
            console.log('🔍 DEBUG: main_dashboard_layout:', instanceData?.main_dashboard_layout);
            console.log('🔍 DEBUG: widgets:', instanceData?.main_dashboard_layout?.widgets);
            
            setAssignedDevices(Array.isArray(devicesData) ? devicesData : (devicesData?.data || []));
            setAvailableDevices(Array.isArray(allDevicesData) ? allDevicesData : (allDevicesData?.data || []));
            console.log('Loaded service instance:', instanceData);
        } catch (error) {
            console.error('Failed to load service instance:', error);
            toast.error('Failed to load service instance');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddExistingDevice = async (deviceId: number) => {
        try {
            await departmentServicesApi.addDevice(serviceId, deviceId);
            toast.success('Device added successfully');
            closeModal();
            loadData();
        } catch (error: any) {
            console.error('Failed to add device:', error);
            const errorMessage = error.response?.data?.error || 'Failed to add device';
            toast.error(errorMessage);
        }
    };

    const closeModal = () => {
        setShowAddDeviceModal(false);
        setActiveTab('create');
    };

    const handleRemoveDevice = async (deviceId: number) => {
        if (!confirm('Are you sure you want to remove this device from the service?')) return;

        try {
            await departmentServicesApi.removeDevice(serviceId, deviceId);
            toast.success('Device removed successfully');
            loadData();
        } catch (error) {
            console.error('Failed to remove device:', error);
            toast.error('Failed to remove device');
        }
    };

    const startProvisioning = () => {
        setShowAddDeviceModal(false);
        setShowProvisioningModal(true);
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!serviceInstance) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-screen gap-4">
                    <h2 className="text-xl font-semibold">Service Not Found</h2>
                    <button
                        onClick={() => router.push(`/events/${eventId}/departments/${deptId}`)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                    >
                        Return to Department
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const assignedDeviceIds = assignedDevices.map(d => d.device_id);
    const unassignedDevices = availableDevices.filter(d => !assignedDeviceIds.includes(d.id));

    return (
        <DashboardLayout>
            <div className="p-8 max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <button
                            onClick={() => router.push(`/events/${eventId}/departments/${deptId}`)}
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Department
                        </button>
                        <span>/</span>
                        <span className="text-foreground font-medium">{serviceInstance.service_name}</span>
                    </div>

                    {/* Service Header */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Layers className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{serviceInstance.service_name}</h1>
                            <p className="text-sm text-muted-foreground">{serviceInstance.service_description || 'Service instance'}</p>
                        </div>
                    </div>
                </div>

                {/* Service Dashboard - Dynamic Widgets */}
                {serviceInstance.main_dashboard_layout?.widgets?.length > 0 ? (
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <LayoutDashboard className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">Service Dashboard</h3>
                        </div>
                        <div 
                            className="grid gap-4"
                            style={{
                                gridTemplateColumns: 'repeat(12, 1fr)',
                                gridAutoRows: '80px'
                            }}
                        >
                            {serviceInstance.main_dashboard_layout.widgets.map((widget: WidgetConfig) => (
                                <div
                                    key={widget.id}
                                    style={{
                                        gridColumn: `span ${widget.position?.w || 3}`,
                                        gridRow: `span ${widget.position?.h || 2}`
                                    }}
                                >
                                    <WidgetRenderer
                                        widget={widget}
                                        isPreview={false}
                                        data={aggregatedData}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Fallback: No Dashboard Configured */
                    <div className="space-y-6">
                        {/* Info Banner */}
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <h4 className="font-medium text-amber-800 dark:text-amber-200">No Dashboard Configured</h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                    This service template doesn&apos;t have a dashboard layout configured yet. 
                                    A Super Admin can configure the dashboard in the Service Templates section.
                                </p>
                                {serviceInstance.service_template_id && (
                                    <button
                                        onClick={() => router.push(`/admin/services/${serviceInstance.service_template_id}/dashboard`)}
                                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Configure Dashboard Template
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Basic Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-card border border-border rounded-xl p-6">
                                <p className="text-sm text-muted-foreground mb-2">Total Devices</p>
                                <h3 className="text-2xl font-bold">
                                    {serviceInstance.active_devices || 0}
                                    <span className="text-muted-foreground text-sm font-normal ml-2">
                                        / {serviceInstance.total_devices || 0} Online
                                    </span>
                                </h3>
                            </div>

                            <div className="bg-card border border-border rounded-xl p-6">
                                <p className="text-sm text-muted-foreground mb-2">Active Devices</p>
                                <h3 className="text-2xl font-bold">
                                    {serviceInstance.active_devices || 0}
                                </h3>
                            </div>

                            <div className="bg-card border border-border rounded-xl p-6">
                                <p className="text-sm text-muted-foreground mb-2">Status</p>
                                <h3 className="text-2xl font-bold text-green-600">
                                    {serviceInstance.active_devices > 0 ? 'Active' : 'Inactive'}
                                </h3>
                            </div>

                            <div className="bg-card border border-border rounded-xl p-6">
                                <p className="text-sm text-muted-foreground mb-2">Service Type</p>
                                <h3 className="text-lg font-bold">
                                    {serviceInstance.service_type || 'N/A'}
                                </h3>
                            </div>
                        </div>
                    </div>
                )}

                {/* Devices Section */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-semibold text-lg">Devices</h3>
                            <p className="text-sm text-muted-foreground">
                                Manage devices for this service
                            </p>
                        </div>
                        <button
                            onClick={() => setShowAddDeviceModal(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Device
                        </button>
                    </div>

                    <DeviceTable
                        serviceId={serviceId}
                        eventId={eventId}
                        deptId={deptId}
                        onRefresh={loadData}
                    />
                </div>

                {/* Add Device Modal - Selection Type */}
                {showAddDeviceModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">Add Device to Service</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Select existing or create new
                                    </p>
                                </div>
                                <button onClick={closeModal} className="p-2 hover:bg-muted rounded-full">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-border px-6">
                                <button
                                    onClick={() => setActiveTab('create')}
                                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                                >
                                    New Device (USB)
                                </button>
                                <button
                                    onClick={() => setActiveTab('existing')}
                                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'existing' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                                >
                                    Select Existing
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {activeTab === 'create' ? (
                                    <div className="text-center py-10 space-y-6">
                                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                            <Usb className="w-10 h-10 text-primary" />
                                        </div>
                                        <div className="space-y-2 max-w-sm mx-auto">
                                            <h4 className="text-lg font-semibold">USB Provisioning</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Connect your device via USB cable to register it and configure WiFi credentials automatically.
                                            </p>
                                        </div>
                                        <button
                                            onClick={startProvisioning}
                                            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                                        >
                                            <Usb className="w-4 h-4" />
                                            Start Provisioning Wizard
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {unassignedDevices.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-3">
                                                {unassignedDevices.map((device) => (
                                                    <button
                                                        key={device.id}
                                                        onClick={() => handleAddExistingDevice(device.id)}
                                                        className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                                    <Smartphone className="w-5 h-5 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold group-hover:text-primary transition-colors">
                                                                        {device.name || device.device_code}
                                                                    </h4>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {device.device_code} • {device.status || 'OFFLINE'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                <p className="mb-4">No available devices to assign.</p>
                                                <button
                                                    onClick={() => setActiveTab('create')}
                                                    className="text-primary hover:underline"
                                                >
                                                    Create a new device instead
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Provisioning Modal */}
               
                {showProvisioningModal && (
                    <ProvisioningModal
                        visible={showProvisioningModal}
                        onClose={() => {
                            setShowProvisioningModal(false);
                            loadData(); // Refresh list after provisioning
                        }}
                        currentServiceId={serviceId}
                        currentOrganizationId={serviceInstance?.organization_id}
                        currentServiceType={serviceInstance?.service_type || 'waterwall'}
                        currentServiceName={serviceInstance?.service_name || 'Waterwall'}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
