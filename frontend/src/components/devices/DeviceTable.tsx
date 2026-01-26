'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { departmentServicesApi } from '@/lib/api';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    Trash2,
    Wifi,
    WifiOff,
    Cpu,
    MoreVertical,
    RefreshCw,
    Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Device {
    id: number;
    device_code: string;
    name: string | null;
    type: string | null;
    status: string | null;
    last_seen: string | null;
    metadata: Record<string, any> | null;
    created_at: string | null;
    sps_organizations?: { name: string };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

interface DeviceTableProps {
    serviceId: string;
    eventId: string;
    deptId: string;
    onDeviceRemove?: (deviceId: number) => void;
    onRefresh?: () => void;
    liveUpdates?: Record<string, Device>; // keyed by device_code
}

export default function DeviceTable({
    serviceId,
    eventId,
    deptId,
    onDeviceRemove,
    onRefresh,
    liveUpdates = {}
}: DeviceTableProps) {
    const router = useRouter();

    const [devices, setDevices] = useState<Device[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasMore: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ONLINE' | 'OFFLINE' | ''>('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Load devices
    const loadDevices = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await departmentServicesApi.getDevices(serviceId, {
                page: pagination.page,
                limit: pagination.limit,
                search: debouncedSearch,
                status: statusFilter || undefined,
                sortBy,
                sortOrder,
            });

            setDevices(response.data || []);
            setPagination(prev => ({
                ...prev,
                ...response.pagination,
            }));
        } catch (error) {
            console.error('Failed to load devices:', error);
            toast.error('Failed to load devices');
        } finally {
            setIsLoading(false);
        }
    }, [serviceId, pagination.page, pagination.limit, debouncedSearch, statusFilter, sortBy, sortOrder]);

    useEffect(() => {
        loadDevices();
    }, [loadDevices]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [debouncedSearch, statusFilter, sortBy, sortOrder]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const handleRemoveDevice = async (deviceId: number) => {
        if (!confirm('Are you sure you want to remove this device from the service?')) return;

        try {
            await departmentServicesApi.removeDevice(serviceId, deviceId);
            toast.success('Device removed successfully');
            loadDevices();
            onDeviceRemove?.(deviceId);
        } catch (error) {
            console.error('Failed to remove device:', error);
            toast.error('Failed to remove device');
        }
    };

    const handleViewDevice = (deviceId: number) => {
        router.push(`/events/${eventId}/departments/${deptId}/services/${serviceId}/devices/${deviceId}`);
    };

    const formatLastSeen = (lastSeen: string | null) => {
        if (!lastSeen) return 'Never';
        const date = new Date(lastSeen);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header with Search and Filters */}
            <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name, code, or type..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2">
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="">All Status</option>
                            <option value="ONLINE">Online</option>
                            <option value="OFFLINE">Offline</option>
                        </select>

                        {/* Refresh */}
                        <button
                            onClick={loadDevices}
                            disabled={isLoading}
                            className="p-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border bg-muted/20">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Device
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Code
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Type
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Status
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Last Seen
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="text-muted-foreground">Loading devices...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : devices.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center">
                                    <Cpu className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                                    <p className="text-muted-foreground">
                                        {debouncedSearch || statusFilter
                                            ? 'No devices match your filters'
                                            : 'No devices assigned to this service'}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            devices.map((initialDevice) => {
                                // Merge with live updates
                                const update = liveUpdates[initialDevice.device_code];
                                const device = update ? { ...initialDevice, ...update } : initialDevice;

                                return (
                                    <tr
                                        key={device.id}
                                        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() => handleViewDevice(device.id)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${device.status === 'ONLINE'
                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                    : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    <Cpu className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{device.name || 'Unnamed Device'}</p>
                                                    {device.metadata?.location && (
                                                        <p className="text-xs text-muted-foreground">
                                                            📍 {device.metadata.location}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                                                {device.device_code}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-muted-foreground">
                                                {device.type || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${device.status === 'ONLINE'
                                                ? 'bg-emerald-500/10 text-emerald-600'
                                                : 'bg-gray-500/10 text-gray-500'
                                                }`}>
                                                {device.status === 'ONLINE' ? (
                                                    <Wifi className="w-3 h-3" />
                                                ) : (
                                                    <WifiOff className="w-3 h-3" />
                                                )}
                                                {device.status || 'OFFLINE'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-muted-foreground">
                                                {formatLastSeen(device.last_seen)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleViewDevice(device.id)}
                                                    className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                                                    title="View Dashboard"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveDevice(device.id)}
                                                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
                                                    title="Remove from Service"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} devices
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum;
                            if (pagination.totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                                pageNum = i + 1;
                            } else if (pagination.page >= pagination.totalPages - 2) {
                                pageNum = pagination.totalPages - 4 + i;
                            } else {
                                pageNum = pagination.page - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${pageNum === pagination.page
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={!pagination.hasMore}
                            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
