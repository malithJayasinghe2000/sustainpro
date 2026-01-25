'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { departmentServicesApi, devicesApi, usersApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';
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
    AlertCircle,
    Users,
    UserPlus,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { systemNotificationsApi } from '@/lib/api';

interface ServiceInstancePageProps {
    params: Promise<{ id: string; deptId: string; serviceId: string }>;
}

export default function ServiceInstancePage({ params }: ServiceInstancePageProps) {
    const { id: eventId, deptId, serviceId } = use(params);
    const router = useRouter();
    const { user } = useAuth();

    const [serviceInstance, setServiceInstance] = useState<any>(null);
    const [assignedDevices, setAssignedDevices] = useState<any[]>([]);
    const [availableDevices, setAvailableDevices] = useState<any[]>([]);
    const [serviceUsers, setServiceUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [aggregatedData, setAggregatedData] = useState<Record<string, any>>({});

    // View State
    const [currentView, setCurrentView] = useState<'dashboard' | 'devices' | 'users'>('dashboard');

    // Modals
    const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showProvisioningModal, setShowProvisioningModal] = useState(false);

    // Modal State
    const [activeTab, setActiveTab] = useState<'existing' | 'create'>('create');
    const [addUserTab, setAddUserTab] = useState<'existing' | 'create'>('create'); // Default to create
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [newUserForm, setNewUserForm] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'TECHNICIAN'
    });
    const [isSubmittingUser, setIsSubmittingUser] = useState(false);

    // Filter available users for "Add Existing"
    const [orgUsers, setOrgUsers] = useState<any[]>([]);

    useEffect(() => {
        if (showAddUserModal && addUserTab === 'existing' && serviceInstance?.organization_id) {
            const params: any = {
                organization_id: serviceInstance.organization_id,
                limit: 100
            };
            if (roleFilter) params.role = roleFilter;

            usersApi.getAll(params)
                .then(res => {
                    const users = res.data || (Array.isArray(res) ? res : []);
                    // Filter out users already in this service
                    const existingIds = serviceUsers.map(u => u.id);
                    setOrgUsers(users.filter((u: any) => !existingIds.includes(u.id)));
                })
                .catch(console.error);
        }
    }, [showAddUserModal, addUserTab, serviceInstance, serviceUsers, roleFilter]);

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
                            ...device.metadata, // Correcting potential typo in original logical doubling, assuming standard merging
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

    const canConfigure = useMemo(() => {
        if (!user) return false;
        if (user?.is_super_admin) return true;

        // ORG_ADMIN, EVENT_MANAGER, DEPARTMENT_HEAD have access
        const hasHighLevelRole = user?.roles?.some((r: any) => {
            const role = typeof r === 'string' ? r : r.role;
            return ['ORG_ADMIN', 'EVENT_MANAGER', 'DEPARTMENT_HEAD'].includes(role);
        });
        if (hasHighLevelRole) return true;

        // Service Supervisor for THIS service
        // Check if user has SERVICE_SUPERVISOR role for this service_id
        return user?.roles?.some((r: any) => {
            if (typeof r === 'string') return false;
            return r.role === 'SERVICE_SUPERVISOR' && r.service_id === serviceId;
        });
    }, [user, serviceId]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [instanceData, devicesData, allDevicesData, usersResponse] = await Promise.all([
                departmentServicesApi.getById(serviceId),
                departmentServicesApi.getDevices(serviceId),
                devicesApi.getAll(),
                usersApi.getAll({ service_id: serviceId } as any)
            ]);

            setServiceInstance(instanceData);

            // Debug: Log the dashboard layout to understand what's being returned
            console.log('🔍 DEBUG: Service Instance Data:', instanceData);
            console.log('🔍 DEBUG: main_dashboard_layout:', instanceData?.main_dashboard_layout);
            console.log('🔍 DEBUG: widgets:', instanceData?.main_dashboard_layout?.widgets);

            setAssignedDevices(Array.isArray(devicesData) ? devicesData : (devicesData?.data || []));
            setAvailableDevices(Array.isArray(allDevicesData) ? allDevicesData : (allDevicesData?.data || []));

            // Filter users to only show those with roles in this service
            const allUsers = usersResponse?.data || (Array.isArray(usersResponse) ? usersResponse : []);
            const filteredUsers = allUsers.filter((u: any) =>
                u.roles?.some((r: any) => r.service_id === serviceId || (typeof r === 'object' && r.service_id === serviceId))
            );
            setServiceUsers(filteredUsers);

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



    const handleCreateUser = () => {
        setAddUserTab('create');
        setShowAddUserModal(true);
    };

    const handleAddExistingUser = async (userToAdd: any) => {
        try {
            setIsSubmittingUser(true);

            // 1. Get current user roles to ensure we don't overwrite
            const userData = await usersApi.getById(userToAdd.id);
            const currentRoles = userData.roles || [];

            // 2. Add new role
            const newRole = {
                role: newUserForm.role, // Default to selected role or VIEWER
                service_id: serviceId,
                department_id: deptId,
                event_id: eventId,
                organization_id: serviceInstance.organization_id
            };

            // Check if already has this role for this service
            const exists = currentRoles.some((r: any) =>
                r.service_id === serviceId && r.role === newUserForm.role
            );

            if (exists) {
                toast.error('User already has this role in this service');
                return;
            }

            const updatedRoles = [...currentRoles, newRole];

            // 3. Update user
            await usersApi.update(userToAdd.id, { roles: updatedRoles });

            // 4. Send Notification
            await systemNotificationsApi.create({
                type: 'info',
                title: 'New Service Assignment',
                message: `You have been assigned the role of ${newUserForm.role} in service ${serviceInstance.service_name}`,
                source: 'service_instance',
                source_id: serviceId
            });

            // Email would be handled by backend or manually here if API existed
            toast.success(`User ${userToAdd.full_name} added successfully`);

            setShowAddUserModal(false);
            loadData();
        } catch (error: any) {
            console.error('Failed to add user:', error);
            toast.error(error.response?.data?.error || 'Failed to add user');
        } finally {
            setIsSubmittingUser(false);
        }
    };

    const handleCreateNewUser = async () => {
        try {
            if (!newUserForm.email || !newUserForm.password || !newUserForm.full_name) {
                toast.error('Please fill in all required fields');
                return;
            }

            setIsSubmittingUser(true);

            const payload = {
                ...newUserForm,
                organization_id: serviceInstance.organization_id,
                roles: [{
                    role: newUserForm.role,
                    service_id: serviceId,
                    department_id: deptId,
                    event_id: eventId,
                    organization_id: serviceInstance.organization_id
                }]
            };

            await usersApi.create(payload);

            toast.success('User created and notified via email');
            setShowAddUserModal(false);
            setNewUserForm({ full_name: '', email: '', password: '', role: 'TECHNICIAN' });
            loadData();
        } catch (error: any) {
            console.error('Failed to create user:', error);
            toast.error(error.response?.data?.error || 'Failed to create user');
        } finally {
            setIsSubmittingUser(false);
        }
    };



    const filteredOrgUsers = orgUsers.filter(u =>
    (u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()))
    );

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

                {/* Tabs */}
                <div className="border-b border-border">
                    <div className="flex gap-6">
                        {['dashboard', 'devices', 'users'].map((view) => (
                            <button
                                key={view}
                                onClick={() => setCurrentView(view as any)}
                                className={`pb-3 px-1 border-b-2 transition-colors text-sm font-medium capitalize ${currentView === view
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {view}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content: Dashboard */}
                {currentView === 'dashboard' && (
                    <div className="space-y-6">

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
                                <div className="bg-card border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
                                            <LayoutDashboard className="w-5 h-5 text-muted-foreground/70" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm">Service Dashboard Not Configured</h4>
                                            <p className="text-muted-foreground text-xs">
                                                The dashboard layout hasn't been configured yet.
                                            </p>
                                        </div>
                                    </div>
                                    {serviceInstance.service_template_id && canConfigure && (
                                        <button
                                            onClick={() => router.push(`/admin/services/${serviceInstance.service_template_id}/dashboard`)}
                                            className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                                        >
                                            <Settings className="w-4 h-4 text-white" />
                                            Configure
                                        </button>
                                    )}
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
                    </div>
                )}

                {/* Devices Section */}
                {currentView === 'devices' && (
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
                )}

                {/* Users Section */}
                {currentView === 'users' && (
                    <div className="bg-card border border-border rounded-xl shadow-sm">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Service Users
                            </h3>
                            {canConfigure && (
                                <button
                                    onClick={handleCreateUser}
                                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Add User
                                </button>
                            )}
                        </div>
                        <div className="p-6">
                            {serviceUsers.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">No users found for this service.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {serviceUsers.map((user: any) => (
                                        <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                                                {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm truncate">{user.full_name || 'Unnamed User'}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {user.roles?.filter((r: any) => !r.service_id || r.service_id === serviceId).map((r: any) => (
                                                        <span key={r.role || r} className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                                            {(r.role || r).replace('_', ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

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

                {/* Add User Modal */}
                {showAddUserModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">Add User to Service</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Grant access to this service
                                    </p>
                                </div>
                                <button onClick={() => setShowAddUserModal(false)} className="p-2 hover:bg-muted rounded-full">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex border-b border-border px-6">
                                <button
                                    onClick={() => setAddUserTab('create')}
                                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${addUserTab === 'create' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                                >
                                    Create New User
                                </button>
                                <button
                                    onClick={() => setAddUserTab('existing')}
                                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${addUserTab === 'existing' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                                >
                                    Select Existing User
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {addUserTab === 'existing' ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <div className="w-1/3">
                                                <select
                                                    className="w-full h-10 px-2 bg-background border border-border rounded-lg text-sm"
                                                    value={roleFilter}
                                                    onChange={(e) => setRoleFilter(e.target.value)}
                                                >
                                                    <option value="TECHNICIAN" selected>Technician</option>
                                                    <option value="VIEWER">Viewer</option>
                                                    <option value="SERVICE_SUPPLIER">Service Supplier</option>
                                                </select>
                                            </div>
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by name or email..."
                                                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                    value={userSearchQuery}
                                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Role to Assign</label>
                                                <select
                                                    className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                                                    value={newUserForm.role}
                                                    onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                                                >
                                                    <option value="VIEWER">Viewer (Read Only)</option>
                                                    <option value="TECHNICIAN">Technician (Operate Devices)</option>
                                                    <option value="SERVICE_SUPPLIER">Service Supplier</option>
                                                </select>
                                            </div>

                                            <div className="h-[300px] overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                                                {filteredOrgUsers.length === 0 ? (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                        <p>No matching users found.</p>
                                                    </div>
                                                ) : (
                                                    filteredOrgUsers.map(user => (
                                                        <div key={user.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg border border-transparent hover:border-border transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                                                                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm">{user.full_name}</p>
                                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleAddExistingUser(user)}
                                                                disabled={isSubmittingUser}
                                                                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded text-xs font-medium transition-colors"
                                                            >
                                                                {isSubmittingUser ? 'Adding...' : 'Add'}
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-w-md mx-auto py-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Full Name</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 bg-background border border-border rounded-lg"
                                                placeholder="John Doe"
                                                value={newUserForm.full_name}
                                                onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Email Address</label>
                                            <input
                                                type="email"
                                                className="w-full p-2 bg-background border border-border rounded-lg"
                                                placeholder="john@example.com"
                                                value={newUserForm.email}
                                                onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Password</label>
                                            <input
                                                type="password"
                                                className="w-full p-2 bg-background border border-border rounded-lg"
                                                placeholder="••••••••"
                                                value={newUserForm.password}
                                                onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                                            />
                                            <p className="text-xs text-muted-foreground">User will receive these credentials via email.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Role</label>
                                            <select
                                                className="w-full p-2 bg-background border border-border rounded-lg"
                                                value={newUserForm.role}
                                                onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                                            >
                                                <option value="VIEWER">Viewer</option>
                                                <option value="TECHNICIAN">Technician</option>
                                                <option value="SERVICE_SUPERVISOR">Service Supervisor</option>
                                            </select>
                                        </div>

                                        <button
                                            onClick={handleCreateNewUser}
                                            disabled={isSubmittingUser}
                                            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mt-6 flex items-center justify-center gap-2"
                                        >
                                            {isSubmittingUser ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4" />
                                                    Create User
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
