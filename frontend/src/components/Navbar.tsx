'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Sun, Moon, Bell, Clock, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/api';
import UniversalCreator from './UniversalCreator';
import { getFullImageUrl } from './ImageUpload';
import { Plus, Activity, Cpu } from 'lucide-react';

export default function Navbar() {
    const { theme, toggleTheme } = useTheme();
    const { settings } = useSettings();
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mounted, setMounted] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);
    const [showUniversalCreator, setShowUniversalCreator] = useState(false);
    const [serverStats, setServerStats] = useState<any>(null);
    const [dismissedAlert, setDismissedAlert] = useState(false);
    const alertsRef = useRef<HTMLDivElement>(null);

    // Get settings values with fallbacks
    const siteTitle = settings?.site_title || 'SPS IoT';
    const siteLogo = settings?.site_logo; // User configured logo from settings
    const orgLogo = user?.logo_url || user?.org_logo; // Organization-specific logo (backend returns logo_url)
    // Use getFullImageUrl to resolve relative URLs to full URLs, fallback to default logo
    const logo = getFullImageUrl(orgLogo || siteLogo) || '/logo.png';
    const globalAlert = settings?.global_alert_message;
    const alertType = settings?.global_alert_type || 'INFO';
    const [logoError, setLogoError] = useState(false);

    // Dummy alerts data
    const alerts = [
        { id: 1, device: 'Device 37', message: 'Has gone offline (offline for 13h 4m)', type: 'critical', time: '2 hours ago' },
        { id: 2, device: 'Device 42', message: 'High temperature detected (35°C)', type: 'critical', time: '3 hours ago' },
        { id: 3, device: 'Device 15', message: 'Low battery warning (15%)', type: 'critical', time: '5 hours ago' },
        { id: 4, device: 'Device 28', message: 'Connection unstable', type: 'critical', time: '6 hours ago' },
        { id: 5, device: 'Device 09', message: 'Sensor malfunction detected', type: 'critical', time: '8 hours ago' },
    ];

    const criticalAlertsCount = alerts.length;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Separate effect for the timer that depends on the timezone
    const effectiveTimezone = user?.timezone || settings?.default_timezone || 'Asia/Dubai';

    useEffect(() => {
        // Update localStorage when timezone changes
        if (effectiveTimezone) {
            localStorage.setItem('userTimezone', effectiveTimezone);
        }

        // Initial time update
        setCurrentTime(new Date());

        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, [effectiveTimezone]);

    // Poll Server Stats (Super Admin Only)
    useEffect(() => {
        if (!user?.is_super_admin) return;

        const pollStats = async () => {
            try {
                const stats = await adminApi.getSystemHealth();
                setServerStats(stats);
            } catch (err) {
                // Silent fail
            }
        };

        pollStats();
        const interval = setInterval(pollStats, 5000);

        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
                setShowAlerts(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key?.toLowerCase() === 'c' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                setShowUniversalCreator(true);
            }
            if (e.key === 'Escape') {
                setShowUniversalCreator(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Format time based on settings - supports HH:mm:ss, hh:mm:ss, HH:mm, etc.
    const formatTime = (date: Date) => {
        const timeFormat = settings?.time_format || 'HH:mm:ss';

        // Get time parts in the specified timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: effectiveTimezone,
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Get 24-hour format first, then convert if needed
        });
        const parts = formatter.formatToParts(date);
        let hour24 = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const minute = parts.find(p => p.type === 'minute')?.value || '00';
        const second = parts.find(p => p.type === 'second')?.value || '00';

        // Determine if 12-hour format (lowercase hh means 12-hour)
        const is12Hour = timeFormat.includes('hh') || timeFormat.includes('a') || timeFormat.includes('A');

        // Calculate 12-hour time
        const period = hour24 >= 12 ? 'PM' : 'AM';
        const hour12 = hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24);
        const hour24Str = hour24.toString().padStart(2, '0');
        const hour12Str = hour12.toString().padStart(2, '0');

        // Build time string based on format
        let result = timeFormat;

        // Replace tokens
        if (is12Hour) {
            result = result.replace(/hh/g, hour12Str);
            result = result.replace(/h/g, hour12.toString());
        } else {
            result = result.replace(/HH/g, hour24Str);
            result = result.replace(/H/g, hour24.toString());
        }
        result = result.replace(/mm/g, minute);
        result = result.replace(/ss/g, second);
        result = result.replace(/A/g, period);
        result = result.replace(/a/g, period.toLowerCase());

        return result;
    };

    // Format date based on settings - supports patterns like DD/MM/YYYY, YYYY-MM-DD, etc.
    const formatDate = (date: Date) => {
        const dateFormat = settings?.date_format || 'DD/MM/YYYY';

        // Get date parts in the specified timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: effectiveTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find(p => p.type === 'year')?.value || '';
        const month = parts.find(p => p.type === 'month')?.value || '';
        const day = parts.find(p => p.type === 'day')?.value || '';

        // Replace format tokens with actual values
        let result = dateFormat;
        result = result.replace(/YYYY/g, year);
        result = result.replace(/YY/g, year.slice(-2));
        result = result.replace(/MM/g, month);
        result = result.replace(/DD/g, day);

        return result;
    };

    // Alert type styles
    const getAlertStyles = (type: string) => {
        switch (type) {
            case 'WARNING':
                return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300';
            case 'ERROR':
                return 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300';
            default: // INFO
                return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300';
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'WARNING':
                return <AlertTriangle className="w-4 h-4" />;
            case 'ERROR':
                return <XCircle className="w-4 h-4" />;
            default:
                return <Info className="w-4 h-4" />;
        }
    };

    return (
        <>
            {/* Global Alert Banner */}
            {globalAlert && !dismissedAlert && (
                <div className={`w-full px-4 py-2 border-b flex items-center justify-center gap-3 ${getAlertStyles(alertType)}`}>
                    {getAlertIcon(alertType)}
                    <span className="text-sm font-medium">{globalAlert}</span>
                    <button
                        onClick={() => setDismissedAlert(true)}
                        className="ml-auto p-1 hover:bg-black/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <nav className="bg-card border-b border-border sticky top-0 z-40 h-16 flex items-center border-l xl:border-l-0">
                <div className="w-full max-w-[1600px] mx-auto page-padding-x">
                    <div className="flex items-center justify-between">
                        {/* Left Side - Logo */}
                        <div className="flex items-center gap-2">
                            {logo && !logoError ? (
                                <div className="flex items-center gap-2">
                                    <img
                                        src={logo}
                                        alt={siteTitle}
                                        className="h-10 w-auto object-contain"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (target.src.includes('logo.png')) {
                                                setLogoError(true);
                                            } else {
                                                target.src = '/logo.png';
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-sm">
                                        <span className="text-white font-bold text-lg">{siteTitle.charAt(0)}</span>
                                    </div>
                                    <span className="text-lg font-bold text-foreground tracking-tight">{user?.org_name || siteTitle}</span>
                                </div>
                            )}
                        </div>

                        {/* Right Side - Time, Alerts, Theme Toggle */}
                        <div className="flex items-center gap-3">

                            {/* Server Stats (Super Admin Only) */}
                            {user?.is_super_admin && serverStats?.data && (
                                <div className="hidden lg:flex items-center gap-4 mr-2">
                                    {/* CPU */}
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-md border border-border/50">
                                        <Cpu className="w-3.5 h-3.5 text-primary" />
                                        <span>{serverStats.data.cpu?.usage?.[0] ? (100 - parseFloat(serverStats.data.cpu.usage[0].idle)).toFixed(0) : 0}%</span>
                                    </div>
                                    {/* RAM */}
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-md border border-border/50">
                                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                                        <span>{serverStats.data.memory?.usagePercent || 0}%</span>
                                    </div>
                                </div>
                            )}

                            {/* Time & Date */}
                            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-muted/50 border border-border/50 rounded-full">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-semibold text-foreground tabular-nums">
                                        {mounted ? formatTime(currentTime) : '--:--:--'}
                                    </span>
                                    <span className="text-muted-foreground hidden lg:inline border-l border-border pl-2 h-3 leading-3">
                                        {mounted ? formatDate(currentTime) : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 border-l border-border pl-3 ml-1">
                                {/* Alerts Dropdown */}
                                <div className="relative" ref={alertsRef}>
                                    <button
                                        onClick={() => setShowAlerts(!showAlerts)}
                                        className="relative p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {criticalAlertsCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card"></span>
                                        )}
                                    </button>

                                    {/* Alerts Dropdown Panel */}
                                    {showAlerts && (
                                        <div className="absolute right-0 mt-3 w-80 bg-popover rounded-xl shadow-xl border border-border overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
                                                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800">
                                                    {criticalAlertsCount} New
                                                </span>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto">
                                                {alerts.map((alert) => (
                                                    <div
                                                        key={alert.id}
                                                        className="p-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className="mt-1 w-2 h-2 rounded-full bg-red-500 flex-shrink-0 group-hover:bg-red-600 transition-colors" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <p className="text-sm font-medium text-foreground truncate">{alert.device}</p>
                                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{alert.time}</span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 group-hover:text-foreground transition-colors">{alert.message}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-2 bg-muted/30 border-t border-border">
                                                <button className="w-full py-1 text-xs text-primary hover:text-primary/80 font-medium hover:underline">
                                                    Mark all as read
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Theme Toggle */}
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                                >
                                    {theme === 'dark' ? (
                                        <Sun className="w-5 h-5" />
                                    ) : (
                                        <Moon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Universal Creator Modal */}
                <UniversalCreator
                    isOpen={showUniversalCreator}
                    onClose={() => setShowUniversalCreator(false)}
                />
            </nav>
        </>
    );
}
