'use client';

import { useState, useEffect } from 'react';
import { Save, Shield, Clock, Key, AlertTriangle, Settings, Smartphone, Mail, Lock, RefreshCw, Users } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface SystemSettings {
    // Security
    maxLoginAttempts: number;
    accountLockDurationMinutes: number;
    tokenExpireMinutes: number;
    refreshTokenExpireDays: number;
    sessionTimeoutEnabled: boolean;
    sessionTimeoutMinutes: number;
    // 2FA
    twoFactorRequired: boolean;
    twoFactorMethod: 'email' | 'totp' | 'both';
    otpExpiryMinutes: number;
    otpLength: number;
    // Rate Limiting
    loginRateLimitAttempts: number;
    loginRateLimitWindowMins: number;
}

export default function SystemSettingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [settings, setSettings] = useState<SystemSettings>({
        maxLoginAttempts: 5,
        accountLockDurationMinutes: 15,
        tokenExpireMinutes: 60,
        refreshTokenExpireDays: 7,
        sessionTimeoutEnabled: true,
        sessionTimeoutMinutes: 30,
        twoFactorRequired: false,
        twoFactorMethod: 'email',
        otpExpiryMinutes: 10,
        otpLength: 6,
        loginRateLimitAttempts: 5,
        loginRateLimitWindowMins: 15,
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsFetching(true);
        try {
            const response = await api.get('/settings/security');
            if (response.data.success && response.data.settings) {
                setSettings({
                    maxLoginAttempts: response.data.settings.max_login_attempts || 5,
                    accountLockDurationMinutes: response.data.settings.account_lock_duration_minutes || 15,
                    tokenExpireMinutes: response.data.settings.token_expire_minutes || 60,
                    refreshTokenExpireDays: response.data.settings.refresh_token_expire_days || 7,
                    sessionTimeoutEnabled: response.data.settings.session_timeout_enabled ?? true,
                    sessionTimeoutMinutes: response.data.settings.session_timeout_minutes || 30,
                    twoFactorRequired: response.data.settings.two_factor_required || false,
                    twoFactorMethod: response.data.settings.two_factor_method || 'email',
                    otpExpiryMinutes: response.data.settings.otp_expiry_minutes || 10,
                    otpLength: response.data.settings.otp_length || 6,
                    loginRateLimitAttempts: response.data.settings.login_rate_limit_attempts || 5,
                    loginRateLimitWindowMins: response.data.settings.login_rate_limit_window_mins || 15,
                });
            }
        } catch (error) {
            console.log('Using default settings');
        } finally {
            setIsFetching(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.put('/settings/security', {
                max_login_attempts: settings.maxLoginAttempts,
                account_lock_duration_minutes: settings.accountLockDurationMinutes,
                token_expire_minutes: settings.tokenExpireMinutes,
                refresh_token_expire_days: settings.refreshTokenExpireDays,
                session_timeout_enabled: settings.sessionTimeoutEnabled,
                session_timeout_minutes: settings.sessionTimeoutMinutes,
                two_factor_required: settings.twoFactorRequired,
                two_factor_method: settings.twoFactorMethod,
                otp_expiry_minutes: settings.otpExpiryMinutes,
                otp_length: settings.otpLength,
                login_rate_limit_attempts: settings.loginRateLimitAttempts,
                login_rate_limit_window_mins: settings.loginRateLimitWindowMins,
            });
            toast.success('Security settings updated successfully');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-8">
                <Toaster position="top-right" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Settings className="w-6 h-6 text-primary" />
                            Security Configuration
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Manage authentication, 2FA policies, and session security
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Settings - 2 columns */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Account Security Section */}
                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 pb-2 border-b border-border">
                                    <div className="p-2 bg-red-500/10 rounded-lg text-red-600">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Account Security</h2>
                                        <p className="text-xs text-muted-foreground">Login protection and lockout policies</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Max Login Attempts</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={settings.maxLoginAttempts}
                                                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                                                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                min="1"
                                                max="10"
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-muted-foreground">attempts</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Account locks after this many failed login attempts</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Account Lock Duration</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="number"
                                                value={settings.accountLockDurationMinutes}
                                                onChange={(e) => setSettings({ ...settings, accountLockDurationMinutes: parseInt(e.target.value) || 15 })}
                                                className="w-full pl-10 pr-20 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                min="1"
                                                max="1440"
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-muted-foreground">minutes</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">How long accounts remain locked after max attempts</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Rate Limit Attempts</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={settings.loginRateLimitAttempts}
                                                onChange={(e) => setSettings({ ...settings, loginRateLimitAttempts: parseInt(e.target.value) || 5 })}
                                                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                min="1"
                                                max="100"
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-muted-foreground">requests</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Max login requests per IP before rate limiting</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Rate Limit Window</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="number"
                                                value={settings.loginRateLimitWindowMins}
                                                onChange={(e) => setSettings({ ...settings, loginRateLimitWindowMins: parseInt(e.target.value) || 15 })}
                                                className="w-full pl-10 pr-20 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                min="1"
                                                max="60"
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-muted-foreground">minutes</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Time window for rate limit tracking</p>
                                    </div>
                                </div>
                            </div>

                            {/* Token & Session Section */}
                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 pb-2 border-b border-border">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Session & Token Settings</h2>
                                        <p className="text-xs text-muted-foreground">Access token and session timeout configuration</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Access Token Expiry</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="number"
                                                value={settings.tokenExpireMinutes}
                                                onChange={(e) => setSettings({ ...settings, tokenExpireMinutes: parseInt(e.target.value) || 60 })}
                                                className="w-full pl-10 pr-20 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                min="5"
                                                max="1440"
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-muted-foreground">minutes</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">How long access tokens remain valid</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Refresh Token Expiry</label>
                                        <div className="relative">
                                            <RefreshCw className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="number"
                                                value={settings.refreshTokenExpireDays}
                                                onChange={(e) => setSettings({ ...settings, refreshTokenExpireDays: parseInt(e.target.value) || 7 })}
                                                className="w-full pl-10 pr-20 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                min="1"
                                                max="30"
                                            />
                                            <span className="absolute right-3 top-3 text-xs text-muted-foreground">days</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">How long users stay logged in without re-authentication</p>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-foreground">Session Timeout</label>
                                                <p className="text-xs text-muted-foreground">Automatically logout inactive users</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSettings({ ...settings, sessionTimeoutEnabled: !settings.sessionTimeoutEnabled })}
                                                className={`relative w-14 h-7 rounded-full transition-colors ${settings.sessionTimeoutEnabled ? 'bg-primary' : 'bg-muted'}`}
                                            >
                                                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.sessionTimeoutEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {settings.sessionTimeoutEnabled && (
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium text-foreground">Inactivity Timeout</label>
                                            <div className="relative max-w-xs">
                                                <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="number"
                                                    value={settings.sessionTimeoutMinutes}
                                                    onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
                                                    className="w-full pl-10 pr-20 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    min="5"
                                                    max="480"
                                                />
                                                <span className="absolute right-3 top-3 text-xs text-muted-foreground">minutes</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Users will be logged out after this period of inactivity</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2FA Section */}
                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 pb-2 border-b border-border">
                                    <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Two-Factor Authentication (2FA)</h2>
                                        <p className="text-xs text-muted-foreground">Configure organization-wide 2FA policies</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Enforce 2FA Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                                <Users className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-foreground">Require 2FA for All Users</h3>
                                                <p className="text-xs text-muted-foreground">Force all users to enable two-factor authentication</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSettings({ ...settings, twoFactorRequired: !settings.twoFactorRequired })}
                                            className={`relative w-14 h-7 rounded-full transition-colors ${settings.twoFactorRequired ? 'bg-primary' : 'bg-muted'}`}
                                        >
                                            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.twoFactorRequired ? 'translate-x-8' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {/* 2FA Method */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-foreground">2FA Method</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setSettings({ ...settings, twoFactorMethod: 'email' })}
                                                className={`p-4 rounded-lg border-2 transition-all text-left ${settings.twoFactorMethod === 'email' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Mail className={`w-5 h-5 ${settings.twoFactorMethod === 'email' ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    <div>
                                                        <h4 className="font-medium text-sm">Email OTP</h4>
                                                        <p className="text-xs text-muted-foreground">Send code via email</p>
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setSettings({ ...settings, twoFactorMethod: 'totp' })}
                                                className={`p-4 rounded-lg border-2 transition-all text-left ${settings.twoFactorMethod === 'totp' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Smartphone className={`w-5 h-5 ${settings.twoFactorMethod === 'totp' ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    <div>
                                                        <h4 className="font-medium text-sm">Authenticator App</h4>
                                                        <p className="text-xs text-muted-foreground">Google/Microsoft Auth</p>
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setSettings({ ...settings, twoFactorMethod: 'both' })}
                                                className={`p-4 rounded-lg border-2 transition-all text-left ${settings.twoFactorMethod === 'both' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Shield className={`w-5 h-5 ${settings.twoFactorMethod === 'both' ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    <div>
                                                        <h4 className="font-medium text-sm">User Choice</h4>
                                                        <p className="text-xs text-muted-foreground">Email or App</p>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* OTP Settings */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">OTP Code Length</label>
                                            <select
                                                value={settings.otpLength}
                                                onChange={(e) => setSettings({ ...settings, otpLength: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            >
                                                <option value={4}>4 digits</option>
                                                <option value={6}>6 digits (Recommended)</option>
                                                <option value={8}>8 digits</option>
                                            </select>
                                            <p className="text-xs text-muted-foreground">Number of digits in OTP codes</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">OTP Expiry Time</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="number"
                                                    value={settings.otpExpiryMinutes}
                                                    onChange={(e) => setSettings({ ...settings, otpExpiryMinutes: parseInt(e.target.value) || 10 })}
                                                    className="w-full pl-10 pr-20 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    min="1"
                                                    max="30"
                                                />
                                                <span className="absolute right-3 top-3 text-xs text-muted-foreground">minutes</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">How long OTP codes remain valid</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Security Settings
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Sidebar - Info Cards */}
                        <div className="space-y-6">
                            {/* 2FA Info */}
                            <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-xl">
                                <div className="flex items-start gap-4">
                                    <Smartphone className="w-6 h-6 text-green-500 shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-green-700 dark:text-green-300">Two-Factor Authentication</h3>
                                        <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1 leading-relaxed">
                                            2FA adds an extra layer of security by requiring a verification code in addition to password.
                                        </p>
                                        <ul className="mt-3 space-y-1 text-xs text-green-600/70 dark:text-green-400/70">
                                            <li>• Email OTP: Code sent to user&apos;s email</li>
                                            <li>• TOTP: Time-based codes from auth apps</li>
                                            <li>• Both: User chooses their preferred method</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Token Info */}
                            <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl">
                                <div className="flex items-start gap-4">
                                    <Key className="w-6 h-6 text-blue-500 shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-blue-700 dark:text-blue-300">Token Management</h3>
                                        <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-1 leading-relaxed">
                                            Access tokens are short-lived for security. Refresh tokens allow users to stay logged in longer.
                                        </p>
                                        <ul className="mt-3 space-y-1 text-xs text-blue-600/70 dark:text-blue-400/70">
                                            <li>• Access Token: Used for API requests</li>
                                            <li>• Refresh Token: Used to get new access tokens</li>
                                            <li>• Tokens are revoked on password change</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-xl">
                                <div className="flex items-start gap-4">
                                    <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                                    <div>
                                        <h3 className="font-semibold text-amber-700 dark:text-amber-300">Important Notice</h3>
                                        <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                                            Changes to security settings take effect immediately for new sessions. Existing sessions are not affected until token refresh.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
