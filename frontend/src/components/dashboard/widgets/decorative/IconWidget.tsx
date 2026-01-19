'use client';

import React from 'react';
import { 
    Droplet, 
    Thermometer, 
    Gauge, 
    Zap, 
    Wind, 
    Sun, 
    Cloud, 
    Battery, 
    Wifi, 
    Activity,
    AlertTriangle,
    Bell,
    Check,
    Clock,
    Cpu,
    Database,
    Eye,
    Heart,
    Home,
    Info,
    Lock,
    MapPin,
    Power,
    RefreshCw,
    Server,
    Settings,
    Shield,
    Star,
    Trash,
    User,
    Volume2,
    LucideIcon
} from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

// Icon mapping
const ICONS: Record<string, LucideIcon> = {
    droplet: Droplet,
    thermometer: Thermometer,
    gauge: Gauge,
    zap: Zap,
    wind: Wind,
    sun: Sun,
    cloud: Cloud,
    battery: Battery,
    wifi: Wifi,
    activity: Activity,
    alert: AlertTriangle,
    bell: Bell,
    check: Check,
    clock: Clock,
    cpu: Cpu,
    database: Database,
    eye: Eye,
    heart: Heart,
    home: Home,
    info: Info,
    lock: Lock,
    'map-pin': MapPin,
    power: Power,
    refresh: RefreshCw,
    server: Server,
    settings: Settings,
    shield: Shield,
    star: Star,
    trash: Trash,
    user: User,
    volume: Volume2,
};

interface IconWidgetProps {
    widget: WidgetConfig;
    isPreview?: boolean;
    onClick?: () => void;
}

export default function IconWidget({ widget, isPreview = false, onClick }: IconWidgetProps) {
    const settings = widget.settings;
    const iconName = settings.iconName || 'droplet';
    const iconColor = settings.iconColor || 'currentColor';
    const iconSize = settings.iconSize || 48;
    const backgroundColor = settings.backgroundColor;
    const showLabel = settings.showLabel !== false;
    const label = settings.label || widget.title;
    const labelPosition = settings.labelPosition || 'bottom'; // 'top' | 'bottom' | 'left' | 'right'
    const isClickable = settings.isClickable ?? false;
    const hoverEffect = settings.hoverEffect ?? true;

    const IconComponent = ICONS[iconName] || Droplet;

    const containerClasses = `
        h-full flex items-center justify-center p-4
        ${labelPosition === 'left' || labelPosition === 'right' ? 'flex-row gap-3' : 'flex-col gap-2'}
        ${labelPosition === 'left' ? 'flex-row-reverse' : ''}
        ${labelPosition === 'top' ? 'flex-col-reverse' : ''}
        ${isClickable || onClick ? 'cursor-pointer' : ''}
        ${hoverEffect && (isClickable || onClick) ? 'hover:opacity-80 transition-opacity' : ''}
    `;

    return (
        <div 
            onClick={onClick}
            className={containerClasses}
            style={{ backgroundColor }}
        >
            {/* Icon */}
            <div 
                className="flex items-center justify-center"
                style={{ color: iconColor }}
            >
                <IconComponent 
                    style={{ 
                        width: iconSize, 
                        height: iconSize,
                    }} 
                />
            </div>

            {/* Label */}
            {showLabel && label && (
                <span 
                    className="text-sm font-medium text-foreground text-center"
                    style={{ color: settings.labelColor }}
                >
                    {label}
                </span>
            )}
        </div>
    );
}

// Export icon list for settings panel
export const AVAILABLE_ICONS = Object.keys(ICONS);
