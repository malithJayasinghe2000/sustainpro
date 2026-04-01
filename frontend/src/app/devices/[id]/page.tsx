'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { devicesApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
    ArrowLeft,
    Activity,
    Droplet,
    Zap,
    Thermometer,
    Gauge,
    Wind,
    Sun,
    Battery,
    Cpu,
    Radio,
    Signal,
    MapPin,
    Box,
    AlertCircle,
    Waves,
    Beaker,
    FlaskConical,
    Leaf,
    CloudRain,
    Timer,
    Percent,
    Hash,
    Wifi,
    Clock,
    TrendingUp,
    BarChart3,
    Package,
    Recycle,
    type LucideIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/Card';

// ============================================
// ICON MAPPING
// ============================================
const ICON_MAP: Record<string, LucideIcon> = {
    'waves': Waves,
    'droplet': Droplet,
    'water': Droplet,
    'cloudrain': CloudRain,
    'zap': Zap,
    'electricity': Zap,
    'power': Zap,
    'battery': Battery,
    'thermometer': Thermometer,
    'temp': Thermometer,
    'temperature': Thermometer,
    'gauge': Gauge,
    'pressure': Gauge,
    'percent': Percent,
    'hash': Hash,
    'timer': Timer,
    'clock': Clock,
    'wind': Wind,
    'air': Wind,
    'sun': Sun,
    'light': Sun,
    'leaf': Leaf,
    'cpu': Cpu,
    'device': Cpu,
    'radio': Radio,
    'signal': Signal,
    'wifi': Wifi,
    'trending': TrendingUp,
    'trendingup': TrendingUp,
    'chart': BarChart3,
    'barchart': BarChart3,
    'beaker': Beaker,
    'flask': FlaskConical,
    'box': Box,
    'package': Package,
    'recycle': Recycle,
    'activity': Activity,
    'mappin': MapPin,
    'location': MapPin,
};

const getIcon = (iconName: string | undefined): LucideIcon => {
    if (!iconName) return Droplet;
    const normalizedName = iconName.toLowerCase().replace(/[-_\s]/g, '');
    return ICON_MAP[normalizedName] || Droplet;
};

