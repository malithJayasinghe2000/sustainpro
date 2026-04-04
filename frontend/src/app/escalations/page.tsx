'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { escalationsApi, Escalation } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';
import TimeDisplay from '@/components/TimeDisplay';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    Clock,
    Filter,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    User,
    Check,
    Eye,
    XCircle,
    Upload,
    Image as ImageIcon,
    Video,
    X,
    FileUp,
    ExternalLink,
    Building2,
    Calendar,
    Layers,
    Settings,
    Smartphone,
    Download
} from 'lucide-react';
import { RichSelect } from '@/components/ui/RichSelect';
import {
    organizationsApi,
    eventsApi,
    departmentsApi,
    departmentServicesApi,
    uploadApi,
    getImageUrl,
    alertsApi
} from '@/lib/api';
import { toast } from 'sonner';

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
            return { icon: AlertCircle, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
        case 'LOW':
            return { icon: AlertCircle, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
        default:
            return { icon: AlertCircle, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
    }
};

// Status badge config
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'OPEN':
            return { icon: AlertTriangle, color: 'bg-red-500/10 text-red-600 border-red-500/20' };
        case 'ACKNOWLEDGED':
            return { icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
        case 'RESOLVED':
            return { icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
        default:
            return { icon: AlertCircle, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
    }
};

const REASON_LABELS: Record<string, string> = {
    THRESHOLD_BREACH: 'Threshold Breach',
    TIMEOUT: 'Timeout',
    MANUAL: 'Manual',
    SLA_VIOLATION: 'SLA Violation',
};

export default function EscalationsPage() {
    const { user } = useAuth();
    const [escalations, setEscalations] = useState<Escalation[]>([]);
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
    const [viewMode, setViewMode] = useState<'all' | 'my'>('my');
    const [showFilters, setShowFilters] = useState(false);

    // Action states
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Detail/Resolve modal
    const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isSuperAdmin = user?.is_super_admin;

    const canViewAll = () => {
        if (user?.is_super_admin) return true;
        const roles = user?.roles || [];
        return roles.some((r: any) => ['ORG_ADMIN', 'EVENT_MANAGER', 'DEPT_HEAD'].includes(r.role));
    };

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

                // Fetch Organizations
                let orgsData = [];
                if (isSuperAdmin) {
                    const response = await organizationsApi.getAll({ limit: 100 });
                    orgsData = response.data || [];
                } else if (restrictedOrgId) {
                    const org = await organizationsApi.getById(restrictedOrgId);
                    if (org && org.data) orgsData = [org.data];
                    else if (org) orgsData = [org];
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
                const response = await departmentsApi.getServices(selectedDept);
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
                const response = await departmentServicesApi.getDevices(selectedService, { limit: 100 });
                const devices = response.data || [];
                setDeviceOptions([
                    { value: 'ALL', label: 'All Devices' },
                    ...devices.map((d: any) => ({
                        value: d.id.toString(),
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

    const fetchEscalations = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params: any = {
                page: pagination.page,
                limit: pagination.limit,
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


            let response;
            if (viewMode === 'my') {
                response = await escalationsApi.getMyEscalations(params);
            } else {
                response = await escalationsApi.getAll(params);
            }

            if (response.success) {
                setEscalations(response.data);
                setPagination((prev) => ({
                    ...prev,
                    total: response.pagination?.total || 0,
                    totalPages: response.pagination?.totalPages || 0,
                }));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch escalations');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, statusFilter, severityFilter, viewMode, selectedOrg, selectedEvent, selectedDept, selectedService, selectedDevice, startDate, endDate]);

    useEffect(() => {
        fetchEscalations();
    }, [fetchEscalations]);

    // Reset page when filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [statusFilter, severityFilter, viewMode, selectedOrg, selectedEvent, selectedDept, selectedService, selectedDevice, startDate, endDate]);


    const handleExport = async () => {
        setIsExporting(true);
        try {
            const params: any = {
                page: 1, limit: 10000
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

            let response;
            if (viewMode === 'my') {
                response = await escalationsApi.getMyEscalations(params);
            } else {
                response = await escalationsApi.getAll(params);
            }

            if (response.success && response.data.length > 0) {
                const headers = ['ID', 'Escalated At', 'Severity', 'Status', 'Reason', 'Message', 'Assigned To', 'Organization', 'Event'];
                const csvContent = [
                    headers.join(','),
                    ...response.data.map((esc: any) => [
                        esc.id,
                        `"${new Date(esc.escalated_at).toLocaleString()}"`,
                        esc.severity,
                        esc.status,
                        `"${esc.reason || ''}"`,
                        `"${esc.sps_alerts?.message?.replace(/"/g, '""') || ''}"`,
                        `"${esc.assigned_user?.full_name || ''}"`,
                        `"${esc.sps_organizations?.name || ''}"`,
                        `"${esc.sps_events?.name || ''}"`
                    ].join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${viewMode === 'my' ? 'my_' : ''}escalations_export_${new Date().toISOString().slice(0, 10)}.csv`;
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

    const handleAcknowledge = async (escalationId: string) => {
        setActionLoading(escalationId);
        try {
            const currentEscalation = escalations.find(e => e.id === escalationId);
            
            const response = await escalationsApi.acknowledge(escalationId);
            if (response.success) {
                
                // Keep alert synced automatically
                if (currentEscalation?.sps_alerts?.id) {
                    try {
                        await alertsApi.acknowledge(currentEscalation.sps_alerts.id);
                    } catch (e) {
                         console.error('Failed to sync alert acknowledge state', e);
                    }
                }
                
                toast.success('Escalation Acknowledged', {
                     description: `You have successfully acknowledged this escalation.`
                });
                
                fetchEscalations();
            }
        } catch (err: any) {
            toast.error('Action Failed', {
                 description: err.message || 'Failed to acknowledge escalation'
            });
        } finally {
            setActionLoading(null);
        }
    };

    const openResolveModal = (escalation: Escalation) => {
        setSelectedEscalation(escalation);
        setResolveModalOpen(true);
        setResolutionNotes('');
        setEvidenceUrls(escalation.evidence_urls || []);
    };

    const handleResolve = async () => {
        if (!selectedEscalation) return;

        setActionLoading(selectedEscalation.id);
        try {
            const response = await escalationsApi.resolve(selectedEscalation.id, {
                resolution_notes: resolutionNotes || undefined,
                evidence_urls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
            });

            if (response.success) {
                // Keep alert synced automatically
                try {
                     if(selectedEscalation.sps_alerts?.id) {
                         await alertsApi.resolve(selectedEscalation.sps_alerts.id);
                     }
                } catch(e) {
                     console.error('Failed to sync alert resolution', e);
                }

                toast.success('Escalation Resolved', {
                    description: 'Escalation successfully resolved and closed.'
                });
                setResolveModalOpen(false);
                setSelectedEscalation(null);
                fetchEscalations();
            }
        } catch (err: any) {
            toast.error('Action Failed', {
                 description: err.message || 'Failed to resolve escalation'
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingFile(true);
        try {
            const file = files[0];

            // Upload to backend (S3 or local fallback)
            const response = await uploadApi.uploadImage(file);

            // The API returns the full URL or relative path
            const fullUrl = getImageUrl(response.url);

            if (fullUrl) {
                setEvidenceUrls(prev => [...prev, fullUrl]);
                toast.success('File uploaded successfully');
            } else {
                throw new Error('Invalid response from server');
            }

        } catch (err: any) {
            console.error('Upload failed:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to upload file');
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleAddEvidenceUrl = (url: string) => {
        if (url.trim()) {
            setEvidenceUrls(prev => [...prev, url.trim()]);
        }
    };

    const handleRemoveEvidence = (index: number) => {
        setEvidenceUrls(prev => prev.filter((_, i) => i !== index));
    };

    const getRoleDescription = () => {
        if (viewMode === 'my') return 'Viewing escalations assigned to you';
        if (user?.is_super_admin) return 'Viewing all escalations across the system';
        const roles = user?.roles || [];
        if (roles.some((r: any) => r.role === 'ORG_ADMIN')) return 'Viewing all escalations for your organization';
        if (roles.some((r: any) => r.role === 'EVENT_MANAGER')) return 'Viewing escalations for your events';
        if (roles.some((r: any) => r.role === 'DEPT_HEAD')) return 'Viewing escalations for your departments';
        return 'Viewing escalations assigned to you';
    };

    const clearFilters = () => {
        setStatusFilter('');
        setSeverityFilter('');
        if (isSuperAdmin) setSelectedOrg('ALL');
        if (user && !user.roles.some(r => r.role === 'EVENT_MANAGER')) setSelectedEvent('ALL');
        setSelectedDept('ALL');
        setSelectedService('ALL');
        setSelectedDevice('ALL');
        setStartDate('');
        setEndDate('');
    };

    const hasActiveFilters = statusFilter || severityFilter || selectedOrg !== 'ALL' || selectedEvent !== 'ALL' || selectedDept !== 'ALL' || selectedService !== 'ALL' || selectedDevice !== 'ALL' || startDate || endDate;

    const canChangeOrg = isSuperAdmin;
    const canChangeEvent = isSuperAdmin || (user?.roles.some(r => r.role === 'ORG_ADMIN') && selectedOrg !== 'ALL');
    const canChangeDept = selectedEvent !== 'ALL';
    const canChangeService = selectedDept !== 'ALL';
    const canChangeDevice = selectedService !== 'ALL';

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                {/* <Toaster position="bottom-right" /> */}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title">
                            <AlertTriangle className="w-6 h-6 text-primary" />
                            Escalations
                        </h1>
                        <p className="page-header-subtext">{getRoleDescription()}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {canViewAll() && (
                            <div className="flex rounded-lg border border-border overflow-hidden">
                                <button
                                    onClick={() => setViewMode('my')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium transition-colors",
                                        viewMode === 'my'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-background text-muted-foreground hover:bg-muted'
                                    )}
                                >
                                    My Tasks
                                </button>
                                <button
                                    onClick={() => setViewMode('all')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium transition-colors",
                                        viewMode === 'all'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-background text-muted-foreground hover:bg-muted'
                                    )}
                                >
                                    All
                                </button>
                            </div>
                        )}
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
                                    <option value="OPEN">Open</option>
                                    <option value="ACKNOWLEDGED">Acknowledged</option>
                                    <option value="RESOLVED">Resolved</option>
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
                                {pagination.total.toLocaleString()} escalations
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
                                    <th className="px-4 py-3 w-[160px]">Escalated At</th>
                                    <th className="px-4 py-3">Severity</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Reason</th>
                                    <th className="px-4 py-3 min-w-[200px]">Message</th>
                                    <th className="px-4 py-3">Assigned To</th>
                                    <th className="px-4 py-3">Acknowledged By</th>
                                    <th className="px-4 py-3">Resolved By</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                <span className="text-xs">Loading escalations...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : escalations.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2 opacity-60">
                                                <CheckCircle className="w-8 h-8" />
                                                <p className="text-sm font-medium">No escalations found</p>
                                                <p className="text-xs">
                                                    {viewMode === 'my' ? 'You have no pending escalation tasks' : 'No escalations match your filters'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    escalations.map((escalation) => {
                                        const SeverityBadge = getSeverityBadge(escalation.severity);
                                        const StatusBadge = getStatusBadge(escalation.status);
                                        const isLoading = actionLoading === escalation.id;

                                        return (
                                            <tr key={escalation.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <TimeDisplay
                                                            timestamp={escalation.escalated_at}
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
                                                        {escalation.severity}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                        StatusBadge.color
                                                    )}>
                                                        <StatusBadge.icon className="w-3 h-3" />
                                                        {escalation.status}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                                        {REASON_LABELS[escalation.reason] || escalation.reason}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs truncate block max-w-[250px]" title={escalation.sps_alerts?.message}>
                                                        {escalation.sps_alerts?.message || 'Escalation Task'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {escalation.assigned_user ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5 text-primary" />
                                                            <span className="text-xs font-medium">
                                                                {escalation.assigned_user.full_name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {escalation.acknowledged_user ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5 text-yellow-600" />
                                                            <span className="text-xs font-medium text-yellow-700">
                                                                {escalation.acknowledged_user.full_name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {escalation.resolved_user ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span className="text-xs font-medium text-emerald-700">
                                                                {escalation.resolved_user.full_name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Acknowledge button */}
                                                        {escalation.status === 'OPEN' && (
                                                            <button
                                                                onClick={() => handleAcknowledge(escalation.id)}
                                                                disabled={isLoading}
                                                                className="p-1.5 text-yellow-600 hover:bg-yellow-500/10 rounded-md transition-all disabled:opacity-50"
                                                                title="Acknowledge"
                                                            >
                                                                {isLoading ? (
                                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Eye className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}

                                                        {/* Resolve button */}
                                                        {(escalation.status === 'OPEN' || escalation.status === 'ACKNOWLEDGED') && (
                                                            <button
                                                                onClick={() => openResolveModal(escalation)}
                                                                disabled={isLoading}
                                                                className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-md transition-all disabled:opacity-50"
                                                                title="Resolve"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {/* View details */}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedEscalation(escalation);
                                                                setResolveModalOpen(false);
                                                            }}
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
                {selectedEscalation && !resolveModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedEscalation(null)}>
                        <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="bg-muted/30 border-b border-border p-5 flex items-center justify-between rounded-t-xl">
                                <div>
                                    <h3 className="text-xl font-semibold flex items-center gap-2.5">
                                        <AlertTriangle className={cn(
                                            "w-5 h-5",
                                            selectedEscalation.severity === 'CRITICAL' ? 'text-red-500' :
                                            selectedEscalation.severity === 'HIGH' ? 'text-orange-500' :
                                            selectedEscalation.severity === 'MEDIUM' ? 'text-yellow-500' : 'text-blue-500'
                                        )} />
                                        Escalation Details
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1 font-mono">
                                        {selectedEscalation.id}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedEscalation(null)}
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
                                            <TimeDisplay timestamp={selectedEscalation.escalated_at} format="short" />
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1.5 block">Severity</span>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                            getSeverityBadge(selectedEscalation.severity).color
                                        )}>
                                            {selectedEscalation.severity}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1.5 block">Status</span>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                            getStatusBadge(selectedEscalation.status).color
                                        )}>
                                            {selectedEscalation.status}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1.5 block">Reason</span>
                                        <p className="text-sm font-medium text-foreground">
                                            {REASON_LABELS[selectedEscalation.reason] || selectedEscalation.reason}
                                        </p>
                                    </div>
                                </div>

                                {/* Message block */}
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Alert Message</span>
                                    <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-lg p-4">
                                        <p className="text-[15px] font-medium leading-relaxed">
                                            {selectedEscalation.sps_alerts?.message || 'No message'}
                                        </p>
                                    </div>
                                </div>

                                {/* Location Details */}
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-3 block">Assignment & Location</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        {selectedEscalation.assigned_user && (
                                            <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg sm:col-span-2">
                                                <span className="text-muted-foreground flex items-center gap-2"><User className="w-4 h-4 text-primary"/> Assigned To</span> 
                                                <span className="font-medium text-right ml-2 text-primary">{selectedEscalation.assigned_user.full_name}</span>
                                            </div>
                                        )}
                                        {selectedEscalation.sps_organizations && (
                                            <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                                                <span className="text-muted-foreground flex items-center gap-2"><Building2 className="w-4 h-4"/> Organization</span> 
                                                <span className="font-medium text-right ml-2">{selectedEscalation.sps_organizations.name}</span>
                                            </div>
                                        )}
                                        {selectedEscalation.sps_events && (
                                            <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                                                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/> Event</span> 
                                                <span className="font-medium text-right ml-2">{selectedEscalation.sps_events.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                {selectedEscalation.evidence_urls && selectedEscalation.evidence_urls.length > 0 && (
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-3 block">Evidence Attached ({selectedEscalation.evidence_urls.length})</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedEscalation.evidence_urls.map((url, index) => (
                                                <a
                                                    key={index}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-lg text-sm hover:bg-muted transition-colors group"
                                                >
                                                    <span className="flex items-center gap-2 text-foreground font-medium">
                                                        {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                            <ImageIcon className="w-4 h-4 text-blue-500" />
                                                        ) : url.match(/\.(mp4|webm|mov)$/i) ? (
                                                            <Video className="w-4 h-4 text-purple-500" />
                                                        ) : (
                                                            <FileUp className="w-4 h-4 text-gray-500" />
                                                        )}
                                                        Attachment {index + 1}
                                                    </span>
                                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Resolution Notes Block */}
                                {selectedEscalation.resolution_notes && (
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2 block">Resolution Notes</span>
                                        <div className="bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30 rounded-lg p-4">
                                            <p className="text-sm font-medium leading-relaxed italic">
                                                "{selectedEscalation.resolution_notes}"
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Action Logs */}
                                {(selectedEscalation.acknowledged_user || selectedEscalation.resolved_user) && (
                                    <div>
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-3 block">Activity History</span>
                                        <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                                            {selectedEscalation.acknowledged_user && (
                                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-yellow-100 text-yellow-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                        <Clock className="w-4 h-4" />
                                                    </div>
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-medium text-foreground">Acknowledged</span>
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3"/> {selectedEscalation.acknowledged_user.full_name}</span>
                                                            {selectedEscalation.acknowledged_at && (
                                                                <span className="text-[11px] text-muted-foreground mt-1">
                                                                    {formatDistanceToNow(new Date(selectedEscalation.acknowledged_at), { addSuffix: true })} 
                                                                    &nbsp;({format(new Date(selectedEscalation.acknowledged_at), "MMM d, h:mm a")})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {selectedEscalation.resolved_user && (
                                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-emerald-100 text-emerald-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </div>
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-medium text-foreground">Resolved</span>
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3"/> {selectedEscalation.resolved_user.full_name}</span>
                                                            {selectedEscalation.resolved_at && (
                                                                <span className="text-[11px] text-muted-foreground mt-1">
                                                                    {formatDistanceToNow(new Date(selectedEscalation.resolved_at), { addSuffix: true })} 
                                                                    &nbsp;({format(new Date(selectedEscalation.resolved_at), "MMM d, h:mm a")})
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

                            {/* Action Buttons Footer */}
                            {(selectedEscalation.status === 'OPEN' || selectedEscalation.status === 'ACKNOWLEDGED') && (
                                <div className="bg-muted/30 border-t border-border p-5 rounded-b-xl flex gap-3 justify-end items-center">
                                    {selectedEscalation.status === 'OPEN' && (
                                        <button
                                            onClick={() => {
                                                handleAcknowledge(selectedEscalation.id);
                                                setSelectedEscalation(null);
                                            }}
                                            className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <Check className="w-4 h-4" />
                                            Mark as Acknowledged
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setResolveModalOpen(true);
                                        }}
                                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Provide Resolution & Evidence
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Resolve Modal with Evidence Upload */}
                {resolveModalOpen && selectedEscalation && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setResolveModalOpen(false)}>
                        <div className="bg-card border border-border rounded-xl max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-border">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    Resolve Escalation
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Add resolution notes and upload evidence (images/videos)
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Resolution Notes */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Resolution Notes</label>
                                    <textarea
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="Describe how the issue was resolved..."
                                    />
                                </div>

                                {/* Evidence Upload */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Evidence (Images/Videos)</label>

                                    {/* File Upload Button */}
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingFile}
                                            className="flex-1 px-4 py-3 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground"
                                        >
                                            {uploadingFile ? (
                                                <RefreshCw className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Upload className="w-5 h-5" />
                                                    Click to upload image or video
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Manual URL Input */}
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="url"
                                            placeholder="Or paste image/video URL..."
                                            className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddEvidenceUrl((e.target as HTMLInputElement).value);
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={(e) => {
                                                const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                                                handleAddEvidenceUrl(input.value);
                                                input.value = '';
                                            }}
                                            className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {/* Evidence List */}
                                    {evidenceUrls.length > 0 && (
                                        <div className="space-y-2">
                                            {evidenceUrls.map((url, index) => (
                                                <div key={index} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-lg">
                                                    {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                        <ImageIcon className="w-4 h-4 text-blue-500" />
                                                    ) : url.match(/\.(mp4|webm|mov)$/i) ? (
                                                        <Video className="w-4 h-4 text-purple-500" />
                                                    ) : (
                                                        <FileUp className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                    <span className="flex-1 truncate">{url}</span>
                                                    <button
                                                        onClick={() => handleRemoveEvidence(index)}
                                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 border-t border-border flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setResolveModalOpen(false);
                                    }}
                                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResolve}
                                    disabled={actionLoading === selectedEscalation.id}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {actionLoading === selectedEscalation.id ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    Resolve Escalation
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
