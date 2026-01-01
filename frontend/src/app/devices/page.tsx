'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Smartphone, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { devicesApi } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import TimeDisplay from '@/components/TimeDisplay';
import { getSocket } from '@/lib/socket';

interface Device {
    id: number;
    device_code: string;
    name: string;
    type: string;
    model: string;
    status: string;
    last_seen: string;
    created_at: string;
}

export default function DevicesPage() {
    const router = useRouter();
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDevices();

        const socket = getSocket();

        // 1. Listen for real-time telemetry updates
        const handleTelemetry = (payload: any) => {
            setDevices(prev => prev.map(d => {
                if (d.device_code === payload.device_code) {
                    return {
                        ...d,
                        status: 'online',
                        last_seen: payload.timestamp
                    };
                }
                return d;
            }));
        };

        socket.on('dashboard:telemetry', handleTelemetry);

        // 2. Periodic check to mark devices as offline if silent > 10s
        const offlineCheckInterval = setInterval(() => {
            setDevices(prev => prev.map(d => {
                if (d.status === 'online' && d.last_seen) {
                    const diff = Date.now() - new Date(d.last_seen).getTime();
                    if (diff > 10000) { // 10 seconds timeout
                        return { ...d, status: 'offline' };
                    }
                }
                return d;
            }));
        }, 5000); // Check every 5 seconds

        return () => {
            socket.off('dashboard:telemetry', handleTelemetry);
            clearInterval(offlineCheckInterval);
        };
    }, []);

    const fetchDevices = async () => {
        try {
            const data = await devicesApi.getAll();
            setDevices(data);
        } catch (error) {
            console.error('Error fetching devices:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredDevices = devices.filter(d =>
        d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.device_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.model?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-500 bg-green-500/10';
            case 'offline': return 'text-gray-500 bg-gray-500/10';
            case 'provisioned': return 'text-blue-500 bg-blue-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title">
                            <Smartphone className="w-7 h-7 text-primary" />
                            Devices
                        </h1>
                        <p className="page-header-subtext">Manage and monitor your connected IoT devices.</p>
                    </div>
                    <button
                        onClick={() => router.push('/devices/setup')}
                        className="btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Add Device
                    </button>
                </div>

                {/* Search */}
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search devices..."
                />

                {/* Device List */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Device Code</th>
                                    <th>Name</th>
                                    <th>Model</th>
                                    <th>Status</th>
                                    <th>Last Seen</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                                ) : filteredDevices.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        {searchQuery ? 'No devices found matching your search.' : 'No devices yet. Click "Add Device" to get started.'}
                                    </td></tr>
                                ) : (
                                    filteredDevices.map(device => {
                                        const displayStatus = device.status === 'provisioned' ? 'offline' : device.status;
                                        return (
                                            <tr key={device.id}>
                                                <td className="text-sm font-medium font-mono">{device.device_code}</td>
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-foreground">{device.name}</span>
                                                        <span className="text-xs text-muted-foreground">{device.type}</span>
                                                    </div>
                                                </td>
                                                <td className="text-sm text-muted-foreground">{device.model}</td>
                                                <td>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                                                        {displayStatus}
                                                    </span>
                                                </td>
                                                <td className="text-xs text-muted-foreground">
                                                    {device.last_seen ? (
                                                        <TimeDisplay timestamp={device.last_seen} format="short" />
                                                    ) : (
                                                        <span className="opacity-50">Never</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => router.push(`/devices/${device.id}`)}
                                                        className="text-sm text-primary hover:underline"
                                                    >
                                                        View
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
            </div>
        </DashboardLayout>
    );
}
