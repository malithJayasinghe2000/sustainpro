'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Bell, Clock, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { getUserTimezone } from '@/lib/timezone';
import { settingsApi } from '@/lib/api';
import UniversalCreator from './UniversalCreator';
import { Plus } from 'lucide-react';

export default function Navbar() {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mounted, setMounted] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);
    const [siteTitle, setSiteTitle] = useState('SPS IoT');
    const [logo, setLogo] = useState<string | null>('/logo.png');
    const [showUniversalCreator, setShowUniversalCreator] = useState(false);
    const alertsRef = useRef<HTMLDivElement>(null);

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
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // Fetch Settings
        const fetchSettings = async () => {
            try {
                const settings = await settingsApi.get();
                if (settings.site_title) setSiteTitle(settings.site_title);

                // Prioritize Organization Logo, else System Logo
                if (user?.org_logo) {
                    setLogo(user.org_logo);
                } else if (settings.site_logo) {
                    setLogo(settings.site_logo);
                }
            } catch (error) {
                console.error('Failed to load navbar settings');
            }
        };
        fetchSettings();

        // Also update if user changes (e.g. login/out)
        if (user?.org_logo) setLogo(user.org_logo);

        return () => clearInterval(timer);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
                setShowAlerts(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Open on 'c' if not typing in input
            if (e.key.toLowerCase() === 'c' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                setShowUniversalCreator(true);
            }
            // Close on 'Escape'
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

    const formatTime = (date: Date) => {
        const timezone = getUserTimezone();
        return date.toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (date: Date) => {
        const timezone = getUserTimezone();
        return date.toLocaleDateString('en-US', {
            timeZone: timezone,
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <nav className="bg-card border-b border-border sticky top-0 z-40 h-16 flex items-center border-l xl:border-l-0">
            <div className="w-full max-w-[1600px] mx-auto page-padding-x">
                <div className="flex items-center justify-between">
                    {/* Left Side - Logo */}
                    <div className="flex items-center gap-2">
                        {logo ? (
                            <div className="flex items-center gap-2">
                                <img src={logo} alt={siteTitle} className="h-10 w-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm shadow-orange-500/20">
                                    <span className="text-white font-bold text-lg">{siteTitle.charAt(0)}</span>
                                </div>
                                <span className="text-lg font-bold text-foreground tracking-tight">{user?.org_name || siteTitle}</span>
                            </div>
                        )}
                    </div>




                    {/* Right Side - Time, Alerts, Theme Toggle */}
                    <div className="flex items-center gap-3">
                        {/* Universal Create Button */}
                        <button
                            onClick={() => setShowUniversalCreator(true)}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                            title="Create New (Press 'C')"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden lg:inline">Create</span>
                        </button>


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
        </nav >
    );
}
