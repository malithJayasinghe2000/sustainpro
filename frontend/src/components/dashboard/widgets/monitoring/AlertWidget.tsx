'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Bell, X } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

interface Alert {
    id: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    timestamp: string;
    acknowledged?: boolean;
}

interface AlertWidgetProps {
    widget: WidgetConfig;
    alerts?: Alert[];
    isPreview?: boolean;
    onAcknowledge?: (id: string) => void;
}

export default function AlertWidget({ widget, alerts, isPreview = false, onAcknowledge }: AlertWidgetProps) {
    const settings = widget.settings;
    const maxAlerts = settings.maxAlerts || 5;
    const showAcknowledged = settings.showAcknowledged ?? false;
    const severityFilter = settings.severityFilter || ['info', 'warning', 'critical'];

    // Preview data
    const previewAlerts: Alert[] = [
        { id: '1', message: 'Water level below threshold', severity: 'warning', timestamp: new Date().toISOString() },
        { id: '2', message: 'Device offline for 30 minutes', severity: 'critical', timestamp: new Date(Date.now() - 1800000).toISOString() },
        { id: '3', message: 'Firmware update available', severity: 'info', timestamp: new Date(Date.now() - 3600000).toISOString() },
    ];

    const displayAlerts = isPreview ? previewAlerts : (alerts || []);

    // Filter and limit alerts
    const filteredAlerts = displayAlerts
        .filter(a => severityFilter.includes(a.severity))
        .filter(a => showAcknowledged || !a.acknowledged)
        .slice(0, maxAlerts);

    // Get severity icon and colors
    const getSeverityInfo = (severity: string) => {
        switch (severity) {
            case 'critical':
                return { 
                    icon: AlertTriangle, 
                    color: 'text-red-500',
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/30'
                };
            case 'warning':
                return { 
                    icon: AlertCircle, 
                    color: 'text-amber-500',
                    bg: 'bg-amber-500/10',
                    border: 'border-amber-500/30'
                };
            default:
                return { 
                    icon: Info, 
                    color: 'text-blue-500',
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/30'
                };
        }
    };

    // Format time ago
    const formatTimeAgo = (isoString: string) => {
        const now = new Date();
        const date = new Date(isoString);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return `${Math.floor(diffMins / 1440)}d ago`;
    };

    return (
        <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">{widget.title || 'Alerts'}</h4>
                </div>
                {filteredAlerts.length > 0 && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                        {filteredAlerts.length}
                    </span>
                )}
            </div>

            {/* Alert List */}
            <div className="flex-1 overflow-auto space-y-2">
                {filteredAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No active alerts</p>
                    </div>
                ) : (
                    filteredAlerts.map((alert) => {
                        const info = getSeverityInfo(alert.severity);
                        const Icon = info.icon;
                        
                        return (
                            <div 
                                key={alert.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border ${info.bg} ${info.border} ${alert.acknowledged ? 'opacity-60' : ''}`}
                            >
                                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${info.color}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{alert.message}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(alert.timestamp)}</p>
                                </div>
                                {!alert.acknowledged && onAcknowledge && (
                                    <button
                                        onClick={() => onAcknowledge(alert.id)}
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                        title="Acknowledge"
                                    >
                                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
