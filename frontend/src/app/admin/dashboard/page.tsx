'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/Card';
import StatsCard from '@/components/StatsCard';
import {
    Activity,
    Wifi,
    WifiOff,
    AlertTriangle,
    Server,
    Clock,
    ArrowRight,
    RefreshCw,
    Droplet,
    LayoutDashboard,
    Users,
    Cpu,
    Gauge,
    Thermometer,
    Zap,
    Shield,
    Settings,
    Building2,
    BarChart3,
    Box,
    Calendar
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { telemetryApi } from '@/lib/api';

interface DashboardStats {
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    active_alerts: number;
}

interface SystemStats {
    total_organizations: number;
    total_events: number;
    total_users: number;
    total_devices: number;
}

interface RecentDevice {
    id: number;
    device_code: string;
    name: string;
    model: string;
    type: string;
    status: 'online' | 'offline' | 'provisioned';
    last_seen: string;
    data: any;
    icon?: string;
}

const ICON_MAP: Record<string, any> = {
    'droplet': Droplet,
    'wifi': Wifi,
    'cpu': Cpu,
    'gauge': Gauge,
    'thermometer': Thermometer,
    'zap': Zap,
    'server': Server,
    'box': LayoutDashboard
};

const getIcon = (iconName: string | undefined) => {
    if (!iconName) return Droplet;
    return ICON_MAP[iconName.toLowerCase()] || Droplet;
};

export default function AdminDashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [recentDevices, setRecentDevices] = useState<RecentDevice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Protect Route
    if (!authLoading && user && !user.is_super_admin) {
        notFound();
    }


    useEffect(() => {
        // Only fetch data if user is authenticated and is super admin
        if (!authLoading && user?.is_super_admin) {
            fetchDashboardData();

            // Connect to WebSocket
            const socket = getSocket();

            const handleTelemetry = (payload: any) => {
                // Update device list
                setRecentDevices(prev => {
                    const filtered = prev.filter(d => d.device_code !== payload.device_code);
                    const newDevice: RecentDevice = {
                        id: payload.device_id,
                        device_code: payload.device_code,
                        name: `Device-${payload.device_code.substring(4)}`,
                        model: 'Unknown',
                        type: 'sensor',
                        status: 'online',
                        icon: 'droplet', // Default, will be updated if existing found
                        last_seen: payload.timestamp,
                        data: payload.data
                    };

                    const existing = prev.find(d => d.device_code === payload.device_code);
                    if (existing) {
                        newDevice.name = existing.name;
                        newDevice.model = existing.model;
                        newDevice.type = existing.type;
                        newDevice.icon = existing.icon;
                    }

                    return [newDevice, ...filtered].slice(0, 5);
                });

                // Update stats from payload (same as device list)
                if (payload.stats) {
                    setStats(prev => {
                        if (!prev) return payload.stats;

                        if (prev.total_devices === payload.stats.total_devices &&
                            prev.online_devices === payload.stats.online_devices &&
                            prev.offline_devices === payload.stats.offline_devices &&
                            prev.active_alerts === payload.stats.active_alerts) {
                            return prev;
                        }

                        return payload.stats;
                    });
                }
            };

            socket.on('dashboard:telemetry', handleTelemetry);

            // Poll stats every 3 seconds (reliable)
            const pollStats = async () => {
                try {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/api/v1/telemetry/stats/dashboard`
                    );
                    const result = await response.json();

                    if (result.success && result.stats) {
                        setStats(prev => {
                            if (!prev) return result.stats;

                            if (prev.total_devices === result.stats.total_devices &&
                                prev.online_devices === result.stats.online_devices &&
                                prev.offline_devices === result.stats.offline_devices &&
                                prev.active_alerts === result.stats.active_alerts) {
                                return prev;
                            }

                            return result.stats;
                        });
                    }
                } catch (error) {
                    console.error('Error polling stats:', error);
                }
            };

            const statsInterval = setInterval(pollStats, 3000);

            return () => {
                socket.off('dashboard:telemetry', handleTelemetry);
                clearInterval(statsInterval);
            };
        }
    }, [authLoading, user]);

    // Local timer to check for offline status every second
    useEffect(() => {
        const timer = setInterval(() => {
            setRecentDevices(prev =>
                prev.map(d => {
                    // Check if device is now offline (>10s)
                    const isOffline = (Date.now() - new Date(d.last_seen).getTime()) > 10000;
                    if (isOffline && d.status === 'online') {
                        return { ...d, status: 'offline' };
                    }
                    return d;
                })
            );
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch regular dashboard stats (devices)
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/api/v1/telemetry/stats/dashboard`
            );
            const result = await response.json();

            if (result.success) {
                // Only update stats, don't replace device list (Socket.IO keeps it fresh)
                setStats(result.stats);

                // Only set device list on initial load
                if (isLoading) {
                    setRecentDevices(result.recently_active);
                }

                setLastUpdated(new Date());
            }

            // Fetch system-wide stats (organizations, events, users)
            const systemResult = await telemetryApi.getSystemStats();
            if (systemResult.success) {
                setSystemStats(systemResult.stats);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTimeAgo = (dateStr: string, status: string) => {
        if (!dateStr) return '0s ago';
        const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (status === 'offline' && seconds > 86400 * 365) return '0s ago'; // Handle never seen
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <LayoutDashboard className="w-6 h-6 text-primary" />
                            Admin Dashboard
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            System-wide overview and controls
                        </p>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatsCard
                                title="Total Organizations"
                                value={systemStats?.total_organizations || 0}
                                subtext="Multi-tenant organizations"
                                icon={Building2}
                                intent="primary"
                                href="/admin/organizations"
                            />
                            <StatsCard
                                title="Global Events"
                                value={systemStats?.total_events || 0}
                                subtext="Across all organizations"
                                icon={Calendar}
                                intent="default"
                                href="/events"
                            />
                            <StatsCard
                                title="Global Users"
                                value={systemStats?.total_users || 0}
                                subtext="All system users"
                                icon={Users}
                                intent="default"
                                href="/users"
                            />
                            <StatsCard
                                title="Total Devices"
                                value={systemStats?.total_devices || stats?.total_devices || 0}
                                subtext="Connected hardware units"
                                icon={Server}
                                intent="primary"
                                href="/admin/devices"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: KPI Placeholder */}
                            <Card>
                                <CardHeader>
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-primary" />
                                        Key Performance Indicators
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">System-wide analytics and metrics</p>
                                </CardHeader>
                                <CardContent className="flex items-center justify-center py-20">
                                    <div className="text-center text-muted-foreground">
                                        <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="text-sm">KPI section coming soon</p>
                                        <p className="text-xs mt-1">System-wide analytics will be displayed here</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Right Column: Admin Tools */}
                            <Card>
                                <CardHeader>
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-primary" />
                                        Admin Tools
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Quick access to all administrative functions</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Link
                                            href="/users"
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Global Users</p>
                                                <p className="text-xs text-muted-foreground">Manage all system users</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>

                                        <Link
                                            href="/admin/organizations"
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Organizations</p>
                                                <p className="text-xs text-muted-foreground">Configure tenants</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>

                                        <Link
                                            href="/admin/rbac"
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Access Control</p>
                                                <p className="text-xs text-muted-foreground">Manage permissions</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>

                                        <Link
                                            href="/admin/platform-settings"
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                                <Gauge className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Platform Settings</p>
                                                <p className="text-xs text-muted-foreground">Global configuration</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>

                                        <Link
                                            href="/admin/device-models"
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                                                <Box className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Device Models</p>
                                                <p className="text-xs text-muted-foreground">Hardware templates</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>

                                        <Link
                                            href="/admin/devices"
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                                                <Server className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">All Devices</p>
                                                <p className="text-xs text-muted-foreground">System-wide inventory</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>

                                        <Link
                                            href="/admin/reports"
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                                                <BarChart3 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Reports & Analytics</p>
                                                <p className="text-xs text-muted-foreground">System insights</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>

                                        <Link
                                            href="/events"
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Event Management</p>
                                                <p className="text-xs text-muted-foreground">Manage all events</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )
                }
            </div >
        </DashboardLayout >
    );
}