// ============================================
// VALUE FORMATTER BY DATA TYPE
// ============================================
const formatValue = (value: number | string | undefined, dataType: string): string => {
    if (value === undefined || value === null || value === '') {
        switch (dataType) {
            case 'float': return '0.00';
            case 'integer': return '0';
            case 'boolean': return 'false';
            case 'string': return '-';
            default: return '0';
        }
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    switch (dataType) {
        case 'float':
            return isNaN(numValue as number) ? '0.00' : (numValue as number).toFixed(2);
        case 'integer':
            return isNaN(numValue as number) ? '0' : Math.floor(numValue as number).toString();
        case 'boolean':
            return value ? 'true' : 'false';
        case 'string':
            return String(value);
        default:
            return String(value);
    }
};

// ============================================
// INTERFACES
// ============================================
interface DeviceData {
    id: number;
    device_code: string;
    name: string;
    type: string;
    model: string;
    location?: string;
    status: string;
    last_data?: string | Record<string, any>;
    last_seen?: string;
    metadata: {
        parameters: Array<{
            key: string;
            name: string;
            unit: string;
            dataType: string;
            category?: 'main' | 'common';
            icon?: string;
        }>;
    };
}

interface LiveReading {
    [key: string]: number | string;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function DeviceDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const deviceId = params.id as string;

    const [device, setDevice] = useState<DeviceData | null>(null);
    const [liveData, setLiveData] = useState<LiveReading>({});
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Initial device fetch
    useEffect(() => {
        fetchDeviceData();
    }, [deviceId]);

    // Connect to WebSocket for real-time updates
    useEffect(() => {
        if (!device?.device_code) return;

        const socket = getSocket();

        // Listen to device-specific channel
        const handleDeviceUpdate = (payload: any) => {
            // Update live data
            if (payload.data) {
                setLiveData(payload.data);
                setLastUpdated(new Date(payload.timestamp));
            }

            // Should be online if receiving data
            if (device.status !== 'online') {
                setDevice(prev => prev ? { ...prev, status: 'online' } : null);
            }
        };

        socket.on(`device:${device.device_code}`, handleDeviceUpdate);

        return () => {
            socket.off(`device:${device.device_code}`, handleDeviceUpdate);
        };
    }, [device?.device_code, device?.status]);

    // Check for offline status (local timeout)
    useEffect(() => {
        const timer = setInterval(() => {
            if (lastUpdated) {
                const diff = Date.now() - lastUpdated.getTime();
                if (diff > 10000 && device?.status === 'online') {
                    setDevice(prev => prev ? { ...prev, status: 'offline' } : null);
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [lastUpdated, device?.status]);

    const fetchDeviceData = async () => {
        try {
            const data = await devicesApi.getById(deviceId);
            setDevice(data);

            // If device has last_data, use it as initial live data
            if (data.last_data) {
                const parsedData = typeof data.last_data === 'string'
                    ? JSON.parse(data.last_data)
                    : data.last_data;
                setLiveData(parsedData);
                setLastUpdated(new Date());
            }
        } catch (error) {
            toast.error('Failed to load device');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };



    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-600 bg-green-500/10 border-green-500/30';
            case 'offline': return 'text-muted-foreground bg-muted border-border';
            case 'provisioned': return 'text-blue-600 bg-blue-500/10 border-blue-500/30';
            default: return 'text-muted-foreground bg-muted border-border';
        }
    };

    // Loading
    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[80vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full border-2 border-border"></div>
                            <LoadingSpinner className="absolute inset-0 flex items-center justify-center" />
                        </div>
                        <p className="text-sm text-muted-foreground">Loading device...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Not Found
    if (!device) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
                    <div className="p-4 rounded-full bg-muted">
                        <AlertCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold text-foreground">Device not found</p>
                        <p className="text-sm text-muted-foreground mt-1">The device you're looking for doesn't exist.</p>
                    </div>
                    <button
                        onClick={() => router.push('/devices')}
                        className="btn-primary"
                    >
                        Back to Devices
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const mainParameters = device.metadata?.parameters?.filter(param => !param.category || param.category === 'main') || [];
    const commonParameters = device.metadata?.parameters?.filter(param => param.category === 'common') || [];

    // Map 'provisioned' to 'offline' for display
    const displayStatus = device.status === 'provisioned' ? 'offline' : device.status;

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/devices')}
                            className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{device.name}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {device.model} · <span className="font-mono">{device.device_code}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content: 60/40 Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Left Column: Main Parameters (3/5 = 60%) */}
                    <div className="lg:col-span-3">
                        <Card className="h-full">

                            {/* Card Header */}
                            <CardHeader className="flex items-center gap-2">
                                <Gauge className="w-4 h-4 text-primary" />
                                <h2 className="font-semibold text-foreground">Main Parameters</h2>
                            </CardHeader>

                            {/* Parameters Grid */}
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {mainParameters.length === 0 ? (
                                        <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
                                            <Activity className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                                            <p className="text-sm text-muted-foreground">No parameters configured</p>
                                        </div>
                                    ) : (
                                        mainParameters.map((param, idx) => {
                                            const IconComponent = getIcon(param.icon);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="bg-card border border-border rounded-lg px-3 py-4 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-muted-foreground">{param.name}</p>
                                                            <div className="flex items-baseline gap-1 mt-1">
                                                                <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                                                                    {formatValue(liveData[param.key], param.dataType)}
                                                                </p>
                                                                <span className="text-xs font-medium text-muted-foreground">{param.unit}</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-2 rounded-lg bg-primary/10">
                                                            <IconComponent className="w-4 h-4 text-primary" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Device Info (2/5 = 40%) */}
                    <div className="lg:col-span-2">
                        <Card className="h-full">

                            <CardHeader className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-primary" />
                                    <h2 className="font-semibold text-foreground">Device Information</h2>
                                </div>
                                <span className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full border ${getStatusColor(displayStatus)}`}>
                                    {displayStatus}
                                </span>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Device Details Grid */}
                                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Device ID</p>
                                        <p className="text-sm font-mono font-semibold text-foreground tracking-tight">{device.device_code}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Location</p>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                            <p className="text-sm font-semibold text-foreground truncate">{device.location || 'Unknown'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Model</p>
                                        <p className="text-sm font-semibold text-foreground">{device.model}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Type</p>
                                        <p className="text-sm font-semibold text-foreground capitalize">{device.type}</p>
                                    </div>
                                </div>

                                {/* Common Parameters (System Metrics) */}
                                {commonParameters.length > 0 && (
                                    <div className="pt-6 border-t border-border space-y-4">
                                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-primary" />
                                            System Metrics
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {commonParameters.map((param, idx) => {
                                                const IconComponent = getIcon(param.icon);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="bg-card border border-border rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-1.5 rounded-md bg-primary/10">
                                                                    <IconComponent className="w-4 h-4 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground">{param.name}</p>
                                                                    <p className="text-lg font-bold text-foreground tabular-nums leading-none mt-0.5">
                                                                        {formatValue(liveData[param.key], param.dataType)}
                                                                        <span className="text-xs font-medium text-muted-foreground ml-1">{param.unit}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
