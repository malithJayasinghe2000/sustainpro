'use client';

import { useState, useEffect } from 'react';
import {
    Shield, Save, AlertTriangle, Mail, Globe, Clock, Lock, Key,
    RefreshCw, User, Image as ImageIcon, Terminal, Server, Settings
} from 'lucide-react';
import { getAllTimezones } from '@/lib/timezone';
import DashboardLayout from '@/components/DashboardLayout';
import { settingsApi, SystemSettings, authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

type Tab = 'general' | 'security' | 'admin';

export default function SettingsPage() {
    const { user, updateUser, isLoading: authLoading } = useAuth();
    const [selectedTimezone, setSelectedTimezone] = useState<string>('');
    const router = useRouter();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('general');

    // Admin Password Change State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Check permissions and load data
    useEffect(() => {
        if (!authLoading && !user?.roles?.some(r => r.role === 'ORG_ADMIN')) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (user?.timezone) {
            setSelectedTimezone(user.timezone);
        }
    }, [user]);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const data = await settingsApi.get();
            setSettings(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error('Failed to load system settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setIsSaving(true);
        try {
            const updated = await settingsApi.update(settings);
            setSettings(updated);
            toast.success('System settings updated successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTimezone = async () => {
        try {
            const response = await authApi.updateProfile({ timezone: selectedTimezone });
            updateUser(response.user);
            toast.success(`Timezone updated to ${selectedTimezone}`);
        } catch (error) {
            toast.error('Failed to update timezone');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        try {
            await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
            toast.success('Password changed successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to change password');
        }
    };

    // Standardized Input Classes (matches Users/Device Models)
    const inputClass = "w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50";
    const labelClass = "text-xs font-bold uppercase text-muted-foreground mb-1.5 block";
    const sectionHeaderClass = "flex items-center gap-2 pb-2 border-b border-border mb-6";
    const sectionTitleClass = "font-bold text-sm uppercase tracking-wide";

    // Show shell immediately, content loading only
    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                <Toaster position="bottom-right" />

                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title">
                            <Settings className="w-6 h-6 text-primary" />
                            System Settings
                        </h1>
                        <p className="page-header-subtext">
                            Manage global application identity, security policies, and administrative access.
                        </p>
                    </div>
                    {activeTab !== 'admin' && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLoading || !settings}
                            className="btn-primary"
                        >
                            {isSaving ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-8 border-b border-border overflow-x-auto">
                    {[
                        { id: 'general', label: 'General Settings', icon: Globe },
                        { id: 'security', label: 'Security & Access', icon: Lock },
                        { id: 'admin', label: 'Admin Settings', icon: User },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`flex items-center gap-2 pb-4 text-sm font-medium transition-colors relative ${isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Loading State */}
                {(authLoading || isLoading || !settings) ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-sm text-muted-foreground animate-pulse">Loading configuration...</p>
                    </div>
                ) : (
                    <div>
                        {/* TAB: GENERAL SETTINGS */}
                        {activeTab === 'general' && (
                            <div className="grid grid-cols-1 gap-6">
                                {/* Site Identity */}
                                <div className="bg-card border border-border rounded-sm p-6">
                                    <div className={sectionHeaderClass}>
                                        <Globe className="w-4 h-4 text-primary" />
                                        <h3 className={sectionTitleClass}>Site Identity</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClass}>Application Name</label>
                                            <input
                                                type="text"
                                                value={settings.site_title || ''}
                                                onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                                                className={inputClass}
                                                placeholder="e.g. SustainPro IoT"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className={labelClass}>Logo URL</label>
                                            <div className="flex gap-4">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={settings.site_logo || ''}
                                                        onChange={(e) => setSettings({ ...settings, site_logo: e.target.value })}
                                                        className={inputClass}
                                                        placeholder="https://example.com/logo.png"
                                                    />
                                                    <ImageIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                                </div>
                                                {settings.site_logo && (
                                                    <div className="w-10 h-10 border border-border rounded bg-muted/20 flex items-center justify-center overflow-hidden">
                                                        <img src={settings.site_logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Support Information */}
                                <div className="bg-card border border-border rounded-sm p-6">
                                    <div className={sectionHeaderClass}>
                                        <Mail className="w-4 h-4 text-primary" />
                                        <h3 className={sectionTitleClass}>Support Contact</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClass}>Support Email</label>
                                            <input
                                                type="email"
                                                value={settings.support_email || ''}
                                                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                                                className={inputClass}
                                                placeholder="support@sustainpro.com"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Support Phone</label>
                                            <input
                                                type="tel"
                                                value={settings.support_phone || ''}
                                                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                                                className={inputClass}
                                                placeholder="+94 11 234 5678"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Device API URL */}
                                <div className="bg-card border border-border rounded-sm p-6">
                                    <div className={sectionHeaderClass}>
                                        <Server className="w-4 h-4 text-primary" />
                                        <h3 className={sectionTitleClass}>IoT Device Configuration</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelClass}>Device API URL</label>
                                            <input
                                                type="text"
                                                value={settings.device_api_url || ''}
                                                onChange={(e) => setSettings({ ...settings, device_api_url: e.target.value })}
                                                className={inputClass}
                                                placeholder="http://192.168.1.100:5000"
                                            />
                                            <p className="text-xs text-muted-foreground mt-2">
                                                This URL is sent to devices during provisioning. Use your server's IP address that IoT devices can reach on the local network.
                                            </p>
                                        </div>
                                        <div className="p-3 bg-muted/50 border border-border rounded-lg">
                                            <p className="text-xs font-mono text-muted-foreground">
                                                <span className="font-semibold text-foreground">Current: </span>
                                                {settings.device_api_url || 'http://localhost:5000 (default)'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: SECURITY */}
                        {activeTab === 'security' && (
                            <div className="grid grid-cols-1 gap-6">
                                {/* Access Policies */}
                                <div className="bg-card border border-border rounded-sm p-6">
                                    <div className={sectionHeaderClass}>
                                        <Shield className="w-4 h-4 text-primary" />
                                        <h3 className={sectionTitleClass}>Access Policies</h3>
                                    </div>
                                    <div className="max-w-3xl space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className={labelClass}>Account Lock Duration (mins)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={settings.account_lock_duration_minutes}
                                                        onChange={(e) => setSettings({ ...settings, account_lock_duration_minutes: parseInt(e.target.value) })}
                                                        className={`${inputClass} pl-9`}
                                                        min="5"
                                                        max="120"
                                                    />
                                                    <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Max Login Attempts</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={settings.max_login_attempts}
                                                        onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) })}
                                                        className={`${inputClass} pl-9`}
                                                    />
                                                    <AlertTriangle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Session Token Expiry (mins)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={settings.token_expire_minutes}
                                                        onChange={(e) => setSettings({ ...settings, token_expire_minutes: parseInt(e.target.value) })}
                                                        className={`${inputClass} pl-9`}
                                                    />
                                                    <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Maintenance Mode */}
                                <div className="bg-card border border-border rounded-sm p-6">
                                    <div className={sectionHeaderClass}>
                                        <Terminal className="w-4 h-4 text-primary" />
                                        <h3 className={sectionTitleClass}>System Status</h3>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-lg">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-foreground">Maintenance Mode</h4>
                                            <p className="text-sm text-muted-foreground">Blocks non-admin access. Use during updates.</p>
                                        </div>
                                        <button
                                            role="switch"
                                            aria-checked={settings.maintenance_mode}
                                            onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${settings.maintenance_mode ? 'bg-primary' : 'bg-muted-foreground/30'
                                                }`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.maintenance_mode ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {settings.maintenance_mode && (
                                        <div className="mt-4 flex items-center gap-2 text-xs font-mono text-primary bg-background/50 p-2 rounded border border-primary/10">
                                            <AlertTriangle className="w-3 h-3" />
                                            SYSTEM LOCKED - ADMIN ACCESS ONLY
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: ADMIN SETTINGS */}
                        {activeTab === 'admin' && (
                            <>
                                {/* Save Button */}
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={handleSaveTimezone}
                                        className="btn-primary"
                                        disabled={selectedTimezone === user?.timezone}
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Settings
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Admin Info Card */}
                                    <div className="lg:col-span-1 space-y-6">
                                        <div className="bg-card border border-border rounded-sm p-6 h-full">
                                            <div className="flex flex-col items-center text-center space-y-4">
                                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                                                    <User className="w-10 h-10 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-foreground">{user?.email}</h3>
                                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase bg-primary text-primary-foreground mt-1">
                                                        {user?.roles?.[0]?.role || 'User'}
                                                    </span>
                                                </div>
                                                <div className="w-full pt-6 border-t border-border space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">User ID</span>
                                                        <span className="font-mono">{user?.id}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground">Timezone</span>
                                                        <select
                                                            value={selectedTimezone}
                                                            onChange={(e) => setSelectedTimezone(e.target.value)}
                                                            className="bg-transparent border-none text-right font-medium text-primary focus:ring-0 cursor-pointer max-w-[200px]"
                                                            style={{ backgroundImage: 'none' }}
                                                        >
                                                            {getAllTimezones().map(tz => (
                                                                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Change Password Form */}
                                    <div className="lg:col-span-2">
                                        <div className="bg-card border border-border rounded-sm p-6">
                                            <div className={sectionHeaderClass}>
                                                <Shield className="w-4 h-4 text-primary" />
                                                <h3 className={sectionTitleClass}>Security Credentials</h3>
                                            </div>

                                            <form onSubmit={handleChangePassword} className="space-y-6 max-w-lg">
                                                <div>
                                                    <label className={labelClass}>Current Password</label>
                                                    <input
                                                        type="password"
                                                        required
                                                        value={passwordData.currentPassword}
                                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className={labelClass}>New Password</label>
                                                        <input
                                                            type="password"
                                                            required
                                                            value={passwordData.newPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={labelClass}>Confirm New Password</label>
                                                        <input
                                                            type="password"
                                                            required
                                                            value={passwordData.confirmPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="pt-2">
                                                    <button type="submit" className="btn-primary w-full md:w-auto">
                                                        Update Password
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
