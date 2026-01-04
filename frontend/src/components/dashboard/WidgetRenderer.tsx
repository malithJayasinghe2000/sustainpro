import React from 'react';
import { Activity, Droplet, Gauge, Thermometer, Zap, Wind, Waves, Battery, Wifi, Cpu, HardDrive, Cloud, Sun, Moon, CloudRain, AlertCircle, Leaf, Clock, Recycle, Package, PlayCircle } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

interface WidgetRendererProps {
    widget: WidgetConfig;
    isPreview?: boolean;
    availableParameters?: { key: string; name: string; unit?: string; icon?: string; data_type: string }[];
    data?: Record<string, any>;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    isNested?: boolean;
}

export default function WidgetRenderer({
    widget,
    isPreview = false,
    availableParameters = [],
    data = {},
    onEdit,
    onDelete,
    isNested = false
}: WidgetRendererProps) {
    // Find parameter details
    const getParameterDetails = (paramKey?: string) => {
        if (!paramKey) return null;
        return availableParameters.find(p => p.key === paramKey);
    };

    const getSmartIcon = (param?: { name: string; unit?: string; icon?: string }) => {
        const icons: any = {
            // Temperature & Environment
            'thermometer': Thermometer,
            'temperature': Thermometer,
            'sun': Sun,
            'moon': Moon,

            // Water & Humidity
            'droplet': Droplet,
            'water': Droplet,
            'humidity': Droplet,
            'waves': Waves,

            // Power & Energy
            'zap': Zap,
            'battery': Battery,
            'power': Zap,
            'voltage': Zap,
            'current': Zap,

            // Pressure & Flow
            'gauge': Gauge,
            'pressure': Gauge,
            'flow': Waves,

            // Air Quality & Weather
            'wind': Wind,
            'air': Wind,
            'cloud': Cloud,
            'cloudrain': CloudRain,
            'rain': CloudRain,

            // Network & Connectivity
            'wifi': Wifi,
            'signal': Wifi,

            // Device & System
            'cpu': Cpu,
            'harddrive': HardDrive,
            'storage': HardDrive,

            // Alerts & Status
            'alert': AlertCircle,
            'alertcircle': AlertCircle,

            // Default
            'activity': Activity,
        };
        // 1. Try explicit icon key first
        if (param?.icon && icons[param.icon.toLowerCase()]) {
            return icons[param.icon.toLowerCase()];
        }

        // 2. Try matching name/unit keywords
        const name = param?.name?.toLowerCase() || '';
        const unit = param?.unit?.toLowerCase() || '';

        if (name.includes('temp') || unit.includes('°')) return Thermometer;
        if (name.includes('humidity') || name.includes('moisture')) return Droplet;
        if (name.includes('flow') || name.includes('rate') || unit.includes('l/m')) return Waves;
        if (name.includes('pressure') || unit.includes('psi') || unit.includes('bar')) return Gauge;
        if (name.includes('power') || name.includes('volt') || unit.includes('kw') || unit.includes('w')) return Zap;
        if (name.includes('battery')) return Battery;
        if (name.includes('co2') || name.includes('air')) return Leaf;
        if (name.includes('bottle') || name.includes('saved') || name.includes('avoided')) return Recycle;
        if (name.includes('time') || name.includes('uptime')) return Clock;
        if (name.includes('signal') || name.includes('rssi')) return Wifi;
        if (name.includes('volume') || name.includes('level') || unit === 'l') return Droplet;

        // 3. Fallback
        return Activity;
    };

    switch (widget.type) {
        case 'parameter_card':
            const paramData = getParameterDetails(widget.parameter_key);
            const Icon = getSmartIcon(paramData || undefined);

            return (
                <div className={`h-full bg-card border border-border rounded-lg ${isNested ? 'p-2.5 sm:p-3' : 'p-4'} flex flex-col relative group min-h-0 overflow-hidden`}>
                    <div className={`flex items-start justify-between ${isNested ? 'mb-1' : 'mb-2'}`}>
                        <h4 className="text-sm text-muted-foreground truncate mr-2 font-medium">{paramData?.name || widget.title}</h4>
                        {widget.settings.showIcon && (
                            <div className={`p-1.5 bg-primary/10 rounded-lg shrink-0 ${isNested ? 'hidden lg:block' : ''}`}>
                                <Icon className="w-4 h-4 text-primary" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
                        <div className={`${isNested ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-3xl'} font-bold truncate leading-none`}>
                            {isPreview ? '42' : (data.status === 'OFFLINE' ? '--' : (data[widget.parameter_key!] !== undefined ? data[widget.parameter_key!] : '--'))}
                        </div>
                        {widget.settings.showUnit && (
                            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate opacity-80 uppercase tracking-wider">
                                {paramData?.unit || 'unit'}
                            </div>
                        )}
                    </div>
                    {
                        onEdit && onDelete && !isPreview && (
                            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(widget.id); }}
                                    className="p-1.5 bg-background/90 backdrop-blur-sm border border-border rounded hover:bg-muted transition-colors cursor-pointer"
                                    title="Settings"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
                                    className="p-1.5 bg-background/90 backdrop-blur-sm border border-border rounded hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer"
                                    title="Delete"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        )
                    }
                </div>
            );

        case 'container':
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4 pb-8 flex flex-col relative group">
                    {widget.title && <h4 className="text-sm font-medium text-muted-foreground mb-4">{widget.title}</h4>}
                    <div
                        className={`grid gap-3 sm:gap-4 flex-1 min-h-0`}
                        style={{
                            gridTemplateColumns: `repeat(${widget.settings.columns || 2}, 1fr)`,
                            gridTemplateRows: widget.settings.rows ? `repeat(${widget.settings.rows}, 1fr)` : 'auto'
                        }}
                    >
                        {widget.children?.map((child) => (
                            <div
                                key={child.id}
                                className="min-h-[100px] relative group h-full"
                                style={{ gridColumn: `span ${child.settings.colSpan || 1}` }}
                            >
                                <WidgetRenderer
                                    widget={child}
                                    isPreview={isPreview}
                                    availableParameters={availableParameters}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    isNested={true}
                                    data={data}
                                />
                            </div>
                        )) || (
                                <div className="col-span-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg min-h-[120px]">
                                    No sub-widgets added
                                </div>
                            )}
                    </div>
                    {onEdit && onDelete && !isPreview && (
                        <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(widget.id); }}
                                className="p-1.5 bg-background/90 backdrop-blur-sm border border-border rounded hover:bg-muted transition-colors cursor-pointer"
                                title="Settings"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
                                className="p-1.5 bg-background/90 backdrop-blur-sm border border-border rounded hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer"
                                title="Delete"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    )}
                </div>
            );

        case 'device_status':
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">{widget.title}</h4>
                    <div className="space-y-3">
                        {/* Device ID */}
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="text-xs text-muted-foreground">Device ID</span>
                            <span className="text-sm font-mono font-medium">
                                {isPreview ? 'WW-001' : (data.device_code || '--')}
                            </span>
                        </div>

                        {/* Status (Always shown) */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Status</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isPreview || data.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'} ${isPreview ? 'animate-pulse' : ''}`} />
                                <span className={`text-sm font-medium ${isPreview || data.status === 'ONLINE' ? 'text-green-600' : 'text-muted-foreground'}`}>
                                    {isPreview ? 'Online' : (data.status || 'Unknown')}
                                </span>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Location</span>
                            <span>{isPreview ? 'Tank Room A' : '--'}</span>
                        </div>

                        {/* Last Data Received (Always shown) */}
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Last Data</span>
                            <span className="text-muted-foreground">Last Data</span>
                            <span>{isPreview ? '2 min ago' : (data.last_seen ? new Date(data.last_seen).toLocaleString() : '--')}</span>
                        </div>

                        {/* Battery (if parameter selected) */}
                        {widget.settings.batteryParameter && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Battery</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: isPreview ? '87%' : '0%' }} />
                                    </div>
                                    <span>{isPreview ? '87%' : '--'}</span>
                                </div>
                            </div>
                        )}

                        {/* Signal Strength (if parameter selected) */}
                        {widget.settings.signalParameter && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Signal</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4].map((bar) => (
                                        <div
                                            key={bar}
                                            className={`w-1 ${isPreview && bar <= 3 ? 'bg-green-500' : 'bg-muted'}`}
                                            style={{ height: `${bar * 3}px` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Firmware (if parameter selected) */}
                        {widget.settings.firmwareParameter && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Firmware</span>
                                <span className="font-mono">{isPreview ? 'v2.1.4' : '--'}</span>
                            </div>
                        )}

                        {/* Uptime */}
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Uptime</span>
                            <span>{isPreview ? '14d 6h' : '--'}</span>
                        </div>

                        {/* IP Address */}
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">IP</span>
                            <span className="font-mono">{isPreview ? '192.168.1.45' : '--'}</span>
                        </div>
                    </div>
                </div>
            );

        case 'tank_gauge':
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col items-center justify-center">
                    <h4 className="text-sm text-muted-foreground mb-4">{widget.title}</h4>
                    <div className="relative w-24 h-32 border-2 border-border rounded-lg overflow-hidden">
                        <div
                            className="absolute bottom-0 w-full bg-blue-500/30 transition-all"
                            style={{ height: isPreview ? '65%' : '0%' }}
                        />
                    </div>
                    <div className="text-2xl font-bold mt-4">{isPreview ? '65%' : '--'}</div>
                </div>
            );

        case 'line_chart':
        case 'gauge':
        case 'counter':
        case 'status_indicator':
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">{widget.title} (Preview)</span>
                </div>
            );

        default:
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Unknown widget type</span>
                </div>
            );
    }
}
