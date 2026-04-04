'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
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
    Calendar,
    Layers,
    Building2,
    Settings,
    BarChart3
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES, hasRole } from '@/lib/roles';
import { telemetryApi } from '@/lib/api';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';

interface DashboardStats {
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    active_alerts: number;
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

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentDevices, setRecentDevices] = useState<RecentDevice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [orgStructure, setOrgStructure] = useState<{ events: any[], departments: any[], services: any[], user_count: number, device_count: number } | null>(null);
    const { user } = useAuth();
    const isOrgAdmin = user && hasRole(user, ROLES.ORG_ADMIN);



    useEffect(() => {
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

        return () => {
            socket.off('dashboard:telemetry', handleTelemetry);
        };
    }, []);

    // Connect to WebSocket for real-time stats instead of heavy polling
    useEffect(() => {
        fetchDashboardData();
        
        let socket: ReturnType<typeof import('@/lib/socket').getSocket>;
        
        if (user) {
            import('@/lib/socket').then(({ getSocket }) => {
                socket = getSocket();
                
                socket.on('dashboard:stats', (newStats: any) => {
                    setStats(prev => {
                        if (!prev) return newStats;
                        return {
                            ...prev,
                            total_devices: newStats.total_devices || prev.total_devices,
                            online_devices: newStats.devices_online || newStats.online_devices,
                            offline_devices: newStats.devices_offline || newStats.offline_devices,
                        };
                    });
                    setLastUpdated(new Date());
                });

                socket.on('dashboard:telemetry', () => {
                    // Refresh data or specific lists when telemetry arrives if needed
                });
            });
        }

        return () => {
            if (socket) {
                socket.off('dashboard:stats');
                socket.off('dashboard:telemetry');
            }
        };
    }, [user]);

    // Fetch Org Structure if Org Admin
    useEffect(() => {
        if (isOrgAdmin && user?.organization_id) {
            import('@/lib/api').then(({ organizationsApi }) => {
                organizationsApi.getStructure(user.organization_id!)
                    .then(setOrgStructure)
                    .catch(console.error);
            });
        }
    }, [isOrgAdmin, user?.organization_id]);

    const fetchDashboardData = async () => {
        try {
            const result = await telemetryApi.getDashboardStats();

            if (result.success) {
                // Only update stats, don't replace device list (Socket.IO keeps it fresh)
                setStats(result.stats);

                // For Org Admins, we might want to show more than just active devices
                // But for now, let's keep the active list fresh
                if (isLoading) {
                    setRecentDevices(result.recently_active || []);
                }

                setLastUpdated(new Date());
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
                            {isOrgAdmin ? `${(user as any)?.organization_name || 'Organization'} Dashboard` : 'Dashboard'}
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {isOrgAdmin ? 'Manage your organization, events and devices' : 'Real-time system overview'}
                        </p>
                    </div>
                </div>

                {/* Org Admin Quick Links / Overview */}
                {isOrgAdmin && orgStructure && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <StatsCard
                            title="Active Events"
                            value={orgStructure.events?.length || 0}
                            subtext="Manage your site events"
                            icon={Calendar}
                            intent="primary"
                            href="/events"
                        />
                        <StatsCard
                            title="Total Departments"
                            value={orgStructure.departments?.length || 0}
                            subtext="Organizational units"
                            icon={Building2}
                            intent="default"
                        />
                        <StatsCard
                            title="Service Units"
                            value={orgStructure.services?.length || 0}
                            subtext="Across all departments"
                            icon={Layers}
                            intent="primary"
                        />
                        <StatsCard
                            title="Organization Users"
                            value={orgStructure.user_count || 0}
                            subtext="Team members"
                            icon={Users}
                            intent="default"
                            href="/users"
                        />
                    </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Stats Cards - Hidden for Org Admin per request */}
                        {!isOrgAdmin && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatsCard
                                    title="Total Devices"
                                    value={stats?.total_devices || 0}
                                    subtext="Connected hardware units"
                                    icon={Server}
                                    intent="primary"
                                />
                                <StatsCard
                                    title="Online Devices"
                                    value={stats?.online_devices || 0}
                                    subtext="Active & transmitting"
                                    icon={Wifi}
                                    intent="success"
                                />
                                <StatsCard
                                    title="Offline Devices"
                                    value={stats?.offline_devices || 0}
                                    subtext={stats?.offline_devices ? "Check connectivity" : "All online"}
                                    icon={WifiOff}
                                    intent={stats?.offline_devices ? 'danger' : 'default'}
                                />
                                <StatsCard
                                    title="Active Alerts"
                                    value={stats?.active_alerts || 0}
                                    subtext={stats?.active_alerts ? "Review needed" : "All systems normal"}
                                    icon={AlertTriangle}
                                    intent={stats?.active_alerts ? 'warning' : 'success'}
                                />
                            </div>
                        )}




                        {isOrgAdmin ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: KPI Placeholder */}
                                <Card>
                                    <CardHeader>
                                        <h2 className="font-semibold flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4 text-primary" />
                                            Key Performance Indicators
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">Real-time organizational metrics</p>
                                    </CardHeader>
                                    <CardContent className="flex items-center justify-center py-20">
                                        <div className="text-center text-muted-foreground">
                                            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                            <p className="text-sm">KPI section coming soon</p>
                                            <p className="text-xs mt-1">Analytics and metrics will be displayed here</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Right Column: Management Tools */}
                                <Card>
                                    <CardHeader>
                                        <h2 className="font-semibold flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-primary" />
                                            Management Tools
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">Quick access to administrative functions</p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Link
                                                href="/events"
                                                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                            >
                                                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">Event Management</p>
                                                    <p className="text-xs text-muted-foreground">Manage your site events</p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </Link>

                                            <Link
                                                href="/users"
                                                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                            >
                                                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">Team Management</p>
                                                    <p className="text-xs text-muted-foreground">Manage organization users</p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </Link>

                                            <Link
                                                href="/devices"
                                                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                            >
                                                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                                                    <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">Device Inventory</p>
                                                    <p className="text-xs text-muted-foreground">View all connected devices</p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </Link>

                                            <Link
                                                href="/settings"
                                                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                            >
                                                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                                    <Settings className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">Organization Settings</p>
                                                    <p className="text-xs text-muted-foreground">Configuration & preferences</p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </Link>
                                        </div>

                                        {/* Quick Access to Service Dashboards */}
                                        {orgStructure && orgStructure.services && orgStructure.services.length > 0 && (
                                            <>
                                                <div className="pt-4 pb-2">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Dashboards</p>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {orgStructure.services.slice(0, 50).map(svc => (
                                                        <Link
                                                            key={svc.id}
                                                            href={`/events/${svc.event_id}/departments/${svc.department_id}/services/${svc.id}`}
                                                            className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all group"
                                                        >
                                                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                                <Activity className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-xs truncate">{svc.name}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{svc.definition_name || 'Service'}</p>
                                                            </div>
                                                            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                                        </Link>
                                                    ))}
                                                    {orgStructure.services.length > 50 && (
                                                        <Link
                                                            href="/events"
                                                            className="flex items-center justify-center gap-2 p-2 rounded-lg border border-border border-dashed hover:bg-muted/50 transition-all text-xs text-muted-foreground hover:text-primary"
                                                        >
                                                            View all {orgStructure.services.length} services...
                                                        </Link>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Recently Active Devices */}
                                <Card className="h-full">
                                    <CardHeader className="flex items-center justify-between">
                                        <h2 className="font-semibold flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary" />
                                            Recently Active Devices
                                        </h2>
                                        <Link
                                            href="/devices"
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            View All <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </CardHeader>

                                    {/* Additional Org Content removed as it made it messy */}

                                    {recentDevices.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <WifiOff className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No active devices</p>
                                            <p className="text-xs mt-1">Devices will appear here when they send data</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {recentDevices.map((device) => {
                                                const displayStatus = device.status === 'provisioned' ? 'offline' : device.status;
                                                const DeviceIcon = getIcon(device.icon);

                                                return (
                                                    <Link
                                                        key={device.id}
                                                        href={`/devices/${device.id}`}
                                                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${displayStatus === 'online'
                                                                ? 'bg-transparent border-green-500/30'
                                                                : 'bg-transparent border-zinc-500/30'
                                                                }`}>
                                                                <DeviceIcon className={`w-5 h-5 ${displayStatus === 'online'
                                                                    ? 'text-green-600 dark:text-green-400'
                                                                    : 'text-zinc-500'
                                                                    }`} />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">{device.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {device.device_code} • {device.model}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${displayStatus === 'online'
                                                                ? 'bg-green-600 text-white'
                                                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                                                }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${displayStatus === 'online' ? 'bg-white' : 'bg-zinc-400'
                                                                    }`} />
                                                                {displayStatus}
                                                            </span>
                                                            {displayStatus === 'offline' && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    Last seen: {formatTimeAgo(device.last_seen, displayStatus)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>

                                {/* Quick Actions - Hidden for Org Admin per request */}
                                <Card className="h-full">
                                    <CardHeader>
                                        <h2 className="font-semibold flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-primary" />
                                            Quick Actions
                                        </h2>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <Link
                                            href="/devices/setup"
                                            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="w-10 h-10 bg-transparent border border-green-500/30 rounded-lg flex items-center justify-center">
                                                <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Add New Device</p>
                                                <p className="text-xs text-muted-foreground">Provision via USB</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>

                                        <Link
                                            href="/devices"
                                            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="w-10 h-10 bg-transparent border border-blue-500/30 rounded-lg flex items-center justify-center">
                                                <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Manage Devices</p>
                                                <p className="text-xs text-muted-foreground">View all connected devices</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>

                                        <Link
                                            href="/device-models"
                                            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="w-10 h-10 bg-transparent border border-purple-500/30 rounded-lg flex items-center justify-center">
                                                <Droplet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Device Models</p>
                                                <p className="text-xs text-muted-foreground">Configure parameters</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </>
                )
                }
            </div >
        </DashboardLayout >
    );
}
