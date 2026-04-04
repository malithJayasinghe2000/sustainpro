'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { alertsApi } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import TimeDisplay from '@/components/TimeDisplay';
import { cn } from '@/lib/utils';
import {
    Bell,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    Clock,
    Filter,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    User,
    Monitor,
    X,
    Eye,
    XCircle,
    Check,
    ArrowUp,
    ThumbsUp,
    Download,
    Calendar,
    Building2,
    Layers,
    Smartphone,
    Globe,
    Settings,
} from 'lucide-react';
import { RichSelect } from '@/components/ui/RichSelect';
import {
    organizationsApi,
    eventsApi,
    departmentsApi,
    departmentServicesApi,
    escalationsApi
} from '@/lib/api';
import { toast } from 'sonner';

interface Alert {
    id: string;
    organization_id: string;
    event_id: string | null;
    department_id: string | null;
    service_id: string | null;
    device_id: string;
    rule_id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED' | 'VERIFIED';
    message: string;
    value: any;
    threshold: any;
    acknowledged_by: string | null;
    acknowledged_at: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    escalation_level: number;
    auto_assigned_to: string | null;
    metadata: Record<string, any> | null;
    created_at: string;
    updated_at: string;
    device?: {
        id: number;
        name: string;
        type: string | null;
    };
    rule?: {
        id: string;
        name: string;
    };
    organization?: {
        id: string;
        name: string;
    };
    event?: {
        id: string;
        name: string;
    };
    department?: {
        id: string;
        name: string;
    };
    service?: {
        id: string;
        service_template?: {
            id: string;
            name: string;
        };
    };
    acknowledged_by_user?: {
        id: string;
        full_name: string;
        email: string;
    };
    resolved_by_user?: {
        id: string;
        full_name: string;
        email: string;
    };
    assigned_to_user?: {
        id: string;
        full_name: string;
        email: string;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// Severity badge config
const getSeverityBadge = (severity: string) => {
    switch (severity) {
        case 'CRITICAL':
            return { icon: AlertTriangle, color: 'bg-red-500/10 text-red-600 border-red-500/20' };
        case 'HIGH':
            return { icon: AlertCircle, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
        case 'MEDIUM':
            return { icon: Bell, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
        case 'LOW':
            return { icon: Bell, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
        default:
            return { icon: Bell, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
    }
};

// Status badge config
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'ACTIVE':
            return { icon: AlertTriangle, color: 'bg-red-500/10 text-red-600 border-red-500/20' };
        case 'ACKNOWLEDGED':
            return { icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
        case 'RESOLVED':
            return { icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
        case 'EXPIRED':
            return { icon: XCircle, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
        case 'VERIFIED':
            return { icon: ThumbsUp, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
        default:
            return { icon: Bell, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
    }
};

export default function AlertsPage() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [severityFilter, setSeverityFilter] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    // Action states
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Detail modal
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

    const isSuperAdmin = user?.is_super_admin;
    const [isExporting, setIsExporting] = useState(false);

    // Cascading Filter States
    const [selectedOrg, setSelectedOrg] = useState<string>('ALL');
    const [selectedEvent, setSelectedEvent] = useState<string>('ALL');
    const [selectedDept, setSelectedDept] = useState<string>('ALL');
    const [selectedService, setSelectedService] = useState<string>('ALL');
    const [selectedDevice, setSelectedDevice] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Options States
    const [orgOptions, setOrgOptions] = useState<{ value: string; label: string }[]>([]);
    const [eventOptions, setEventOptions] = useState<{ value: string; label: string }[]>([]);
    const [deptOptions, setDeptOptions] = useState<{ value: string; label: string }[]>([]);
    const [serviceOptions, setServiceOptions] = useState<{ value: string; label: string }[]>([]);
    const [deviceOptions, setDeviceOptions] = useState<{ value: string; label: string }[]>([]);

    // Loading States for Dropdowns
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [loadingDepts, setLoadingDepts] = useState(false);
    const [loadingServices, setLoadingServices] = useState(false);
    const [loadingDevices, setLoadingDevices] = useState(false);

    // Initial Load & Role Restrictions
    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;

            setLoadingOrgs(true);
            try {
                // Determine restrictions based on role
                let restrictedOrgId: string | undefined;
                let restrictedEventId: string | undefined;

                if (!isSuperAdmin) {
                    const orgAdminRole = user.roles.find(r => r.role === 'ORG_ADMIN');
                    const eventManagerRole = user.roles.find(r => r.role === 'EVENT_MANAGER');

                    if (orgAdminRole?.org_id) {
                        restrictedOrgId = orgAdminRole.org_id;
                    } else if (eventManagerRole) {
                        if (eventManagerRole.org_id) restrictedOrgId = eventManagerRole.org_id;
                        if (eventManagerRole.event_id) restrictedEventId = eventManagerRole.event_id;
                    } else if (user.organization_id) {
                        restrictedOrgId = user.organization_id;
                    }
                }

                // Fetch Organizations (if super admin or need to populate list)
                // Even restricted users might want to see the "read-only" selected option
                let orgsData = [];
                if (isSuperAdmin) {
                    const response = await organizationsApi.getAll({ limit: 100 });
                    orgsData = response.data || [];
                } else if (restrictedOrgId) {
                    // Fetch just the one org to display nicely
                    const org = await organizationsApi.getById(restrictedOrgId);
                    if (org && org.data) orgsData = [org.data];
                    else if (org) orgsData = [org]; // Handle inconsistent API return
                }

                setOrgOptions([
                    { value: 'ALL', label: 'All Organizations' },
                    ...orgsData.map((o: any) => ({ value: o.id, label: o.name }))
                ]);

                // Apply restrictions
                if (restrictedOrgId) setSelectedOrg(restrictedOrgId);
                if (restrictedEventId) setSelectedEvent(restrictedEventId);

            } catch (err) {
                console.error("Failed to load initial filter data", err);
            } finally {
                setLoadingOrgs(false);
            }
        };

        loadInitialData();
    }, [user, isSuperAdmin]);

    // Cascade 1: Org -> Events
    useEffect(() => {
        const loadEvents = async () => {
            if (selectedOrg === 'ALL') {
                setEventOptions([]);
                setEventOptions([{ value: 'ALL', label: 'All Events' }]); // default
                if (selectedEvent !== 'ALL') setSelectedEvent('ALL');
                return;
            }

            setLoadingEvents(true);
            try {
                const data = await eventsApi.getByOrg(selectedOrg);
                setEventOptions([
                    { value: 'ALL', label: 'All Events' },
                    ...(Array.isArray(data) ? data : []).map((e: any) => ({ value: e.id, label: e.name }))
                ]);

                // If current selected event is not in new list (and not ALL), reset it
                // Exception: If it was set by role restriction in initial load, it SHOULD be in the list
                // We don't force reset here immediately if it matches logic
            } catch (err) {
                console.error(err);
                setEventOptions([{ value: 'ALL', label: 'All Events' }]);
            } finally {
                setLoadingEvents(false);
            }
        };
        loadEvents();
    }, [selectedOrg]);

    // Cascade 2: Event -> Departments
    useEffect(() => {
        const loadDepts = async () => {
            // Reset downstream if upstream changes
            if (selectedEvent === 'ALL') {
                setDeptOptions([{ value: 'ALL', label: 'All Departments' }]);
                if (selectedDept !== 'ALL') setSelectedDept('ALL');
                return;
            }

            setLoadingDepts(true);
            try {
                const data = await departmentsApi.getByEvent(selectedEvent);
                setDeptOptions([
                    { value: 'ALL', label: 'All Departments' },
                    ...(Array.isArray(data) ? data : []).map((d: any) => ({ value: d.id, label: d.name }))
                ]);
            } catch (err) {
                console.error(err);
                setDeptOptions([{ value: 'ALL', label: 'All Departments' }]);
            } finally {
                setLoadingDepts(false);
            }
        };
        loadDepts();
    }, [selectedEvent]);

    // Cascade 3: Department -> Services
    useEffect(() => {
        const loadServices = async () => {
            if (selectedDept === 'ALL') {
                setServiceOptions([{ value: 'ALL', label: 'All Services' }]);
                if (selectedService !== 'ALL') setSelectedService('ALL');
                return;
            }

            setLoadingServices(true);
            try {
                // Note: departmentsApi.getServices returns object structure
                const response = await departmentsApi.getServices(selectedDept);
                // response.data is likely the array of services (through service_templates)
                // Need to check API structure carefully. Usually returns data: Array
                const services = response.data || [];

                setServiceOptions([
                    { value: 'ALL', label: 'All Services' },
                    ...services.map((s: any) => ({
                        value: s.id,
                        label: s.service_template?.name || s.name || 'Unnamed Service'
                    }))
                ]);
            } catch (err) {
                console.error(err);
                setServiceOptions([{ value: 'ALL', label: 'All Services' }]);
            } finally {
                setLoadingServices(false);
            }
        };
        loadServices();
    }, [selectedDept]);

    // Cascade 4: Service -> Devices
    useEffect(() => {
        const loadDevices = async () => {
            if (selectedService === 'ALL') {
                setDeviceOptions([{ value: 'ALL', label: 'All Devices' }]);
                if (selectedDevice !== 'ALL') setSelectedDevice('ALL');
                return;
            }

            setLoadingDevices(true);
            try {
                // departmentServicesApi.getDevices
                const response = await departmentServicesApi.getDevices(selectedService, { limit: 100 });
                const devices = response.data || [];

                setDeviceOptions([
                    { value: 'ALL', label: 'All Devices' },
                    ...devices.map((d: any) => ({
                        value: d.id.toString(), // Ensure string for select
                        label: d.name
                    }))
                ]);
            } catch (err) {
                console.error(err);
                setDeviceOptions([{ value: 'ALL', label: 'All Devices' }]);
            } finally {
                setLoadingDevices(false);
            }
        };
        loadDevices();
    }, [selectedService]);


    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params: any = {
                page: pagination.page,
                limit: pagination.limit,
            };

            if (statusFilter) params.status = statusFilter;
            if (severityFilter) params.severity = severityFilter;

            // New Filters
            if (selectedOrg !== 'ALL') params.organization_id = selectedOrg;
            if (selectedEvent !== 'ALL') params.event_id = selectedEvent;
            if (selectedDept !== 'ALL') params.department_id = selectedDept;
            if (selectedService !== 'ALL') params.service_id = selectedService;
            if (selectedDevice !== 'ALL') params.device_id = selectedDevice;
            if (startDate) params.from_date = startDate;
            if (endDate) params.to_date = endDate;

            const response = await alertsApi.getAll(params);

            if (response.success) {
                setAlerts(response.data as unknown as Alert[]);
                setPagination((prev) => ({
                    ...prev,
                    total: response.pagination?.total || 0,
                    totalPages: response.pagination?.totalPages || 0,
                }));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch alerts');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, statusFilter, severityFilter, selectedOrg, selectedEvent, selectedDept, selectedService, selectedDevice, startDate, endDate]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // Reset page when filters change (include new filters)
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [statusFilter, severityFilter, selectedOrg, selectedEvent, selectedDept, selectedService, selectedDevice, startDate, endDate]);


    const handleExport = async () => {
        setIsExporting(true);
        try {
            // Fetch all matching data
            const params: any = {
                page: 1,
                limit: 10000, // Large limit for export
            };

            if (statusFilter) params.status = statusFilter;
            if (severityFilter) params.severity = severityFilter;
            if (selectedOrg !== 'ALL') params.organization_id = selectedOrg;
            if (selectedEvent !== 'ALL') params.event_id = selectedEvent;
            if (selectedDept !== 'ALL') params.department_id = selectedDept;
            if (selectedService !== 'ALL') params.service_id = selectedService;
            if (selectedDevice !== 'ALL') params.device_id = selectedDevice;
            if (startDate) params.from_date = startDate;
            if (endDate) params.to_date = endDate;

            const response = await alertsApi.getAll(params);

            if (response.success && response.data.length > 0) {
                const headers = ['ID', 'Time', 'Severity', 'Status', 'Message', 'Device', 'Organization', 'Event', 'Department'];
                const csvContent = [
                    headers.join(','),
                    ...response.data.map((alert: any) => [
                        alert.id,
                        `"${new Date(alert.created_at).toLocaleString()}"`,
                        alert.severity,
                        alert.status,
                        `"${alert.message?.replace(/"/g, '""') || ''}"`,
                        `"${alert.device?.name || ''}"`,
                        `"${alert.organization?.name || ''}"`,
                        `"${alert.event?.name || ''}"`,
                        `"${alert.department?.name || ''}"`
                    ].join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `alerts_export_${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Export downloaded successfully');
            } else {
                toast.error('No data to export');
            }

        } catch (err) {
            console.error(err);
            toast.error('Failed to export data');
        } finally {
            setIsExporting(false);
        }
    };

    const handleAcknowledge = async (alertId: string) => {
        setActionLoading(alertId);
        try {
            const response = await alertsApi.acknowledge(alertId);
            if (response.success) {
                // Also attempt to acknowledge any existing escalation
                try {
                     const escalations = await escalationsApi.getAll({ alert_id: alertId, limit: 1 });
                     if (escalations.success && escalations.data?.length > 0 && escalations.data[0].status === 'OPEN') {
                          await escalationsApi.acknowledge(escalations.data[0].id);
                     }
                } catch(e) {
                     console.error('Failed to sync escalation acknowledge', e);
                }

                toast.success('Alert Acknowledged', {
                    description: `Alert has been successfully acknowledged by you.`
                });
                fetchAlerts();
            }
        } catch (err: any) {
            toast.error('Action Failed', {
                description: err.message || 'Failed to acknowledge alert'
            });
            setError(err.message || 'Failed to acknowledge alert');
        } finally {
            setActionLoading(null);
        }
    };

    const handleResolve = async (alertId: string) => {
        setActionLoading(alertId);
        try {
            const response = await alertsApi.resolve(alertId);
            if (response.success) {
                // Also attempt to resolve any existing escalation
                try {
                     const escalations = await escalationsApi.getAll({ alert_id: alertId, limit: 1 });
                     if (escalations.success && escalations.data?.length > 0 && escalations.data[0].status !== 'RESOLVED') {
                          await escalationsApi.resolve(escalations.data[0].id, {
                              resolution_notes: 'Resolved via Alert Page'
                          });
                     }
                } catch(e) {
                     console.error('Failed to sync escalation resolve', e);
                }

                toast.success('Alert Resolved', {
                    description: `Alert has been successfully resolved.`
                });
                fetchAlerts();
            }
        } catch (err: any) {
            toast.error('Action Failed', {
                description: err.message || 'Failed to resolve alert'
            });
            setError(err.message || 'Failed to resolve alert');
        } finally {
            setActionLoading(null);
        }
    };

    const handleEscalate = async (alertId: string, assignTo?: string) => {
        setActionLoading(alertId);
        try {
            // Get current alert to determine next level
            const currentAlert = alerts.find(a => a.id === alertId);
            const nextLevel = (currentAlert?.escalation_level || 0) + 1;

            const response = await alertsApi.escalate(alertId, nextLevel, assignTo);
            if (response.success) {
                toast.success('Alert Escalated', {
                    description: `Alert has been escalated to level ${nextLevel}.`
                });
                fetchAlerts();
            }
        } catch (err: any) {
            toast.error('Action Failed', {
                description: err.message || 'Failed to escalate alert'
            });
            setError(err.message || 'Failed to escalate alert');
        } finally {
            setActionLoading(null);
        }
    };

    const handleApprove = async (alertId: string) => {
        setActionLoading(alertId);
        try {
            const response = await alertsApi.approve(alertId);
            if (response.success) {
                toast.success('Resolution Approved', {
                    description: `Alert resolution has been approved.`
                });
                fetchAlerts();
            }
        } catch (err: any) {
            toast.error('Action Failed', {
                description: err.message || 'Failed to approve resolution'
            });
            setError(err.message || 'Failed to approve resolution');
        } finally {
            setActionLoading(null);
        }
    };

    // Check if user can escalate (SuperAdmin, OrgAdmin, EventManager, ServiceSupervisor)
    const canEscalate = () => {
        if (user?.is_super_admin) return true;
        const roles = user?.roles || [];
        return roles.some((r: any) => ['ORG_ADMIN', 'EVENT_MANAGER', 'SERVICE_SUPERVISOR'].includes(r.role));
    };

    // Check if user can approve (SuperAdmin, OrgAdmin, EventManager, DeptHead, ServiceSupervisor)
    const canApprove = () => {
        if (user?.is_super_admin) return true;
        const roles = user?.roles || [];
        return roles.some((r: any) => ['ORG_ADMIN', 'EVENT_MANAGER', 'DEPT_HEAD', 'SERVICE_SUPERVISOR'].includes(r.role));
    };

    const getRoleDescription = () => {
        if (user?.is_super_admin) return 'Viewing all alerts across the system';
        const roles = user?.roles || [];
        if (roles.some((r: any) => r.role === 'ORG_ADMIN')) return 'Viewing alerts for your organization';
        if (roles.some((r: any) => r.role === 'EVENT_MANAGER')) return 'Viewing alerts for your assigned events';
        if (roles.some((r: any) => r.role === 'DEPT_HEAD')) return 'Viewing alerts for your departments';
        if (roles.some((r: any) => r.role === 'SERVICE_SUPERVISOR')) return 'Viewing alerts for your services';
        return 'Viewing alerts assigned to you';
    };

    const clearFilters = () => {
        setStatusFilter('');
        setSeverityFilter('');
        // Don't clear role-locked filters
        if (isSuperAdmin) setSelectedOrg('ALL');
        if (user && !user.roles.some(r => r.role === 'EVENT_MANAGER')) setSelectedEvent('ALL');
        setSelectedDept('ALL');
        setSelectedService('ALL');
        setSelectedDevice('ALL');
        setStartDate('');
        setEndDate('');
    };

    const hasActiveFilters = statusFilter || severityFilter || selectedOrg !== 'ALL' || selectedEvent !== 'ALL' || selectedDept !== 'ALL' || selectedService !== 'ALL' || selectedDevice !== 'ALL' || startDate || endDate;

    // Check if fields should be disabled based on hierarchy or loading
    const isOrgDisabled = !isSuperAdmin; // Only SuperAdmin changes org, others are locked to their own
    // Actually, we calculated restrictedOrgId. If the user can switch orgs (Super Admin), let them.
    // If not, it is locked.
    // My logic in loadInitialData handles pre-selection.
    // We can use the presence of options > 1 to determine if disabled?
    // Or just check role.
    const canChangeOrg = isSuperAdmin;
    const canChangeEvent = isSuperAdmin || (user?.roles.some(r => r.role === 'ORG_ADMIN') && selectedOrg !== 'ALL');
    const canChangeDept = selectedEvent !== 'ALL';
    const canChangeService = selectedDept !== 'ALL';
    const canChangeDevice = selectedService !== 'ALL';

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title">
                            <AlertTriangle className="w-6 h-6 text-primary" />
                            Alerts
                        </h1>
                        <p className="page-header-subtext">{getRoleDescription()}</p>
                    </div>

                </div>

                {/* Filters Container */}
                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    {/* Row 1: Primary Hierarchical Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <RichSelect
                            label="Organization"
                            value={selectedOrg}
                            onChange={setSelectedOrg}
                            options={orgOptions}
                            icon={Building2}
                            disabled={!canChangeOrg || loadingOrgs}
                            placeholder={loadingOrgs ? "Loading..." : "Select Organization"}
                        />
                        <RichSelect
                            label="Event"
                            value={selectedEvent}
                            onChange={setSelectedEvent}
                            options={eventOptions}
                            icon={Calendar}
                            disabled={!canChangeEvent || loadingEvents || selectedOrg === 'ALL'}
                            placeholder={loadingEvents ? "Loading..." : "Select Event"}
                        />
                        <RichSelect
                            label="Department"
                            value={selectedDept}
                            onChange={setSelectedDept}
                            options={deptOptions}
                            icon={Layers}
                            disabled={!canChangeDept || loadingDepts}
                            placeholder={loadingDepts ? "Loading..." : "Select Department"}
                        />
                        <RichSelect
                            label="Service"
                            value={selectedService}
                            onChange={setSelectedService}
                            options={serviceOptions}
                            icon={Settings}
                            disabled={!canChangeService || loadingServices}
                            placeholder={loadingServices ? "Loading..." : "Select Service"}
                        />
                        <RichSelect
                            label="Device"
                            value={selectedDevice}
                            onChange={setSelectedDevice}
                            options={deviceOptions}
                            icon={Smartphone}
                            disabled={!canChangeDevice || loadingDevices}
                            placeholder={loadingDevices ? "Loading..." : "Select Device"}
                        />
                    </div>

                    {/* Row 2: Status, Severity, Dates & Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end border-t border-border/50 pt-4">

                        {/* Status & Severity */}
                        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-medium mb-1 block">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-border/40 rounded-lg bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 h-[42px]"
                                >
                                    <option value="">All Status</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="ACKNOWLEDGED">Acknowledged</option>
                                    <option value="RESOLVED">Resolved</option>
                                    <option value="EXPIRED">Expired</option>
                                    <option value="VERIFIED">Verified</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase font-medium mb-1 block">Severity</label>
                                <select
                                    value={severityFilter}
                                    onChange={(e) => setSeverityFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-border/40 rounded-lg bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 h-[42px]"
                                >
                                    <option value="">All Severities</option>
                                    <option value="CRITICAL">Critical</option>
                                    <option value="HIGH">High</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="LOW">Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="lg:col-span-4 flex items-center gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-muted-foreground uppercase font-medium mb-1 block">From</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-border/40 rounded-lg bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 h-[42px]"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-muted-foreground uppercase font-medium mb-1 block">To</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-border/40 rounded-lg bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 h-[42px]"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="lg:col-span-5 flex items-center justify-end gap-3 pb-0.5">
                            <span className="text-sm text-muted-foreground mr-auto lg:mr-0 hidden lg:inline-block">
                                {pagination.total.toLocaleString()} alerts
                            </span>

                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="btn-secondary h-[42px]"
                                title="Export CSV"
                            >
                                <Download className={cn("w-4 h-4", isExporting && "animate-spin")} />
                                <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
                            </button>

                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors h-[42px]"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="data-table w-full text-left text-sm">
                            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold">
                                <tr>
                                    <th className="px-4 py-3 w-[160px]">Time</th>
                                    <th className="px-4 py-3">Severity</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Device</th>
                                    <th className="px-4 py-3 min-w-[200px]">Message</th>
                                    <th className="px-4 py-3">Acknowledged By</th>
                                    <th className="px-4 py-3">Resolved By</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                <span className="text-xs">Loading alerts...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : alerts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2 opacity-60">
                                                <CheckCircle className="w-8 h-8" />
                                                <p className="text-sm font-medium">No alerts found</p>
                                                <p className="text-xs">All systems are operating normally.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    alerts.map((alert) => {
                                        const SeverityBadge = getSeverityBadge(alert.severity);
                                        const StatusBadge = getStatusBadge(alert.status);
                                        const isLoading = actionLoading === alert.id;

                                        return (
                                            <tr key={alert.id} className={cn(
                                                "transition-colors",
                                                alert.escalation_level > 0 ? "bg-red-50 hover:bg-red-100/80 dark:bg-red-500/10 dark:hover:bg-red-500/20" : "hover:bg-muted/30"
                                            )}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <TimeDisplay
                                                            timestamp={alert.created_at}
                                                            format="short"
                                                            className="text-xs whitespace-nowrap"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                        SeverityBadge.color
                                                    )}>
                                                        <SeverityBadge.icon className="w-3 h-3" />
                                                        {alert.severity}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                        StatusBadge.color
                                                    )}>
                                                        <StatusBadge.icon className="w-3 h-3" />
                                                        {alert.status}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-xs font-medium truncate max-w-[120px]" title={alert.device?.name}>
                                                            {alert.device?.name || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs truncate block max-w-[250px]" title={alert.message}>
                                                        {alert.message}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {alert.acknowledged_by_user ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5 text-yellow-600" />
                                                            <span className="text-xs font-medium text-yellow-700">
                                                                {alert.acknowledged_by_user.full_name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {alert.resolved_by_user ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span className="text-xs font-medium text-emerald-700">
                                                                {alert.resolved_by_user.full_name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Acknowledge button */}
                                                        {alert.status === 'ACTIVE' && (
                                                            <button
                                                                onClick={() => handleAcknowledge(alert.id)}
                                                                disabled={isLoading}
                                                                className="p-1.5 text-yellow-600 hover:bg-yellow-500/10 rounded-md transition-all disabled:opacity-50"
                                                                title="Acknowledge"
                                                            >
                                                                {isLoading ? (
                                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Check className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}

                                                        {/* Resolve button */}
                                                        {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
                                                            <button
                                                                onClick={() => handleResolve(alert.id)}
                                                                disabled={isLoading}
                                                                className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-md transition-all disabled:opacity-50"
                                                                title="Resolve"
                                                            >
                                                                {isLoading ? (
                                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}

                                                        {/* Approve button - for resolved alerts */}
                                                        {alert.status === 'RESOLVED' && canApprove() && !alert.metadata?.approved && (
                                                            <button
                                                                onClick={() => handleApprove(alert.id)}
                                                                disabled={isLoading}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-500/10 rounded-md transition-all disabled:opacity-50"
                                                                title="Approve Resolution"
                                                            >
                                                                {isLoading ? (
                                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <ThumbsUp className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}

                                                        {/* View details */}
                                                        <button
                                                            onClick={() => setSelectedAlert(alert)}
                                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1 || loading}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </button>
                        <span className="text-sm font-medium text-muted-foreground px-4">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                            disabled={pagination.page >= pagination.totalPages || loading}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Detail Modal */}
                {selectedAlert && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedAlert(null)}>
                        <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="bg-muted/30 border-b border-border p-5 flex items-center justify-between rounded-t-xl">
                                <div>
                                    <h3 className="text-xl font-semibold flex items-center gap-2.5">
                                        <AlertTriangle className={cn(
                                            "w-5 h-5",
                                            selectedAlert.severity === 'CRITICAL' ? 'text-red-500' :
                                            selectedAlert.severity === 'HIGH' ? 'text-orange-500' :
                                            selectedAlert.severity === 'MEDIUM' ? 'text-yellow-500' : 'text-blue-500'
                                        )} />
                                        Alert Details
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1 font-mono">
                                        {selectedAlert.id}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedAlert(null)}
                                    className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                                {/* Header / Main Values */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1.5 block">Time</span>
                                        <p className="text-sm font-medium">
                                            <TimeDisplay timestamp={selectedAlert.created_at} format="short" />
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1.5 block">Severity</span>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                            getSeverityBadge(selectedAlert.severity).color
                                        )}>
                                            {selectedAlert.severity}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1.5 block">Status</span>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                            getStatusBadge(selectedAlert.status).color
                                        )}>
                                            {selectedAlert.status}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1.5 block">Device</span>
                                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                            <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                                            {selectedAlert.device?.name || '-'}
                                        </p>
                                    </div>
                                </div>

                                {/* Message block */}
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Message</span>
                                    <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-lg p-4">
                                        <p className="text-[15px] font-medium leading-relaxed">
                                            {selectedAlert.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Values & Thresholds */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted/10 border border-border/50 rounded-lg p-4">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Trigger Value</span>
                                        <p className="text-base font-mono font-semibold text-foreground">
                                            {JSON.stringify(selectedAlert.value)}
                                        </p>
                                    </div>
                                    <div className="bg-muted/10 border border-border/50 rounded-lg p-4">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Rule Threshold</span>
                                        <p className="text-base font-mono font-semibold text-foreground">
                                            {JSON.stringify(selectedAlert.threshold)}
                                        </p>
                                    </div>
                                </div>

                                {/* Location Details */}
                                {(selectedAlert.organization || selectedAlert.event || selectedAlert.department || selectedAlert.service) && (
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-3 block">Location & Service Hierarchy</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            {selectedAlert.organization && (
                                                <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                                                    <span className="text-muted-foreground flex items-center gap-2"><Building2 className="w-4 h-4"/> Organization</span> 
                                                    <span className="font-medium text-right ml-2">{selectedAlert.organization.name}</span>
                                                </div>
                                            )}
                                            {selectedAlert.event && (
                                                <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                                                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/> Event</span> 
                                                    <span className="font-medium text-right ml-2">{selectedAlert.event.name}</span>
                                                </div>
                                            )}
                                            {selectedAlert.department && (
                                                <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                                                    <span className="text-muted-foreground flex items-center gap-2"><Layers className="w-4 h-4"/> Department</span> 
                                                    <span className="font-medium text-right ml-2">{selectedAlert.department.name}</span>
                                                </div>
                                            )}
                                            {selectedAlert.service?.service_template && (
                                                <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                                                    <span className="text-muted-foreground flex items-center gap-2"><Settings className="w-4 h-4"/> Service</span> 
                                                    <span className="font-medium text-right ml-2">{selectedAlert.service.service_template.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Logs */}
                                {(selectedAlert.acknowledged_by_user || selectedAlert.resolved_by_user) && (
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-3 block">Activity History</span>
                                        <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                                            {selectedAlert.acknowledged_by_user && (
                                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    {/* Timeline Marker */}
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-yellow-100 text-yellow-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                        <Clock className="w-4 h-4" />
                                                    </div>
                                                    {/* Content Card */}
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-medium text-foreground">Acknowledged</span>
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3"/> {selectedAlert.acknowledged_by_user.full_name}</span>
                                                            {selectedAlert.acknowledged_at && (
                                                                <span className="text-[11px] text-muted-foreground mt-1">
                                                                    {formatDistanceToNow(new Date(selectedAlert.acknowledged_at), { addSuffix: true })} 
                                                                    &nbsp;({format(new Date(selectedAlert.acknowledged_at), "MMM d, h:mm a")})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {selectedAlert.resolved_by_user && (
                                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    {/* Timeline Marker */}
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-emerald-100 text-emerald-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </div>
                                                    {/* Content Card */}
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-medium text-foreground">Resolved</span>
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3"/> {selectedAlert.resolved_by_user.full_name}</span>
                                                            {selectedAlert.resolved_at && (
                                                                <span className="text-[11px] text-muted-foreground mt-1">
                                                                    {formatDistanceToNow(new Date(selectedAlert.resolved_at), { addSuffix: true })} 
                                                                    &nbsp;({format(new Date(selectedAlert.resolved_at), "MMM d, h:mm a")})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
