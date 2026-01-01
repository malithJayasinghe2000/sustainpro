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
    Box
} from 'lucide-react';
import { getSocket } from '@/lib/socket';

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

export default function AdminDashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentDevices, setRecentDevices] = useState<RecentDevice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Protect Route
    if (!authLoading && user && !user.is_super_admin) {
        notFound();
    }

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
    }, []);

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

                            {/* Admin Tools */}
                            <Card className="h-full">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <h2 className="font-semibold flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-primary" />
                                            Admin Tools
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">Quick access to all administrative functions</p>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-2">
                                    <Link
                                        href="/admin/users"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 bg-transparent border border-emerald-500/30 rounded-lg flex items-center justify-center">
                                            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">Global Users</p>
                                            <p className="text-xs text-muted-foreground">Manage all system users</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>

                                    <Link
                                        href="/admin/organizations"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 bg-transparent border border-blue-500/30 rounded-lg flex items-center justify-center">
                                            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">Organizations</p>
                                            <p className="text-xs text-muted-foreground">Configure tenants</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>

                                    <Link
                                        href="/admin/rbac"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 bg-transparent border border-amber-500/30 rounded-lg flex items-center justify-center">
                                            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">Access Control (RBAC)</p>
                                            <p className="text-xs text-muted-foreground">Manage permissions</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>

                                    <Link
                                        href="/admin/platform-settings"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 bg-transparent border border-purple-500/30 rounded-lg flex items-center justify-center">
                                            <Gauge className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">Platform Settings</p>
                                            <p className="text-xs text-muted-foreground">Global configuration</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>

                                    <Link
                                        href="/device-models"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 bg-transparent border border-cyan-500/30 rounded-lg flex items-center justify-center">
                                            <Box className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">Device Models</p>
                                            <p className="text-xs text-muted-foreground">Hardware templates</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>

                                    <Link
                                        href="/admin/devices"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 bg-transparent border border-teal-500/30 rounded-lg flex items-center justify-center">
                                            <Server className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">All Devices</p>
                                            <p className="text-xs text-muted-foreground">System-wide inventory</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>

                                    <Link
                                        href="/admin/reports"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 bg-transparent border border-rose-500/30 rounded-lg flex items-center justify-center">
                                            <BarChart3 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">Reports & Analytics</p>
                                            <p className="text-xs text-muted-foreground">System insights</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>
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
