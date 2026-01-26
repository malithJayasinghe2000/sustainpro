'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { departmentServicesApi, devicesApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import WidgetRenderer from '@/components/dashboard/WidgetRenderer';
import { WidgetConfig } from '@/types/dashboard';
import {
    ArrowLeft,
    Smartphone,
    Settings,
    Activity,
    Wifi
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DeviceDashboardPageProps {
    params: Promise<{ id: string; deptId: string; serviceId: string; deviceId: string }>;
}

export default function DeviceDashboardPage({ params }: DeviceDashboardPageProps) {
    const { id: eventId, deptId, serviceId, deviceId } = use(params);
    const router = useRouter();

    const [device, setDevice] = useState<any>(null);
    const [serviceInstance, setServiceInstance] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [widgets, setWidgets] = useState<WidgetConfig[]>([]);

    useEffect(() => {
        loadData();
    }, [deviceId, serviceId]); // Added serviceId to dependencies for correctness

    useEffect(() => {
        if (!device?.device_code) return;

        const socket = getSocket();
        const deviceCode = device.device_code;

        console.log('🔌 Setting up socket for device:', deviceCode);

        // Subscribe to this specific device
        socket.emit('subscribe:device', deviceCode);

        const handleTelemetry = (payload: any) => {
            console.log('📡 [Device Detail] Telemetry received:', payload);
            if (payload.device_code !== deviceCode) return;

            setDevice((prev: any) => ({
                ...prev,
                status: 'ONLINE',
                last_seen: payload.timestamp || new Date().toISOString(),
                metadata: {
                    ...(prev.metadata || {}),
                    ...payload.data
                }
            }));
        };

        const handleStatus = (payload: any) => {
            console.log('📡 [Device Detail] Status received:', payload);
            if (payload.device_code !== deviceCode) return;

            setDevice((prev: any) => ({
                ...prev,
                status: payload.status,
                last_seen: payload.timestamp || new Date().toISOString()
            }));
        }

        socket.on('telemetry', handleTelemetry);
        socket.on('device:status', handleStatus);

        // Offline detection
        const offlineCheckInterval = setInterval(() => {
            setDevice((prev: any) => {
                if (!prev || prev.status !== 'ONLINE') return prev;

                if (prev.last_seen) {
                    const timeSinceLastSeen = Date.now() - new Date(prev.last_seen).getTime();
                    if (timeSinceLastSeen > 10000) {
                        return { ...prev, status: 'OFFLINE' };
                    }
                }
                return prev;
            });
        }, 5000);

        return () => {
            socket.emit('unsubscribe:device', deviceCode);
            socket.off('telemetry', handleTelemetry);
            socket.off('device:status', handleStatus);
            clearInterval(offlineCheckInterval);
        };
    }, [device?.device_code]);

    const loadData = async () => {
        try {
            setIsLoading(true);

            // Parallel fetch
            const [deviceRes, serviceRes] = await Promise.all([
                devicesApi.getById(deviceId),
                departmentServicesApi.getById(serviceId)
            ]);

            setDevice(deviceRes);
            setServiceInstance(serviceRes);

            // Check if device should be offline based on last_seen
            if (deviceRes.last_seen) {
                const timeSinceLastSeen = Date.now() - new Date(deviceRes.last_seen).getTime();
                if (timeSinceLastSeen > 10000) {
                    // Device is offline
                    setDevice((prev: any) => prev ? { ...prev, status: 'OFFLINE' } : prev);
                }
            }

            // Load Dashboard Widgets for Device Dashboard
            // Priority: 
            // 1. device_dashboard_layout from service template (via department service)
            // 2. Instance specific config (serviceRes.config?.device_dashboard?.widgets)
            // 3. Default fallback widgets

            console.log('🔍 DEBUG: Service Response:', serviceRes);
            console.log('🔍 DEBUG: device_dashboard_layout:', serviceRes?.device_dashboard_layout);

            const deviceDashboardWidgets = serviceRes?.device_dashboard_layout?.widgets;
            const instanceDeviceWidgets = serviceRes?.config?.device_dashboard?.widgets;

            if (deviceDashboardWidgets && deviceDashboardWidgets.length > 0) {
                console.log('📊 Using device_dashboard_layout widgets:', deviceDashboardWidgets);
                setWidgets(deviceDashboardWidgets);
            } else if (instanceDeviceWidgets && instanceDeviceWidgets.length > 0) {
                console.log('📊 Using instance device_dashboard widgets:', instanceDeviceWidgets);
                setWidgets(instanceDeviceWidgets);
            } else {
                console.log('📊 Using default device widgets');
                // Default Widgets for device dashboard
                setWidgets([
                    {
                        id: 'status_card',
                        type: 'device_status',
                        title: 'Device Status',
                        position: { x: 0, y: 0, w: 4, h: 4 },
                        settings: { showLastSeen: true, showSignalStrength: true }
                    },
                    {
                        id: 'param_dispensed',
                        type: 'parameter_card',
                        title: 'Total Dispensed',
                        parameter_key: 'total_dispensed',
                        position: { x: 4, y: 0, w: 4, h: 2 },
                        settings: { showIcon: true, showUnit: true }
                    },
                    {
                        id: 'param_bottles',
                        type: 'parameter_card',
                        title: 'Bottles Saved',
                        parameter_key: 'bottles_saved',
                        position: { x: 8, y: 0, w: 4, h: 2 },
                        settings: { showIcon: true, showUnit: true }
                    }
                ]);
            }

        } catch (error) {
            console.error('Failed to load device dashboard:', error);
            toast.error('Failed to load device data');
        } finally {
            setIsLoading(false);
        }
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

    if (!device) return <DashboardLayout>Device not found</DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="p-8 max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <button
                            onClick={() => router.push(`/events/${eventId}/departments/${deptId}/services/${serviceId}`)}
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Service
                        </button>
                        <span>/</span>
                        <span className="text-foreground font-medium">{device.name || device.device_code}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Smartphone className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{device.name || device.device_code}</h1>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-mono bg-muted px-2 py-0.5 rounded">{device.device_code}</span>
                                    <span>•</span>
                                    <span className={`flex items-center gap-1 ${device.status === 'ONLINE' ? 'text-green-600' : 'text-gray-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${device.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        {device.status || 'OFFLINE'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm flex items-center gap-2">
                                <Settings className="w-4 h-4" /> Configure
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-12 gap-4 auto-rows-min">
                    {widgets
                        .sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x))
                        .map((widget) => (
                            <div
                                key={widget.id}
                                style={{
                                    gridColumnStart: widget.position.x + 1,
                                    gridColumnEnd: `span ${widget.position.w}`,
                                    gridRowStart: widget.position.y + 1,
                                    minHeight: `${widget.position.h * 80}px`
                                }}
                            >
                                <WidgetRenderer
                                    widget={widget}
                                    isPreview={false}
                                    data={{ ...device, ...(device.metadata || {}) }}
                                    availableParameters={[
                                        // Pass common parameters that might be used
                                        { key: 'total_dispensed', name: 'Water Dispensed', unit: 'L', data_type: 'number' },
                                        { key: 'total_liters', name: 'Total Liters Dispensed', unit: 'L', data_type: 'number' },
                                        { key: 'bottles_saved', name: 'Bottles Saved', unit: 'bottles', data_type: 'number', icon: 'recycle' },
                                        { key: 'bottles_avoided', name: 'Bottles Avoided', unit: 'bottles', data_type: 'number', icon: 'recycle' },
                                        { key: 'co2_saved', name: 'CO2 Saved', unit: 'kg', data_type: 'number', icon: 'leaf' },
                                        { key: 'co2_avoided', name: 'CO2 Avoided', unit: 'kg', data_type: 'number', icon: 'leaf' },
                                        { key: 'flow_rate', name: 'Flow Rate', unit: 'L/min', data_type: 'number' },
                                        { key: 'temperature', name: 'Temperature', unit: '°C', data_type: 'number' },
                                        { key: 'status', name: 'Status', data_type: 'string' }
                                    ]}
                                />
                            </div>
                        ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
