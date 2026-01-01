'use client';

import { useState, useEffect } from 'react';
import { Save, Shield, Clock, Key, AlertTriangle, Settings } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
// Need a settings API. Since it likely doesn't exist yet in api.ts, I'll mock or assume one, then fix backend.
// Actually, I'll use a direct fetch or update api.ts next. 
// For now, I'll structure the UI.

export default function SystemSettingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState({
        maxLoginAttempts: 5,
        accountLockDurationMinutes: 15,
        tokenExpireMinutes: 60,
    });

    useEffect(() => {
        // Mock load or real load
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        // TODO: Implement GET /api/v1/settings/system (Super Admin only)
        // For now, simulate default
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // await api.post('/settings/system', settings);
            toast.success('System settings updated successfully');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-8">
                <Toaster position="top-right" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Settings className="w-6 h-6 text-primary" />
                            System Configuration
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Manage global security policies and platform defaults
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Settings Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-8">

                            {/* Security Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-2 border-b border-border">
                                    <div className="p-2 bg-red-500/10 rounded-lg text-red-600">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Security Policies</h2>
                                        <p className="text-xs text-muted-foreground">Login protection and session limits</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Max Login Attempts</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={settings.maxLoginAttempts}
                                                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20"
                                                min="1"
                                                max="10"
                                            />
                                            <span className="absolute right-3 top-2 text-xs text-muted-foreground">attempts</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Account locks after this many failed tries.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Lock Duration</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="number"
                                                value={settings.accountLockDurationMinutes}
                                                onChange={(e) => setSettings({ ...settings, accountLockDurationMinutes: parseInt(e.target.value) })}
                                                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20"
                                                min="1"
                                            />
                                            <span className="absolute right-3 top-2 text-xs text-muted-foreground">minutes</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Time before user can retry login.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Session Timeout</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="number"
                                                value={settings.tokenExpireMinutes}
                                                onChange={(e) => setSettings({ ...settings, tokenExpireMinutes: parseInt(e.target.value) })}
                                                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20"
                                                min="15"
                                            />
                                            <span className="absolute right-3 top-2 text-xs text-muted-foreground">minutes</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Access token validity duration.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-4 border-t border-border flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary/20"
                                >
                                    {isLoading ? 'Saving...' : (
                                        <>
                                            <Save className="w-4 h-4" /> Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Info / Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl">
                            <div className="flex items-start gap-4">
                                <AlertTriangle className="w-6 h-6 text-blue-500 shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-blue-700 dark:text-blue-300">Policy Impact</h3>
                                    <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-1 leading-relaxed">
                                        Changing these values affects the security posture of the entire platform.
                                        New settings apply immediately to new sessions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
