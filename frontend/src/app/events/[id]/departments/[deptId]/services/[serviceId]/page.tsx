'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { departmentServicesApi, devicesApi } from '@/lib/api';
import SerialProvisioner from '@/components/devices/SerialProvisioner';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Layers,
    Smartphone,
    Activity,
    CheckCircle,
    Copy,
    Cpu
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
    const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);

    // Modal State
    const [activeTab, setActiveTab] = useState<'existing' | 'create'>('create');
    const [newDeviceName, setNewDeviceName] = useState('');
    const [newDeviceCode, setNewDeviceCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<any>(null);
    const [isProvisioning, setIsProvisioning] = useState(false);

    useEffect(() => {
        loadData();
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
            setAssignedDevices(Array.isArray(devicesData) ? devicesData : (devicesData?.data || []));
            setAvailableDevices(Array.isArray(allDevicesData) ? allDevicesData : (allDevicesData?.data || []));
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

    const handleCreateDevice = async () => {
        if (!newDeviceName || !newDeviceCode) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            setIsCreating(true);
            // Create device and assign to this service immediately
            const newDevice = await devicesApi.create({
                name: newDeviceName,
                device_code: newDeviceCode,
                type: 'generic', // Default type
                service_id: serviceId // Auto-assign
            });

            setCreatedCredentials(newDevice);
            toast.success('Device created successfully');

            // Move to provisioning step
            setIsProvisioning(true);

            // Refresh main data in background
            loadData();

        } catch (error: any) {
            console.error('Failed to create device:', error);
            toast.error(error.response?.data?.error || 'Failed to create device');
        } finally {
            setIsCreating(false);
        }
    };

    const handleProvisioningComplete = () => {
        toast.success('Provisioning complete!');
        closeModal();
        loadData();
    };

    const closeModal = () => {
        setShowAddDeviceModal(false);
        setActiveTab('create');
        setNewDeviceName('');
        setNewDeviceCode('');
        setCreatedCredentials(null);
        setIsProvisioning(false);
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

                {/* Service Stats */}
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
                        <p className="text-sm text-muted-foreground mb-2">Total Water Dispensed</p>
                        <h3 className="text-2xl font-bold">
                            {Number(serviceInstance.total_dispensed || 0).toLocaleString()} <span className="text-sm font-normal">L</span>
                        </h3>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground mb-2">Bottles Saved</p>
                        <h3 className="text-2xl font-bold">
                            {Number(serviceInstance.total_bottles_saved || 0).toLocaleString()}
                        </h3>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6">
                        <p className="text-sm text-muted-foreground mb-2">CO₂ Saved</p>
                        <h3 className="text-2xl font-bold">
                            {Number(serviceInstance.total_co2_saved || 0).toLocaleString()} <span className="text-sm font-normal">kg</span>
                        </h3>
                    </div>
                </div>

                {/* Devices Section */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-semibold text-lg">Devices</h3>
                            <p className="text-sm text-muted-foreground">
                                Manage devices for this service
                            </p>
                        </div>
                    </div>

                    {assignedDevices.length === 0 ? (
                        <div className="text-center py-16 bg-card border border-border rounded-xl">
                            <Smartphone className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground mb-6">No devices assigned yet.</p>
                            <button
                                onClick={() => setShowAddDeviceModal(true)}
                                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add First Device
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Device Cards */}
                            {assignedDevices.map((device) => (
                                <div
                                    key={device.assignment_id || device.id}
                                    onClick={() => router.push(`/events/${eventId}/departments/${deptId}/services/${serviceId}/devices/${device.device_id || device.id}`)}
                                    className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all group relative cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Smartphone className="w-6 h-6 text-primary" />
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveDevice(device.device_id || device.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
                                            title="Remove Device"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <h4 className="font-bold text-lg mb-1">{device.device_name || device.name || device.device_code}</h4>
                                    <p className="text-sm text-muted-foreground mb-4">Code: {device.device_code}</p>

                                    <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                                        <span className={`px-2 py-1 rounded-full border ${device.status === 'ONLINE'
                                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                            : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                            }`}>
                                            {device.status || 'OFFLINE'}
                                        </span>
                                        <span className="text-muted-foreground">{device.role || 'primary'}</span>
                                    </div>
                                </div>
                            ))}

                            {/* Add Device Card */}
                            <button
                                onClick={() => setShowAddDeviceModal(true)}
                                className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[240px] transition-all group"
                            >
                                <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <h4 className="font-medium mb-1">Add Device</h4>
                                <p className="text-xs text-muted-foreground">Assign a device</p>
                            </button>
                        </div>
                    )}
                </div>

                {/* Add Device Modal */}
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

                            {/* If Provisioning Mode */}
                            {isProvisioning && createdCredentials ? (
                                <div className="flex-1 overflow-y-auto bg-background">
                                    <div className="max-w-xl mx-auto p-6">
                                        <div className="flex items-center justify-between mb-6 p-4 bg-green-50/50 border border-green-100 dark:bg-green-900/10 dark:border-green-800 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                <div>
                                                    <h4 className="font-semibold text-green-900 dark:text-green-300">Device Created Successfully</h4>
                                                    <p className="text-xs text-green-700 dark:text-green-400">Assigned and ready.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={closeModal}
                                                className="text-xs bg-background border border-border px-3 py-1 rounded hover:bg-muted"
                                            >
                                                Skip Provisioning
                                            </button>
                                        </div>

                                        <SerialProvisioner
                                            onProvision={async (serial, model, ssid, pass) => {
                                                // We intentionally ignore the device serial for now and flash the credentials we just created
                                                // In a real scenario, we might want to update the device record with this serial
                                                return {
                                                    device_code: createdCredentials.device_code,
                                                    api_key: createdCredentials.api_key || 'UNKNOWN_KEY',
                                                    server_url: window.location.origin
                                                };
                                            }}
                                            onSuccess={handleProvisioningComplete}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Tabs */}
                                    <div className="flex border-b border-border px-6">
                                        <button
                                            onClick={() => setActiveTab('create')}
                                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                                        >
                                            Create New Device
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
                                            <div className="space-y-4 max-w-md mx-auto py-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Device Name</label>
                                                    <input
                                                        type="text"
                                                        value={newDeviceName}
                                                        onChange={(e) => setNewDeviceName(e.target.value)}
                                                        placeholder="e.g. Main Entrance Gate"
                                                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Device Code (ID)</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newDeviceCode}
                                                            onChange={(e) => setNewDeviceCode(e.target.value.toUpperCase())}
                                                            placeholder="e.g. DEV-001"
                                                            className="w-full px-3 py-2 border border-input rounded-md bg-background font-mono"
                                                        />
                                                        <button
                                                            onClick={() => setNewDeviceCode(`DEV-${Math.floor(Math.random() * 10000)}`)}
                                                            className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-xs whitespace-nowrap"
                                                        >
                                                            Generate
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="pt-4">
                                                    <button
                                                        onClick={handleCreateDevice}
                                                        disabled={isCreating}
                                                        className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                    >
                                                        {isCreating ? 'Creating Device...' : 'Create & Provision'}
                                                    </button>
                                                </div>

                                                <div className="text-xs text-muted-foreground text-center">
                                                    Next step: We'll flash the credentials to your device via USB.
                                                </div>
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
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
