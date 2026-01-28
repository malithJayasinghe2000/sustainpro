'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import TimeDisplay from '@/components/TimeDisplay';
import { auditLogsApi, AuditLog, AuditCategory, organizationsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { RichSelect } from '@/components/ui/RichSelect';
import {
    Search, FileText, Download, Filter, RefreshCw,
    ChevronLeft, ChevronRight, User as UserIcon,
    Building2, Shield, Activity, AlertCircle, CheckCircle2,
    XCircle, Clock, Eye, Calendar, Database, Settings,
    Smartphone, Globe, Layers
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// Status badge colors
const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'SUCCESS':
            return { icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
        case 'FAILURE':
            return { icon: XCircle, color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
        case 'PARTIAL':
            return { icon: AlertCircle, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
        default:
            return { icon: Activity, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
    }
};

// Category icons
const getCategoryIcon = (category: string) => {
    switch (category?.toUpperCase()) {
        case 'AUTH':
            return Shield;
        case 'USER':
            return UserIcon;
        case 'ORGANIZATION':
            return Building2;
        case 'DEVICE':
            return Smartphone;
        case 'TELEMETRY':
            return Activity;
        case 'SETTINGS':
            return Settings;
        case 'API':
            return Globe;
        default:
            return Layers;
    }
};

// Source type colors
const getSourceColor = (source: string) => {
    switch (source?.toUpperCase()) {
        case 'USER':
            return 'bg-blue-500';
        case 'DEVICE':
            return 'bg-purple-500';
        case 'SYSTEM':
            return 'bg-gray-500';
        case 'API':
            return 'bg-green-500';
        default:
            return 'bg-gray-400';
    }
};

export default function AuditLogsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // Data State
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [categories, setCategories] = useState<AuditCategory[]>([]);
    const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Pagination
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 25,
        total: 0,
        pages: 0
    });

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [orgFilter, setOrgFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Detail Modal
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const isSuperAdmin = user?.is_super_admin;

    // Permission Check
    useEffect(() => {
        if (!authLoading && user) {
            const hasAccess = user.is_super_admin || user.roles?.some(r => r.role === 'ORG_ADMIN');
            if (!hasAccess) {
                router.replace('/not-found');
            }
        }
    }, [user, authLoading, router]);

    // Fetch categories on mount
    useEffect(() => {
        auditLogsApi.getCategories()
            .then(setCategories)
            .catch(err => console.error('Failed to fetch categories:', err));
    }, []);

    // Fetch organizations for super admin
    useEffect(() => {
        if (isSuperAdmin) {
            organizationsApi.getAll()
                .then(res => setOrganizations(res.data || []))
                .catch(err => console.error('Failed to fetch orgs:', err));
        }
    }, [isSuperAdmin]);

    // Fetch logs when filters change
    useEffect(() => {
        if (user && !authLoading) {
            const timeoutId = setTimeout(() => fetchLogs(), 300);
            return () => clearTimeout(timeoutId);
        }
    }, [user, authLoading, pagination.page, searchQuery, categoryFilter, statusFilter, sourceFilter, orgFilter, startDate, endDate]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [searchQuery, categoryFilter, statusFilter, sourceFilter, orgFilter, startDate, endDate]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page: pagination.page,
                limit: pagination.limit,
            };

            if (searchQuery) params.search = searchQuery;
            if (categoryFilter !== 'ALL') params.category = categoryFilter;
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (sourceFilter !== 'ALL') params.source_type = sourceFilter;
            if (isSuperAdmin && orgFilter !== 'ALL') params.organization_id = orgFilter;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const data = await auditLogsApi.getAll(params);
            if (data.success) {
                setLogs(data.data);
                if (data.meta) {
                    setPagination(prev => ({
                        ...prev,
                        total: data.meta.total,
                        pages: data.meta.pages
                    }));
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load audit logs');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const params: any = {};
            if (categoryFilter !== 'ALL') params.category = categoryFilter;
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (sourceFilter !== 'ALL') params.source_type = sourceFilter;
            if (isSuperAdmin && orgFilter !== 'ALL') params.organization_id = orgFilter;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            await auditLogsApi.downloadCSV(params);
            toast.success('Audit logs exported successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export audit logs');
        } finally {
            setIsExporting(false);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setCategoryFilter('ALL');
        setStatusFilter('ALL');
        setSourceFilter('ALL');
        setOrgFilter('ALL');
        setStartDate('');
        setEndDate('');
    };

    const hasActiveFilters = searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL' ||
        sourceFilter !== 'ALL' || orgFilter !== 'ALL' || startDate || endDate;

    // Category options for filter
    const categoryOptions = useMemo(() => [
        { value: 'ALL', label: 'All Categories', icon: Layers },
        ...categories.map(cat => ({
            value: cat.code,
            label: cat.name,
            icon: getCategoryIcon(cat.code)
        }))
    ], [categories]);

    const statusOptions = [
        { value: 'ALL', label: 'All Status', icon: Activity },
        { value: 'SUCCESS', label: 'Success', icon: CheckCircle2 },
        { value: 'FAILURE', label: 'Failure', icon: XCircle },
        { value: 'PARTIAL', label: 'Partial', icon: AlertCircle },
    ];

    const sourceOptions = [
        { value: 'ALL', label: 'All Sources', icon: Globe },
        { value: 'USER', label: 'User', icon: UserIcon },
        { value: 'DEVICE', label: 'Device', icon: Smartphone },
        { value: 'SYSTEM', label: 'System', icon: Settings },
        { value: 'API', label: 'API', icon: Globe },
    ];

    const orgOptions = useMemo(() => [
        { value: 'ALL', label: 'All Organizations', icon: Building2 },
        ...organizations.map(org => ({
            value: org.id,
            label: org.name,
            icon: Building2
        }))
    ], [organizations]);

    const hasAccess = user?.is_super_admin || user?.roles?.some(r => r.role === 'ORG_ADMIN');
    if (authLoading || (user && !hasAccess)) {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                <Toaster position="bottom-right" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title">
                            <FileText className="w-6 h-6 text-primary" />
                            Audit Logs
                        </h1>
                        <p className="page-header-subtext">
                            {isSuperAdmin
                                ? 'View and analyze system-wide audit logs across all organizations.'
                                : 'View audit logs for your organization.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchLogs}
                            disabled={isLoading}
                            className="btn-secondary"
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            Refresh
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting || isLoading}
                            className="btn-primary"
                        >
                            <Download className="w-4 h-4" />
                            {isExporting ? 'Exporting...' : 'Export CSV'}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    {/* Search & Primary Filters */}
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                        <div className="relative w-full lg:w-80">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search logs, users, actions..."
                                className="block w-full pl-10 pr-3 py-2.5 border border-border/40 rounded-lg bg-muted/30 placeholder-muted-foreground/60 focus:outline-none focus:bg-card focus:ring-1 focus:ring-primary/20 focus:border-primary/50 transition-all text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3 flex-1">
                            <div className="min-w-[160px]">
                                <RichSelect
                                    value={categoryFilter}
                                    onChange={setCategoryFilter}
                                    options={categoryOptions}
                                    icon={Layers}
                                    className="h-[42px]"
                                />
                            </div>

                            <div className="min-w-[140px]">
                                <RichSelect
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    options={statusOptions}
                                    icon={Activity}
                                    className="h-[42px]"
                                />
                            </div>

                            <div className="min-w-[140px]">
                                <RichSelect
                                    value={sourceFilter}
                                    onChange={setSourceFilter}
                                    options={sourceOptions}
                                    icon={Globe}
                                    className="h-[42px]"
                                />
                            </div>

                            {isSuperAdmin && (
                                <div className="min-w-[180px]">
                                    <RichSelect
                                        value={orgFilter}
                                        onChange={setOrgFilter}
                                        options={orgOptions}
                                        icon={Building2}
                                        className="h-[42px]"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Date Range & Clear */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-t border-border/50 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-2 border border-border/40 rounded-lg bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
                                    placeholder="Start Date"
                                />
                                <span className="text-muted-foreground">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-2 border border-border/40 rounded-lg bg-muted/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
                                    placeholder="End Date"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                                {pagination.total.toLocaleString()} logs found
                            </span>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="data-table w-full text-left text-sm">
                            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold">
                                <tr>
                                    <th className="px-4 py-3 w-[180px]">Timestamp</th>
                                    <th className="px-4 py-3">Source</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Action</th>
                                    <th className="px-4 py-3">Actor</th>
                                    {isSuperAdmin && <th className="px-4 py-3">Organization</th>}
                                    <th className="px-4 py-3">Target</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={isSuperAdmin ? 9 : 8} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                <span className="text-xs">Loading audit logs...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={isSuperAdmin ? 9 : 8} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2 opacity-60">
                                                <FileText className="w-8 h-8" />
                                                <p className="text-sm font-medium">No audit logs found</p>
                                                <p className="text-xs">Try adjusting your filters or date range.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => {
                                        const StatusBadge = getStatusBadge(log.status);
                                        const CategoryIcon = getCategoryIcon(log.category);

                                        return (
                                            <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <TimeDisplay
                                                            timestamp={log.created_at}
                                                            format="short"
                                                            className="text-xs whitespace-nowrap"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", getSourceColor(log.source_type))} />
                                                        <span className="text-xs font-medium uppercase">{log.source_type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <CategoryIcon className="w-4 h-4 text-primary/70" />
                                                        <span className="text-xs font-medium">{log.category}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium truncate max-w-[150px]" title={log.actor_user_email || log.actor_device_code}>
                                                            {log.actor_user_email || log.actor_device_code || 'System'}
                                                        </span>
                                                        {log.ip_address && (
                                                            <span className="text-[10px] text-muted-foreground font-mono">{log.ip_address}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                {isSuperAdmin && (
                                                    <td className="px-4 py-3">
                                                        <span className="text-xs text-muted-foreground truncate max-w-[120px] block" title={log.organization_name}>
                                                            {log.organization_name || '-'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-foreground/80">
                                                            {log.target_resource || '-'}
                                                        </span>
                                                        {log.target_name && (
                                                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={log.target_name}>
                                                                {log.target_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                        StatusBadge.color
                                                    )}>
                                                        <StatusBadge.icon className="w-3 h-3" />
                                                        {log.status}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => setSelectedLog(log)}
                                                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
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
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1 || isLoading}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </button>
                        <span className="text-sm font-medium text-muted-foreground px-4">
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                            disabled={pagination.page >= pagination.pages || isLoading}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Detail Modal */}
                {selectedLog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
                        <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    Audit Log Details
                                </h3>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-medium">Timestamp</label>
                                        <p className="text-sm font-medium">
                                            <TimeDisplay timestamp={selectedLog.created_at} format="full" />
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-medium">Status</label>
                                        <p className={cn(
                                            "text-sm font-medium inline-flex items-center gap-1.5",
                                            selectedLog.status === 'SUCCESS' ? 'text-emerald-600' :
                                                selectedLog.status === 'FAILURE' ? 'text-rose-600' : 'text-amber-600'
                                        )}>
                                            {getStatusBadge(selectedLog.status).icon !== undefined && (
                                                <span><CheckCircle2 className="w-4 h-4" /></span>
                                            )}
                                            {selectedLog.status}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-medium">Category</label>
                                        <p className="text-sm font-medium">{selectedLog.category}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-medium">Action</label>
                                        <p className="text-sm font-mono bg-muted px-2 py-0.5 rounded inline-block">{selectedLog.action}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                {selectedLog.description && (
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase font-medium">Description</label>
                                        <p className="text-sm mt-1">{selectedLog.description}</p>
                                    </div>
                                )}

                                {/* Actor Info */}
                                <div className="border-t border-border pt-4">
                                    <label className="text-xs text-muted-foreground uppercase font-medium mb-2 block">Actor</label>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {selectedLog.actor_user_email && (
                                            <div>
                                                <span className="text-muted-foreground">User: </span>
                                                <span className="font-medium">{selectedLog.actor_user_email}</span>
                                            </div>
                                        )}
                                        {selectedLog.actor_device_code && (
                                            <div>
                                                <span className="text-muted-foreground">Device: </span>
                                                <span className="font-mono">{selectedLog.actor_device_code}</span>
                                            </div>
                                        )}
                                        {selectedLog.ip_address && (
                                            <div>
                                                <span className="text-muted-foreground">IP: </span>
                                                <span className="font-mono">{selectedLog.ip_address}</span>
                                            </div>
                                        )}
                                        {selectedLog.user_agent && (
                                            <div className="col-span-2">
                                                <span className="text-muted-foreground">User Agent: </span>
                                                <span className="text-xs break-all">{selectedLog.user_agent}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Target Info */}
                                {(selectedLog.target_resource || selectedLog.target_name) && (
                                    <div className="border-t border-border pt-4">
                                        <label className="text-xs text-muted-foreground uppercase font-medium mb-2 block">Target</label>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {selectedLog.target_resource && (
                                                <div>
                                                    <span className="text-muted-foreground">Resource: </span>
                                                    <span className="font-medium">{selectedLog.target_resource}</span>
                                                </div>
                                            )}
                                            {selectedLog.target_name && (
                                                <div>
                                                    <span className="text-muted-foreground">Name: </span>
                                                    <span className="font-medium">{selectedLog.target_name}</span>
                                                </div>
                                            )}
                                            {selectedLog.target_id && (
                                                <div>
                                                    <span className="text-muted-foreground">ID: </span>
                                                    <span className="font-mono text-xs">{selectedLog.target_id}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Changes */}
                                {selectedLog.changes && selectedLog.changes.length > 0 && (
                                    <div className="border-t border-border pt-4">
                                        <label className="text-xs text-muted-foreground uppercase font-medium mb-2 block">Changes</label>
                                        <div className="bg-muted/50 rounded-lg p-3">
                                            <ul className="text-sm space-y-1">
                                                {selectedLog.changes.map((change, idx) => (
                                                    <li key={idx} className="font-mono text-xs">{change}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Error Message */}
                                {selectedLog.error_message && (
                                    <div className="border-t border-border pt-4">
                                        <label className="text-xs text-muted-foreground uppercase font-medium mb-2 block">Error</label>
                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                                            <p className="text-sm text-rose-600">{selectedLog.error_message}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Duration */}
                                {selectedLog.duration_ms !== undefined && (
                                    <div className="border-t border-border pt-4">
                                        <label className="text-xs text-muted-foreground uppercase font-medium">Duration</label>
                                        <p className="text-sm font-mono">{selectedLog.duration_ms}ms</p>
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
