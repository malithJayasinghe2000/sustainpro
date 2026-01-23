import React from 'react';
import { Activity, Droplet, Gauge, Thermometer, Zap, Wind, Waves, Battery, Wifi, Cpu, HardDrive, Cloud, Sun, Moon, CloudRain, AlertCircle, Leaf, Clock, Recycle, Package, PlayCircle, Settings, Trash2 } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

// Import new widget components
import TankGaugeWidget from './widgets/visualization/TankGaugeWidget';
import CircularGaugeWidget from './widgets/visualization/CircularGaugeWidget';
import LineChartWidget from './widgets/visualization/LineChartWidget';
import DeviceStatusWidget from './widgets/data/DeviceStatusWidget';
import ParameterCardWidget from './widgets/data/ParameterCardWidget';
import AlertWidget from './widgets/monitoring/AlertWidget';
import AvailableDevicesWidget from './widgets/monitoring/AvailableDevicesWidget';
import AuditLogWidget from './widgets/monitoring/AuditLogWidget';
import ThresholdEditorWidget from './widgets/controls/ThresholdEditorWidget';
import RecordingControlWidget from './widgets/controls/RecordingControlWidget';
import DeviceConfigWidget from './widgets/controls/DeviceConfigWidget';
import TextWidget from './widgets/decorative/TextWidget';
import LogoWidget from './widgets/decorative/LogoWidget';
import IconWidget from './widgets/decorative/IconWidget';
import BackgroundImageWidget from './widgets/decorative/BackgroundImageWidget';
import ContainerWidget from './widgets/layout/ContainerWidget';

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
                                className="min-h-[100px] relative group/nested h-full"
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
                                {/* Nested widget action buttons */}
                                {!isPreview && onEdit && onDelete && (
                                    <div className="absolute -top-6 right-0 flex gap-1 z-30 opacity-0 group-hover/nested:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(child.id); }}
                                            className="p-1 bg-background shadow-md border border-border rounded hover:bg-muted transition-colors"
                                            title="Settings"
                                        >
                                            <Settings className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(child.id); }}
                                            className="p-1 bg-background shadow-md border border-border rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )) || (
                                <div className="col-span-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg min-h-[120px]">
                                    No sub-widgets added
                                </div>
                            )}
                    </div>
                </div>
            );

        case 'device_status':
            return (
                <DeviceStatusWidget
                    widget={widget}
                    data={{
                        status: data.status,
                        last_seen: data.last_seen,
                        signal_strength: data.signalStrength,
                        battery_level: data.battery,
                    }}
                    isPreview={isPreview}
                />
            );

        case 'tank_gauge':
            return (
                <TankGaugeWidget
                    widget={widget}
                    value={isPreview ? 65 : data[widget.parameter_key!]}
                    isPreview={isPreview}
                />
            );

        case 'circular_gauge':
            return (
                <CircularGaugeWidget
                    widget={widget}
                    value={isPreview ? 72 : data[widget.parameter_key!]}
                    isPreview={isPreview}
                />
            );

        case 'line_chart':
            return (
                <LineChartWidget
                    widget={widget}
                    data={isPreview ? undefined : data.chartData}
                    isPreview={isPreview}
                />
            );

        case 'alert_widget':
            return (
                <AlertWidget
                    widget={widget}
                    alerts={isPreview ? undefined : data.alerts}
                    isPreview={isPreview}
                    onAcknowledge={data.onAcknowledge}
                />
            );

        case 'available_devices':
            return (
                <AvailableDevicesWidget
                    widget={widget}
                    devices={isPreview ? undefined : data.devices}
                    isPreview={isPreview}
                    onAddDevice={data.onAddDevice}
                    onSelectDevice={data.onSelectDevice}
                />
            );

        case 'audit_log':
            return (
                <AuditLogWidget
                    widget={widget}
                    entries={isPreview ? undefined : data.auditEntries}
                    isPreview={isPreview}
                />
            );

        case 'threshold_editor':
            return (
                <ThresholdEditorWidget
                    widget={widget}
                    thresholds={isPreview ? undefined : data.thresholds}
                    isPreview={isPreview}
                    onSave={data.onThresholdSave}
                />
            );

        case 'recording_control':
            return (
                <RecordingControlWidget
                    widget={widget}
                    isRecording={isPreview ? undefined : data.isRecording}
                    recordingDuration={data.recordingDuration}
                    isPreview={isPreview}
                    onToggle={data.onToggleRecording}
                />
            );

        case 'device_config':
            return (
                <DeviceConfigWidget
                    widget={widget}
                    fields={isPreview ? undefined : data.configFields}
                    isPreview={isPreview}
                    onSave={data.onConfigSave}
                    isEditing={data.isConfigEditing}
                />
            );

        case 'text_widget':
            return (
                <TextWidget
                    widget={widget}
                    isPreview={isPreview}
                />
            );

        case 'logo_widget':
            return (
                <LogoWidget
                    widget={widget}
                    isPreview={isPreview}
                />
            );

        case 'icon_widget':
            return (
                <IconWidget
                    widget={widget}
                    isPreview={isPreview}
                    onClick={data.onIconClick}
                />
            );

        case 'background_image':
            return (
                <BackgroundImageWidget
                    widget={widget}
                    isPreview={isPreview}
                >
                    {widget.children?.map((child) => (
                        <div key={child.id} className="relative group/nested">
                            <WidgetRenderer
                                widget={child}
                                isPreview={isPreview}
                                availableParameters={availableParameters}
                                data={data}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                isNested={true}
                            />
                            {/* Nested widget action buttons */}
                            {!isPreview && onEdit && onDelete && (
                                <div className="absolute -top-6 right-0 flex gap-1 z-30 opacity-0 group-hover/nested:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(child.id); }}
                                        className="p-1 bg-background shadow-md border border-border rounded hover:bg-muted transition-colors"
                                        title="Settings"
                                    >
                                        <Settings className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(child.id); }}
                                        className="p-1 bg-background shadow-md border border-border rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </BackgroundImageWidget>
            );

        case 'section':
            // Section divider with label
            return (
                <div className="h-full flex items-center gap-4 px-2">
                    <div className="h-px flex-1 bg-border"></div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {widget.title || 'Section'}
                    </h3>
                    <div className="h-px flex-1 bg-border"></div>
                </div>
            );

        case 'transparent_parameter':
            // Minimalist parameter display without card background
            const transparentParam = getParameterDetails(widget.parameter_key);
            const TransparentIcon = getSmartIcon(transparentParam || undefined);
            return (
                <div className="h-full flex flex-col items-center justify-center text-center p-2">
                    <TransparentIcon className="w-8 h-8 text-primary/60 mb-2" />
                    <div className="text-2xl font-bold">
                        {isPreview ? '42' : (data[widget.parameter_key!] ?? '--')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {transparentParam?.name || widget.title} {transparentParam?.unit ? `(${transparentParam.unit})` : ''}
                    </div>
                </div>
            );

        case 'table_view':
            // Data table widget
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">{widget.title || 'Data Table'}</h4>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-2 px-2 font-medium">Parameter</th>
                                    <th className="text-right py-2 px-2 font-medium">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isPreview ? (
                                    <>
                                        <tr className="border-b border-border/50"><td className="py-2 px-2">Temperature</td><td className="text-right py-2 px-2">25°C</td></tr>
                                        <tr className="border-b border-border/50"><td className="py-2 px-2">Humidity</td><td className="text-right py-2 px-2">60%</td></tr>
                                        <tr><td className="py-2 px-2">Pressure</td><td className="text-right py-2 px-2">1013 hPa</td></tr>
                                    </>
                                ) : (
                                    Object.entries(data).slice(0, widget.settings.pageSize || 10).map(([key, value]) => (
                                        <tr key={key} className="border-b border-border/50">
                                            <td className="py-2 px-2">{key}</td>
                                            <td className="text-right py-2 px-2">{String(value)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );

        case 'chart_table_toggle':
            // Toggle between chart and table view
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-muted-foreground">{widget.title || 'Chart/Table'}</h4>
                        <div className="flex gap-1 bg-muted rounded-md p-0.5">
                            <button className="px-2 py-1 text-xs rounded bg-background shadow-sm">Chart</button>
                            <button className="px-2 py-1 text-xs rounded text-muted-foreground">Table</button>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                        {isPreview ? 'Chart/Table Preview' : 'No data available'}
                    </div>
                </div>
            );

        case 'gauge':
            // Use CircularGaugeWidget for gauge type
            return (
                <CircularGaugeWidget
                    widget={widget}
                    value={isPreview ? 72 : data[widget.parameter_key!]}
                    isPreview={isPreview}
                />
            );

        case 'counter':
            // Big number display with animation
            const counterParam = getParameterDetails(widget.parameter_key);
            const counterValue = isPreview ? 1234 : (data[widget.parameter_key!] ?? 0);
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col items-center justify-center">
                    <div className="text-4xl font-bold tabular-nums">
                        {widget.settings.prefix || ''}{Number(counterValue).toLocaleString()}{widget.settings.suffix || ''}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                        {counterParam?.name || widget.title}
                    </div>
                </div>
            );

        case 'status_indicator':
            // Status badge indicator
            const statusValue = isPreview ? 'ONLINE' : (data.status || 'UNKNOWN');
            const statusColors: Record<string, string> = {
                'ONLINE': 'bg-green-500',
                'OFFLINE': 'bg-gray-400',
                'WARNING': 'bg-amber-500',
                'ERROR': 'bg-red-500',
                'UNKNOWN': 'bg-gray-300'
            };
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4 flex items-center justify-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${statusColors[statusValue] || statusColors.UNKNOWN} animate-pulse`}></div>
                    <span className="font-medium">{widget.title || statusValue}</span>
                </div>
            );

        default:
            return (
                <div className="h-full bg-card border border-border rounded-lg p-4 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Unknown widget type: {widget.type}</span>
                </div>
            );
    }
}
