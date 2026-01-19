'use client';

import React from 'react';
import { Cpu, Plus, Wifi, WifiOff } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

interface Device {
    id: string;
    name: string;
    device_code: string;
    status: 'ONLINE' | 'OFFLINE' | 'WARNING';
    last_seen?: string;
}

interface AvailableDevicesWidgetProps {
    widget: WidgetConfig;
    devices?: Device[];
    isPreview?: boolean;
    onAddDevice?: () => void;
    onSelectDevice?: (deviceId: string) => void;
}

export default function AvailableDevicesWidget({ 
    widget, 
    devices, 
    isPreview = false,
    onAddDevice,
    onSelectDevice 
}: AvailableDevicesWidgetProps) {
    const settings = widget.settings;
    const showAddButton = settings.showAddButton !== false;
    const groupByStatus = settings.groupByStatus ?? true;
    const maxDevices = settings.maxDevices || 10;

    // Preview data
    const previewDevices: Device[] = [
        { id: '1', name: 'Tank Sensor 01', device_code: 'SPS-DEV-001', status: 'ONLINE' },
        { id: '2', name: 'Flow Meter A', device_code: 'SPS-DEV-002', status: 'ONLINE' },
        { id: '3', name: 'Level Sensor B', device_code: 'SPS-DEV-003', status: 'OFFLINE' },
        { id: '4', name: 'Temp Sensor C', device_code: 'SPS-DEV-004', status: 'WARNING' },
    ];

    const displayDevices = (isPreview ? previewDevices : (devices || [])).slice(0, maxDevices);

    // Group devices by status if enabled
    const groupedDevices = groupByStatus 
        ? {
            online: displayDevices.filter(d => d.status === 'ONLINE'),
            warning: displayDevices.filter(d => d.status === 'WARNING'),
            offline: displayDevices.filter(d => d.status === 'OFFLINE'),
        }
        : null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ONLINE': return 'text-green-500 bg-green-500/10';
            case 'WARNING': return 'text-amber-500 bg-amber-500/10';
            default: return 'text-red-500 bg-red-500/10';
        }
    };

    const DeviceCard = ({ device }: { device: Device }) => (
        <div 
            onClick={() => onSelectDevice?.(device.id)}
            className={`flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors ${onSelectDevice ? 'cursor-pointer' : ''}`}
        >
            <div className={`p-2 rounded-lg ${getStatusColor(device.status)}`}>
                {device.status === 'ONLINE' ? (
                    <Wifi className="w-4 h-4" />
                ) : (
                    <WifiOff className="w-4 h-4" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{device.name}</p>
                <p className="text-xs text-muted-foreground truncate">{device.device_code}</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${device.status === 'ONLINE' ? 'bg-green-500' : device.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'}`} />
        </div>
    );

    return (
        <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">{widget.title || 'Devices'}</h4>
                </div>
                <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                    {displayDevices.length}
                </span>
            </div>

            {/* Device List */}
            <div className="flex-1 overflow-auto space-y-2">
                {displayDevices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Cpu className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No devices found</p>
                    </div>
                ) : groupedDevices ? (
                    <>
                        {groupedDevices.online.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider text-green-500 font-medium mb-1">
                                    Online ({groupedDevices.online.length})
                                </p>
                                {groupedDevices.online.map(device => (
                                    <DeviceCard key={device.id} device={device} />
                                ))}
                            </div>
                        )}
                        {groupedDevices.warning.length > 0 && (
                            <div className="space-y-1 mt-3">
                                <p className="text-[10px] uppercase tracking-wider text-amber-500 font-medium mb-1">
                                    Warning ({groupedDevices.warning.length})
                                </p>
                                {groupedDevices.warning.map(device => (
                                    <DeviceCard key={device.id} device={device} />
                                ))}
                            </div>
                        )}
                        {groupedDevices.offline.length > 0 && (
                            <div className="space-y-1 mt-3">
                                <p className="text-[10px] uppercase tracking-wider text-red-500 font-medium mb-1">
                                    Offline ({groupedDevices.offline.length})
                                </p>
                                {groupedDevices.offline.map(device => (
                                    <DeviceCard key={device.id} device={device} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    displayDevices.map(device => (
                        <DeviceCard key={device.id} device={device} />
                    ))
                )}
            </div>

            {/* Add Device Button */}
            {showAddButton && onAddDevice && (
                <button
                    onClick={onAddDevice}
                    className="mt-3 w-full flex items-center justify-center gap-2 p-2 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Device</span>
                </button>
            )}
        </div>
    );
}
