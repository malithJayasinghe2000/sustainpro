'use client';

import React from 'react';
import { History, User, Cpu, Settings, AlertTriangle, Check, X, Edit } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'CONFIG' | 'ALERT' | 'ACKNOWLEDGE';

interface AuditEntry {
    id: string;
    action: AuditAction;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;
    user_name?: string;
    user_email?: string;
    details?: string;
    created_at: string;
}

interface AuditLogWidgetProps {
    widget: WidgetConfig;
    entries?: AuditEntry[];
    isPreview?: boolean;
}

export default function AuditLogWidget({ widget, entries, isPreview = false }: AuditLogWidgetProps) {
    const settings = widget.settings;
    const maxEntries = settings.maxEntries || 10;
    const showTimestamp = settings.showTimestamp !== false;
    const showUser = settings.showUser !== false;
    const filterActions = settings.filterActions as AuditAction[] | undefined;

    // Preview data
    const previewEntries: AuditEntry[] = [
        { id: '1', action: 'UPDATE', entity_type: 'Device', entity_name: 'Tank Sensor 01', user_name: 'John Doe', created_at: new Date(Date.now() - 300000).toISOString() },
        { id: '2', action: 'ALERT', entity_type: 'Alert', entity_name: 'High Level Warning', user_name: 'System', created_at: new Date(Date.now() - 600000).toISOString() },
        { id: '3', action: 'ACKNOWLEDGE', entity_type: 'Alert', entity_name: 'Low Battery', user_name: 'Jane Smith', created_at: new Date(Date.now() - 900000).toISOString() },
        { id: '4', action: 'CONFIG', entity_type: 'Settings', entity_name: 'Threshold Settings', user_name: 'Admin', created_at: new Date(Date.now() - 1200000).toISOString() },
        { id: '5', action: 'LOGIN', entity_type: 'User', entity_name: 'John Doe', user_name: 'John Doe', created_at: new Date(Date.now() - 1800000).toISOString() },
    ];

    let displayEntries = (isPreview ? previewEntries : (entries || []));
    
    // Filter by action types if specified
    if (filterActions && filterActions.length > 0) {
        displayEntries = displayEntries.filter(e => filterActions.includes(e.action));
    }
    
    displayEntries = displayEntries.slice(0, maxEntries);

    const getActionIcon = (action: AuditAction) => {
        switch (action) {
            case 'CREATE': return <Check className="w-3 h-3" />;
            case 'UPDATE': return <Edit className="w-3 h-3" />;
            case 'DELETE': return <X className="w-3 h-3" />;
            case 'LOGIN': 
            case 'LOGOUT': return <User className="w-3 h-3" />;
            case 'CONFIG': return <Settings className="w-3 h-3" />;
            case 'ALERT': return <AlertTriangle className="w-3 h-3" />;
            case 'ACKNOWLEDGE': return <Check className="w-3 h-3" />;
            default: return <Cpu className="w-3 h-3" />;
        }
    };

    const getActionColor = (action: AuditAction) => {
        switch (action) {
            case 'CREATE': return 'text-green-500 bg-green-500/10';
            case 'UPDATE': return 'text-blue-500 bg-blue-500/10';
            case 'DELETE': return 'text-red-500 bg-red-500/10';
            case 'LOGIN': return 'text-emerald-500 bg-emerald-500/10';
            case 'LOGOUT': return 'text-slate-500 bg-slate-500/10';
            case 'CONFIG': return 'text-purple-500 bg-purple-500/10';
            case 'ALERT': return 'text-amber-500 bg-amber-500/10';
            case 'ACKNOWLEDGE': return 'text-teal-500 bg-teal-500/10';
            default: return 'text-muted-foreground bg-muted';
        }
    };

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const getActionText = (entry: AuditEntry) => {
        switch (entry.action) {
            case 'CREATE': return `Created ${entry.entity_type}`;
            case 'UPDATE': return `Updated ${entry.entity_type}`;
            case 'DELETE': return `Deleted ${entry.entity_type}`;
            case 'LOGIN': return 'Logged in';
            case 'LOGOUT': return 'Logged out';
            case 'CONFIG': return `Changed ${entry.entity_type}`;
            case 'ALERT': return 'Alert triggered';
            case 'ACKNOWLEDGE': return 'Acknowledged alert';
            default: return entry.action;
        }
    };

    return (
        <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-medium">{widget.title || 'Audit Log'}</h4>
            </div>

            {/* Log Entries */}
            <div className="flex-1 overflow-auto space-y-2">
                {displayEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <History className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No audit entries</p>
                    </div>
                ) : (
                    displayEntries.map(entry => (
                        <div 
                            key={entry.id} 
                            className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg"
                        >
                            {/* Action Icon */}
                            <div className={`p-1.5 rounded ${getActionColor(entry.action)}`}>
                                {getActionIcon(entry.action)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {getActionText(entry)}
                                </p>
                                {entry.entity_name && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {entry.entity_name}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    {showUser && entry.user_name && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <User className="w-2.5 h-2.5" />
                                            {entry.user_name}
                                        </span>
                                    )}
                                    {showTimestamp && (
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatTimeAgo(entry.created_at)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
