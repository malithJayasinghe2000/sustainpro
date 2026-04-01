'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useState, useEffect, use, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { departmentServicesApi, devicesApi, usersApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';
import ProvisioningModal from '@/components/provisioning/ProvisioningModal';
import WidgetRenderer from '@/components/dashboard/WidgetRenderer';
import DeviceTable from '@/components/devices/DeviceTable';
import { WidgetConfig } from '@/types/dashboard';
import { hasRole, ROLES, ROLE_LABELS, isAdmin } from '@/lib/roles';
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
    Search,
    X,
    Check,
    FileText,
    Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { systemNotificationsApi } from '@/lib/api';
import PasswordRequirements, { usePasswordValidation } from '@/components/PasswordRequirements';

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

    const [liveDeviceUpdates, setLiveDeviceUpdates] = useState<Record<string, any>>({});

    // View State
    const [currentView, setCurrentView] = useState<'dashboard' | 'devices' | 'users'>('dashboard');

    // Modals
    const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showProvisioningModal, setShowProvisioningModal] = useState(false);

    // Modal State
    // Modal State
    const [activeTab, setActiveTab] = useState<'existing' | 'create'>('create');

    // User Modal State (aligned with DepartmentUsers)
    const [addUserTab, setAddUserTab] = useState<'existing' | 'create'>('existing');
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [selectedExistingUser, setSelectedExistingUser] = useState<any | null>(null);
    const [roleFilter, setRoleFilter] = useState('');

    const [newUserForm, setNewUserForm] = useState({
        full_name: '',
        email: '',
        password: '',
        // role is handled by selectedRole state now logic-wise, or we keep it here.
        // DepartmentUsers separates it. Let's separate it for consistency.
    });
    const [selectedRole, setSelectedRole] = useState('');
    const [isSubmittingUser, setIsSubmittingUser] = useState(false);

    // Report State
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');
    const [reportDeviceId, setReportDeviceId] = useState('');

    const { isValid: isPasswordValid } = usePasswordValidation(newUserForm.password);

    // Filter logic same as DepartmentUsers
    useEffect(() => {
        const timer = setTimeout(() => {
            if (userSearchQuery.length >= 2 && addUserTab === 'existing') {
                performUserLookup();
            } else if (addUserTab === 'existing' && !userSearchQuery && !roleFilter) {
                setUserSearchResults([]);
            } else if (addUserTab === 'existing' && roleFilter) {
                performUserLookup();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [userSearchQuery, addUserTab, roleFilter]);

    const performUserLookup = async () => {
        if (!serviceInstance?.organization_id) return;

        setIsSearchingUsers(true);
        try {
            const params: any = {
                organization_id: serviceInstance.organization_id,
                limit: 50
            };

            if (userSearchQuery) params.search = userSearchQuery;
            if (roleFilter) params.role = roleFilter;

            if (!userSearchQuery && !roleFilter) {
                setIsSearchingUsers(false);
                setUserSearchResults([]);
                return;
            }

            const response = await usersApi.getAll(params);
            const results = Array.isArray(response) ? response : (response.data || []);

            // Filter out users already in this service
            // serviceUsers contains users in this service
            const existingIds = serviceUsers.map(u => u.id);
            const filtered = results.filter((u: any) => !existingIds.includes(u.id));

            setUserSearchResults(filtered);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearchingUsers(false);
        }
    };


    const assignedDevicesRef = useRef(assignedDevices);

    useEffect(() => {
        assignedDevicesRef.current = assignedDevices;
    }, [assignedDevices]);

    useEffect(() => {
        loadData();
    }, [serviceId]);

    useEffect(() => {
        const socket = getSocket();

        const handleTelemetry = (payload: any) => {
            console.log('📡 Telemetry received:', payload);

            // Update live updates map for DeviceTable
            setLiveDeviceUpdates(prev => ({
                ...prev,
                [payload.device_code]: {
                    status: 'ONLINE',
                    last_seen: payload.timestamp || new Date().toISOString(),
                    metadata: payload.data
                }
            }));

            // Update assigned devices with new telemetry data
            setAssignedDevices((prev: any[]) => prev.map(device => {
                // Check if device matches by hardware_id or device_code
                const matches = (device.hardware_id && device.hardware_id === payload.hardware_id) ||
                    (device.device_code && device.device_code === payload.device_code);

                if (matches) {
                    return {
                        ...device,
                        status: 'ONLINE',
                        last_seen: payload.timestamp || new Date().toISOString(),
                        metadata: {
                            ...(device.metadata || {}), // Handle null metadata
                            ...payload.data
                        }
                    };
                }
                return device;
            }));

            // Only update aggregated data if the device belongs to this service AND we found it
            const deviceInService = assignedDevicesRef.current.some(d =>
                (d.hardware_id && d.hardware_id === payload.hardware_id) ||
                (d.device_code && d.device_code === payload.device_code)
            );

            if (deviceInService) {
                // Also update aggregated data for dashboard widgets
                setAggregatedData((prev: Record<string, any>) => ({
                    ...prev,
                    ...payload.data,
                    status: 'ONLINE',
                    last_seen: payload.timestamp || new Date().toISOString()
                }));
            }
        };

        const onConnect = () => {
            console.log('✅ Socket connected:', socket.id);
            socket.emit('subscribe:event', eventId);
            socket.emit('subscribe:department', deptId);
            socket.emit('subscribe:service', serviceId); // Subscribe to service room

            if (serviceInstance?.organization_id) {
                socket.emit('subscribe:organization', serviceInstance.organization_id);
            }
        };

        if (socket.connected) {
            onConnect();
        }

        socket.on('connect', onConnect);
        socket.on('telemetry', handleTelemetry);
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
        }, 5000);

        return () => {
            socket.off('connect', onConnect);
            socket.off('telemetry', handleTelemetry);
            socket.off('dashboard:telemetry', handleTelemetry);
            clearInterval(offlineCheckInterval);
        };
    }, [serviceId, eventId, deptId, serviceInstance?.organization_id]); // Re-subscribe if org ID loads later

    const canConfigure = useMemo(() => {
        if (!user) return false;
        if (user.is_super_admin) return true;

        // Check high-level roles using standard helper
        if (hasRole(user, ['ORG_ADMIN', 'EVENT_MANAGER', 'DEPT_HEAD'])) {
            return true;
        }

        // Service Supervisor for THIS specific service
        return user.roles?.some((r: any) =>
            r.role === 'SERVICE_SUPERVISOR' && r.service_id === serviceId
        );
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
                    <LoadingSpinner className="" />
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



    const closeUserModal = () => {
        setShowAddUserModal(false);
        setNewUserForm({ full_name: '', email: '', password: '' });
        setSelectedRole('');
        setUserSearchQuery('');
        setUserSearchResults([]);
        setSelectedExistingUser(null);
        setAddUserTab('existing');
        setRoleFilter('');
    };

    const handleCreateUser = () => {
        if (isAdmin(user) || user?.is_super_admin) {
            const params = new URLSearchParams({
                organization_id: serviceInstance?.organization_id || '',
                event_id: eventId,
                department_id: deptId,
                service_id: serviceId,
                return_url: window.location.pathname
            });
            router.push(`/users/new?${params.toString()}`);
        } else {
            closeUserModal(); // Reset first
            setShowAddUserModal(true);
        }
    };

    const handleAddExistingUser = async () => {
        if (!selectedExistingUser || !selectedRole) return;

        try {
            setIsSubmittingUser(true);

            // 1. Get current user roles to ensure we don't overwrite
            const userData = await usersApi.getById(selectedExistingUser.id);
            const currentRoles = userData.roles || [];

            // 2. Add new role
            const newRole = {
                role: selectedRole,
                service_id: serviceId,
                department_id: deptId,
                event_id: eventId,
                organization_id: serviceInstance.organization_id
            };

            // Check if already has this role for this service
            const exists = currentRoles.some((r: any) =>
                r.service_id === serviceId && r.role === selectedRole
            );

            if (exists) {
                toast.error('User already has this role in this service');
                return;
            }

            const updatedRoles = [...currentRoles, newRole];

            // 3. Update user
            await usersApi.update(selectedExistingUser.id, { roles: updatedRoles });

            // 4. Send Notification
            await systemNotificationsApi.create({
                type: 'info',
                title: 'New Service Assignment',
                message: `You have been assigned the role of ${ROLE_LABELS[selectedRole] || selectedRole} in service ${serviceInstance.service_name}`,
                source: 'service_instance',
                source_id: serviceId
            });

            toast.success(`User ${selectedExistingUser.full_name} added successfully`);

            closeUserModal();
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

            if (!selectedRole) {
                toast.error('Please select a role');
                return;
            }

            if (!isPasswordValid) {
                toast.error('Password does not meet requirements');
                return;
            }

            setIsSubmittingUser(true);

            const payload = {
                ...newUserForm,
                organization_id: serviceInstance.organization_id,
                roles: [{
                    role: selectedRole,
                    service_id: serviceId,
                    department_id: deptId,
                    event_id: eventId,
                    organization_id: serviceInstance.organization_id
                }]
            };

            await usersApi.create(payload);

            toast.success('User created and notified via email');
            closeUserModal();
            loadData();
        } catch (error: any) {
            console.error('Failed to create user:', error);
            toast.error(error.response?.data?.error || 'Failed to create user');
        } finally {
            setIsSubmittingUser(false);
        }
    };


    const handleGenerateReport = async () => {
        if (!reportStartDate || !reportEndDate) {
            toast.error('Please select a date range');
            return;
        }

        try {
            const loadingToast = toast.loading('Generating report...');

            // Call API to get blob
            // We use the configured apiClient which handles Auth automatically
            const response = await import('@/lib/api').then(m => m.default.get(`/department-services/${serviceId}/report`, {
                params: {
                    start_date: new Date(reportStartDate).toISOString(),
                    end_date: new Date(reportEndDate).toISOString(),
                    device_id: reportDeviceId || undefined
                },
                responseType: 'blob'
            }));

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `service_report_${serviceId}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.dismiss(loadingToast);
            toast.success('Report generated successfully');
        } catch (error) {
            console.error('Report generation failed:', error);
            toast.error('Failed to generate report');
        }
    };





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

                        {/* Report Generation Section */}
                        {canConfigure && (
                            <div className="bg-card border border-border rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <h3 className="font-semibold">Generate Reports</h3>
                                </div>
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-muted-foreground">Device (Optional)</label>
                                        <select
                                            className="px-3 py-2 bg-background border border-border rounded-lg text-sm min-w-[200px]"
                                            value={reportDeviceId}
                                            onChange={(e) => setReportDeviceId(e.target.value)}
                                        >
                                            <option value="">All Service Devices</option>
                                            {assignedDevices.map((d: any) => (
                                                <option key={d.id} value={d.id}>{d.name || d.device_code}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-muted-foreground">From</label>
                                        <input
                                            type="datetime-local"
                                            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                            value={reportStartDate}
                                            onChange={(e) => setReportStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-muted-foreground">To</label>
                                        <input
                                            type="datetime-local"
                                            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                            value={reportEndDate}
                                            onChange={(e) => setReportEndDate(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleGenerateReport}
                                        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download CSV
                                    </button>
                                </div>
                            </div>
                        )}

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
                            liveUpdates={liveDeviceUpdates}
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
                        eventId={eventId}
                        deptId={deptId}
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
                                <button onClick={closeUserModal} className="p-2 hover:bg-muted rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="space-y-6">
                                    {/* Tabs */}
                                    <div className="flex bg-muted rounded-lg p-1">
                                        <button
                                            onClick={() => setAddUserTab('existing')}
                                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${addUserTab === 'existing'
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            Add Existing User
                                        </button>
                                        <button
                                            onClick={() => setAddUserTab('create')}
                                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${addUserTab === 'create'
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            Create New User
                                        </button>
                                    </div>

                                    {addUserTab === 'existing' ? (
                                        <div className="space-y-4">
                                            {!selectedExistingUser ? (
                                                <div>
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium mb-1">Select Role to Filter</label>
                                                        <select
                                                            value={roleFilter}
                                                            onChange={(e) => setRoleFilter(e.target.value)}
                                                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                                        >
                                                            <option value="" disabled>-- Select Role --</option>
                                                            {[ROLES.SERVICE_SUPERVISOR, ROLES.TECHNICIAN, ROLES.SERVICE_SUPPLIER, ROLES.VIEWER].map(role => (
                                                                <option key={role} value={role}>
                                                                    {ROLE_LABELS[role] || role}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {roleFilter && (
                                                        <>
                                                            <label className="block text-sm font-medium mb-1">Search User (Optional)</label>
                                                            <div className="relative mb-4">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                                <input
                                                                    type="text"
                                                                    value={userSearchQuery}
                                                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                                                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background"
                                                                    placeholder="Search by name or email..."
                                                                />
                                                            </div>

                                                            <div className="mt-2 border border-border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                                                {isSearchingUsers ? (
                                                                    <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                                                                ) : userSearchResults.length > 0 ? (
                                                                    <div className="divide-y divide-border">
                                                                        {userSearchResults.map(u => (
                                                                            <button
                                                                                key={u.id}
                                                                                onClick={() => {
                                                                                    setSelectedExistingUser(u);
                                                                                    setSelectedRole(roleFilter); // Auto-select the filtered role
                                                                                }}
                                                                                className="w-full flex items-center px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                                                                            >
                                                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                                                                    <span className="text-xs font-semibold text-primary">
                                                                                        {u.full_name?.charAt(0) || u.email.charAt(0)}
                                                                                    </span>
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-sm font-medium">{u.full_name}</div>
                                                                                    <div className="text-xs text-muted-foreground">{u.email}</div>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                                        No users found with role {ROLE_LABELS[roleFilter] || roleFilter}.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                    {!roleFilter && (
                                                        <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                                                            Please select a role above to see available users.
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                                            <Check className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{selectedExistingUser.full_name}</div>
                                                            <div className="text-sm text-muted-foreground">{selectedExistingUser.email}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedExistingUser(null)}
                                                        className="p-2 hover:bg-muted rounded-full transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            {selectedExistingUser && (
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Assign Role</label>
                                                    <select
                                                        required
                                                        value={selectedRole}
                                                        onChange={e => setSelectedRole(e.target.value)}
                                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                                    >
                                                        <option value="">Select Role</option>
                                                        {[ROLES.SERVICE_SUPERVISOR, ROLES.TECHNICIAN, ROLES.SERVICE_SUPPLIER, ROLES.VIEWER].map(role => (
                                                            <option key={role} value={role}>
                                                                {ROLE_LABELS[role] || role}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                                <button
                                                    onClick={closeUserModal}
                                                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddExistingUser}
                                                    disabled={!selectedExistingUser || !selectedRole || isSubmittingUser}
                                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSubmittingUser ? 'Adding...' : 'Add User'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newUserForm.full_name}
                                                    onChange={e => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={newUserForm.email}
                                                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Password</label>
                                                <div className="relative">
                                                    <input
                                                        type="password"
                                                        required
                                                        value={newUserForm.password}
                                                        onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background mb-2"
                                                        placeholder="Note: Must meet security requirements"
                                                    />
                                                    <PasswordRequirements password={newUserForm.password} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Role</label>
                                                <select
                                                    required
                                                    value={selectedRole}
                                                    onChange={e => setSelectedRole(e.target.value)}
                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                                >
                                                    <option value="">Select Role</option>
                                                    {[ROLES.SERVICE_SUPERVISOR, ROLES.TECHNICIAN, ROLES.SERVICE_SUPPLIER, ROLES.VIEWER].map(role => (
                                                        <option key={role} value={role}>
                                                            {ROLE_LABELS[role] || role}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                                <button
                                                    onClick={closeUserModal}
                                                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleCreateNewUser}
                                                    disabled={isSubmittingUser || !isPasswordValid}
                                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                >
                                                    {isSubmittingUser ? 'Creating...' : 'Create & Add'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
