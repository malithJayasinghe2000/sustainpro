'use client';

import React from 'react';
import { Wifi, WifiOff, Battery, BatteryLow, BatteryMedium, BatteryFull, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

interface DeviceStatusWidgetProps {
    widget: WidgetConfig;
    data?: {
        status?: 'ONLINE' | 'OFFLINE' | 'WARNING';
        last_seen?: string;
        signal_strength?: number;
        battery_level?: number;
        firmware_version?: string;
    };
    isPreview?: boolean;
}

export default function DeviceStatusWidget({ widget, data, isPreview = false }: DeviceStatusWidgetProps) {
    const settings = widget.settings;
    const showLastSeen = settings.showLastSeen !== false;
    const showSignalStrength = settings.showSignalStrength !== false;
    const showBattery = settings.showBattery !== false;

    // Preview data
    const previewData = {
        status: 'ONLINE' as const,
        last_seen: new Date().toISOString(),
        signal_strength: 85,
        battery_level: 72,
        firmware_version: 'v2.1.0'
    };

    const displayData = isPreview ? previewData : (data || previewData);

    // Format last seen time
    const formatLastSeen = (isoString?: string) => {
        if (!isoString) return 'Never';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return `${Math.floor(diffMins / 1440)}d ago`;
    };

    // Get status icon and color
    const getStatusInfo = () => {
        switch (displayData.status) {
            case 'ONLINE':
                return { 
                    icon: CheckCircle, 
                    color: 'text-green-500', 
                    bg: 'bg-green-500/10',
                    label: 'Online'
                };
            case 'WARNING':
                return { 
                    icon: AlertCircle, 
                    color: 'text-amber-500', 
                    bg: 'bg-amber-500/10',
                    label: 'Warning'
                };
            default:
                return { 
                    icon: XCircle, 
                    color: 'text-red-500', 
                    bg: 'bg-red-500/10',
                    label: 'Offline'
                };
        }
    };

    // Get battery icon based on level
    const getBatteryIcon = (level: number) => {
        if (level <= 20) return BatteryLow;
        if (level <= 50) return BatteryMedium;
        return BatteryFull;
    };

    // Get signal icon and strength label
    const getSignalInfo = (strength: number) => {
        const bars = strength >= 75 ? 4 : strength >= 50 ? 3 : strength >= 25 ? 2 : 1;
        return { bars, label: `${strength}%` };
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;
    const BatteryIcon = displayData.battery_level ? getBatteryIcon(displayData.battery_level) : Battery;
    const signalInfo = displayData.signal_strength ? getSignalInfo(displayData.signal_strength) : null;

    return (
        <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
            {/* Header with status */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">{widget.title}</h4>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusInfo.bg}`}>
                    <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                    <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
            </div>

            {/* Status indicators */}
            <div className="flex-1 grid grid-cols-2 gap-3">
                {/* Last Seen */}
                {showLastSeen && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Seen</p>
                            <p className="text-sm font-medium">{formatLastSeen(displayData.last_seen)}</p>
                        </div>
                    </div>
                )}

                {/* Signal Strength */}
                {showSignalStrength && signalInfo && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <Wifi className={`w-4 h-4 ${displayData.status === 'ONLINE' ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Signal</p>
                            <p className="text-sm font-medium">{signalInfo.label}</p>
                        </div>
                    </div>
                )}

                {/* Battery Level */}
                {showBattery && displayData.battery_level !== undefined && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <BatteryIcon className={`w-4 h-4 ${displayData.battery_level <= 20 ? 'text-red-500' : displayData.battery_level <= 50 ? 'text-amber-500' : 'text-green-500'}`} />
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Battery</p>
                            <p className="text-sm font-medium">{displayData.battery_level}%</p>
                        </div>
                    </div>
                )}

                {/* Firmware */}
                {displayData.firmware_version && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-primary">FW</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Firmware</p>
                            <p className="text-sm font-medium">{displayData.firmware_version}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
