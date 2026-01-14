'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Save, Settings, Shield, Clock, Key, Lock, Smartphone,
    Globe, Mail, Bell, FileText, RefreshCw, AlertTriangle,
    Eye, EyeOff, Check, X, Palette, Languages
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';
import ImageUpload from '@/components/ImageUpload';
import { RichSelect } from '@/components/ui/RichSelect';
import { useSettings } from '@/contexts/SettingsContext';
import { getTimezones } from '@/lib/timezones';
import {
    settingsApi,
    AllSettings,
    SystemSettings,
    PasswordPolicies,
    SessionPolicies,
    LoginPolicies,
    TwoFactorConfig,
    ApiSecurityConfig,
    SmtpSettings,
    NotificationSettings,
} from '@/lib/api';

type TabId = 'general' | 'password' | 'session' | 'login' | 'twoFactor' | 'apiSecurity' | 'smtp' | 'notifications';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    color: string;
}

const tabs: Tab[] = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" />, color: 'blue' },
    { id: 'password', label: 'Password', icon: <Key className="w-4 h-4" />, color: 'purple' },
    { id: 'session', label: 'Session', icon: <Clock className="w-4 h-4" />, color: 'green' },
    { id: 'login', label: 'Login', icon: <Lock className="w-4 h-4" />, color: 'red' },
    { id: 'twoFactor', label: '2FA', icon: <Smartphone className="w-4 h-4" />, color: 'orange' },
    { id: 'apiSecurity', label: 'API Security', icon: <Globe className="w-4 h-4" />, color: 'cyan' },
    { id: 'smtp', label: 'Email (SMTP)', icon: <Mail className="w-4 h-4" />, color: 'pink' },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, color: 'yellow' },
];

// =========================================================================
// HELPER COMPONENTS (defined outside to prevent re-render focus loss)
// =========================================================================

interface InputFieldProps {
    label: string;
    value: any;
    onChange: (value: any) => void;
    type?: string;
    placeholder?: string;
    suffix?: string;
    min?: number;
    max?: number;
    disabled?: boolean;
}

const InputField = ({ label, value, onChange, type = 'text', placeholder = '', suffix = '', min, max, disabled = false }: InputFieldProps) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <div className="relative">
            <input
                type={type}
                value={value ?? ''}
                onChange={(e) => onChange(type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)}
                placeholder={placeholder}
                min={min}
                max={max}
                disabled={disabled}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
            />
            {suffix && <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">{suffix}</span>}
        </div>
    </div>
);

interface ToggleFieldProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}

const ToggleField = ({ label, description, checked, onChange }: ToggleFieldProps) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
        <div className="flex-1">
            <div className="text-sm font-medium text-foreground">{label}</div>
            {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'
                }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    </div>
);

interface SelectFieldProps {
    label: string;
    value: any;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}

const SelectField = ({ label, value, onChange, options }: SelectFieldProps) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

interface ColorFieldProps {
    label: string;
    value: string | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
}

const ColorField = ({ label, value, onChange, placeholder = '#14b8a6' }: ColorFieldProps) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <div className="flex items-center gap-3">
            <div className="relative">
                <input
                    type="color"
                    value={value || placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border border-input overflow-hidden"
                    style={{ padding: 0 }}
                />
            </div>
            <div className="flex-1">
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                />
            </div>
            <div
                className="w-12 h-12 rounded-lg border border-input shadow-inner"
                style={{ backgroundColor: value || placeholder }}
                title="Preview"
            />
        </div>
    </div>
);

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
}

const SectionHeader = ({ icon, title, description, color }: SectionHeaderProps) => (
    <div className="flex items-center gap-3 pb-4 border-b border-border mb-6">
        <div className={`p-2 bg-${color}-500/10 rounded-lg text-${color}-600`}>
            {icon}
        </div>
        <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    </div>
);

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export default function SystemSettingsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('general');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Get refetch function from settings context to apply colors after save
    const { refetch: refetchSettings } = useSettings();

    // Settings state
    const [settings, setSettings] = useState<AllSettings | null>(null);
    const [systemSettings, setSystemSettings] = useState<Partial<SystemSettings>>({});
    const [passwordPolicies, setPasswordPolicies] = useState<Partial<PasswordPolicies>>({});
    const [sessionPolicies, setSessionPolicies] = useState<Partial<SessionPolicies>>({});
    const [loginPolicies, setLoginPolicies] = useState<Partial<LoginPolicies>>({});
    const [twoFactorConfig, setTwoFactorConfig] = useState<Partial<TwoFactorConfig>>({});
    const [apiSecurityConfig, setApiSecurityConfig] = useState<Partial<ApiSecurityConfig>>({});
    const [smtpSettings, setSmtpSettings] = useState<Partial<SmtpSettings>>({});
    const [notificationSettings, setNotificationSettings] = useState<Partial<NotificationSettings>>({});

    // Get all timezones for dropdown
    const timezoneOptions = useMemo(() => {
        return getTimezones().map(tz => ({
            value: tz.value,
            label: tz.label,
            icon: Globe
        }));
    }, []);

    useEffect(() => {
        fetchAllSettings();
    }, []);

    const fetchAllSettings = async () => {
        setIsLoading(true);
        try {
            const data = await settingsApi.getAll();
            setSettings(data);
            if (data.system) setSystemSettings(data.system);
            if (data.password) setPasswordPolicies(data.password);
            if (data.session) setSessionPolicies(data.session);
            if (data.login) setLoginPolicies(data.login);
            if (data.twoFactor) setTwoFactorConfig(data.twoFactor);
            if (data.apiSecurity) setApiSecurityConfig(data.apiSecurity);
            if (data.smtp) setSmtpSettings(data.smtp);
            if (data.notification) setNotificationSettings(data.notification);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            switch (activeTab) {
                case 'general':
                    await settingsApi.updateSystemSettings(systemSettings);
                    break;
                case 'password':
                    await settingsApi.updatePasswordPolicies(passwordPolicies);
                    break;
                case 'session':
                    await settingsApi.updateSessionPolicies(sessionPolicies);
                    break;
                case 'login':
                    await settingsApi.updateLoginPolicies(loginPolicies);
                    break;
                case 'twoFactor':
                    await settingsApi.updateTwoFactorConfig(twoFactorConfig);
                    break;
                case 'apiSecurity':
                    await settingsApi.updateApiSecurityConfig(apiSecurityConfig);
                    break;
                case 'smtp':
                    await settingsApi.updateSmtpSettings(smtpSettings);
                    break;
                case 'notifications':
                    await settingsApi.updateNotificationSettings(notificationSettings);
                    break;
            }
            toast.success('Settings saved successfully');

            // If general settings were saved, refetch to apply colors immediately
            // This is done in a separate try-catch to avoid showing error after success
            if (activeTab === 'general') {
                try {
                    await refetchSettings();
                } catch {
                    // Silently ignore refetch errors - the save was still successful
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    // Tab Content Renderers
    const renderGeneralSettings = () => (
        <div className="space-y-6">
            <SectionHeader
                icon={<Palette className="w-5 h-5" />}
                title="Branding & Appearance"
                description="Configure system name and visual identity"
                color="blue"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                    label="System Name"
                    value={systemSettings.system_name}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, system_name: v })}
                    placeholder="SustainPro"
                />
                <InputField
                    label="Site Title"
                    value={systemSettings.site_title}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, site_title: v })}
                    placeholder="SustainPro IoT Platform"
                />
                <InputField
                    label="Site Tagline"
                    value={systemSettings.site_tagline}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, site_tagline: v })}
                    placeholder="Smart Sustainability Management"
                />
                <div className="md:col-span-2">
                    <ImageUpload
                        label="Site Logo"
                        value={systemSettings.site_logo}
                        onChange={(url: string) => setSystemSettings({ ...systemSettings, site_logo: url })}
                        placeholder="Click to upload logo"
                        folder="logos"
                    />
                </div>
                <ColorField
                    label="Primary Color"
                    value={systemSettings.primary_color}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, primary_color: v })}
                    placeholder="#14b8a6"
                />
                <ColorField
                    label="Secondary Color"
                    value={systemSettings.secondary_color}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, secondary_color: v })}
                    placeholder="#10B981"
                />
            </div>

            <SectionHeader
                icon={<Languages className="w-5 h-5" />}
                title="Timezone & Locale"
                description="Configure date, time, and language settings"
                color="green"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RichSelect
                    label="Default Timezone"
                    value={systemSettings.default_timezone || 'UTC'}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, default_timezone: v })}
                    options={timezoneOptions}
                    searchable
                    placeholder="Search timezones..."
                    icon={Globe}
                />
                <SelectField
                    label="Default Language"
                    value={systemSettings.default_language}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, default_language: v })}
                    options={[
                        { value: 'en', label: 'English' },
                        { value: 'ar', label: 'Arabic' },
                    ]}
                />
                <SelectField
                    label="Date Format"
                    value={systemSettings.date_format}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, date_format: v })}
                    options={[
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (11/01/2026)' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/11/2026)' },
                        { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD (2026/01/11)' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-01-11)' },
                        { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (11-01-2026)' },
                        { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY (01-11-2026)' },
                    ]}
                />
                <SelectField
                    label="Time Format"
                    value={systemSettings.time_format}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, time_format: v })}
                    options={[
                        { value: 'HH:mm:ss', label: 'HH:mm:ss (19:30:45) - 24 hour' },
                        { value: 'HH:mm', label: 'HH:mm (19:30) - 24 hour' },
                        { value: 'hh:mm:ss A', label: 'hh:mm:ss A (07:30:45 PM) - 12 hour' },
                        { value: 'hh:mm A', label: 'hh:mm A (07:30 PM) - 12 hour' },
                    ]}
                />
            </div>

            <SectionHeader
                icon={<AlertTriangle className="w-5 h-5" />}
                title="System Status"
                description="Maintenance mode and global alerts"
                color="yellow"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Maintenance Mode"
                    description="When enabled, only admins can access the system"
                    checked={systemSettings.maintenance_mode}
                    onChange={(v: boolean) => setSystemSettings({ ...systemSettings, maintenance_mode: v })}
                />
                <InputField
                    label="Maintenance Message"
                    value={systemSettings.maintenance_message}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, maintenance_message: v })}
                    placeholder="System is under maintenance..."
                />
                <InputField
                    label="Global Alert Message"
                    value={systemSettings.global_alert_message}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, global_alert_message: v })}
                    placeholder="Important announcement..."
                />
                <SelectField
                    label="Alert Type"
                    value={systemSettings.global_alert_type}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, global_alert_type: v })}
                    options={[
                        { value: 'INFO', label: 'Info (Blue)' },
                        { value: 'WARNING', label: 'Warning (Yellow)' },
                        { value: 'ERROR', label: 'Error (Red)' },
                    ]}
                />
            </div>

            <SectionHeader
                icon={<Mail className="w-5 h-5" />}
                title="Support Contact"
                description="Contact information for help and support"
                color="purple"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                    label="Support Email"
                    value={systemSettings.support_email}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, support_email: v })}
                    placeholder="support@example.com"
                />
                <InputField
                    label="Support Phone"
                    value={systemSettings.support_phone}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, support_phone: v })}
                    placeholder="+971 4 123 4567"
                />
                <InputField
                    label="Support URL"
                    value={systemSettings.support_url}
                    onChange={(v: string) => setSystemSettings({ ...systemSettings, support_url: v })}
                    placeholder="https://support.example.com"
                />
            </div>
        </div>
    );

    const renderPasswordPolicies = () => (
        <div className="space-y-6">
            <SectionHeader
                icon={<Key className="w-5 h-5" />}
                title="Password Requirements"
                description="Configure minimum password strength requirements"
                color="purple"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                    label="Minimum Length"
                    type="number"
                    value={passwordPolicies.min_length}
                    onChange={(v: number) => setPasswordPolicies({ ...passwordPolicies, min_length: v })}
                    min={6}
                    max={32}
                    suffix="chars"
                />
                <InputField
                    label="Maximum Length"
                    type="number"
                    value={passwordPolicies.max_length}
                    onChange={(v: number) => setPasswordPolicies({ ...passwordPolicies, max_length: v })}
                    min={32}
                    max={256}
                    suffix="chars"
                />
            </div>
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <ToggleField
                    label="Require Uppercase Letters"
                    description="At least one A-Z"
                    checked={passwordPolicies.require_uppercase}
                    onChange={(v: boolean) => setPasswordPolicies({ ...passwordPolicies, require_uppercase: v })}
                />
                <ToggleField
                    label="Require Lowercase Letters"
                    description="At least one a-z"
                    checked={passwordPolicies.require_lowercase}
                    onChange={(v: boolean) => setPasswordPolicies({ ...passwordPolicies, require_lowercase: v })}
                />
                <ToggleField
                    label="Require Numbers"
                    description="At least one 0-9"
                    checked={passwordPolicies.require_numbers}
                    onChange={(v: boolean) => setPasswordPolicies({ ...passwordPolicies, require_numbers: v })}
                />
                <ToggleField
                    label="Require Special Characters"
                    description="At least one !@#$%^&*..."
                    checked={passwordPolicies.require_special_chars}
                    onChange={(v: boolean) => setPasswordPolicies({ ...passwordPolicies, require_special_chars: v })}
                />
            </div>

            <SectionHeader
                icon={<Clock className="w-5 h-5" />}
                title="Password Expiration"
                description="Configure password aging and expiration"
                color="orange"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable Password Expiration"
                    description="Force users to change password periodically"
                    checked={passwordPolicies.password_expires}
                    onChange={(v: boolean) => setPasswordPolicies({ ...passwordPolicies, password_expires: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="Password Expiry Days"
                        type="number"
                        value={passwordPolicies.password_expiry_days}
                        onChange={(v: number) => setPasswordPolicies({ ...passwordPolicies, password_expiry_days: v })}
                        min={30}
                        max={365}
                        suffix="days"
                        disabled={!passwordPolicies.password_expires}
                    />
                    <InputField
                        label="Expiry Warning Days"
                        type="number"
                        value={passwordPolicies.expiry_warning_days}
                        onChange={(v: number) => setPasswordPolicies({ ...passwordPolicies, expiry_warning_days: v })}
                        min={1}
                        max={30}
                        suffix="days"
                        disabled={!passwordPolicies.password_expires}
                    />
                </div>
            </div>

            <SectionHeader
                icon={<Shield className="w-5 h-5" />}
                title="Password Reuse Prevention"
                description="Prevent users from reusing old passwords"
                color="red"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Prevent Password Reuse"
                    description="Check against previous passwords"
                    checked={passwordPolicies.prevent_reuse}
                    onChange={(v: boolean) => setPasswordPolicies({ ...passwordPolicies, prevent_reuse: v })}
                />
                <InputField
                    label="Passwords to Remember"
                    type="number"
                    value={passwordPolicies.reuse_prevention_count}
                    onChange={(v: number) => setPasswordPolicies({ ...passwordPolicies, reuse_prevention_count: v })}
                    min={1}
                    max={24}
                    suffix="passwords"
                    disabled={!passwordPolicies.prevent_reuse}
                />
                <ToggleField
                    label="Require Change on First Login"
                    description="Force new users to set their own password"
                    checked={passwordPolicies.require_change_on_first_login}
                    onChange={(v: boolean) => setPasswordPolicies({ ...passwordPolicies, require_change_on_first_login: v })}
                />
            </div>
        </div>
    );

    const renderSessionPolicies = () => (
        <div className="space-y-6">
            <SectionHeader
                icon={<Clock className="w-5 h-5" />}
                title="Session Timeout"
                description="Configure session and idle timeout settings"
                color="green"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable Session Timeout"
                    description="Automatically log out users after inactivity"
                    checked={sessionPolicies.session_timeout_enabled}
                    onChange={(v: boolean) => setSessionPolicies({ ...sessionPolicies, session_timeout_enabled: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="Session Timeout"
                        type="number"
                        value={sessionPolicies.session_timeout_minutes}
                        onChange={(v: number) => setSessionPolicies({ ...sessionPolicies, session_timeout_minutes: v })}
                        min={15}
                        max={1440}
                        suffix="minutes"
                    />
                    <InputField
                        label="Idle Timeout"
                        type="number"
                        value={sessionPolicies.idle_timeout_minutes}
                        onChange={(v: number) => setSessionPolicies({ ...sessionPolicies, idle_timeout_minutes: v })}
                        min={5}
                        max={120}
                        suffix="minutes"
                    />
                </div>
            </div>

            <SectionHeader
                icon={<Lock className="w-5 h-5" />}
                title="Concurrent Sessions"
                description="Control how many devices can be logged in"
                color="blue"
            />
            <div className="space-y-4">
                <InputField
                    label="Max Concurrent Sessions"
                    type="number"
                    value={sessionPolicies.max_concurrent_sessions}
                    onChange={(v: number) => setSessionPolicies({ ...sessionPolicies, max_concurrent_sessions: v })}
                    min={1}
                    max={20}
                    suffix="sessions"
                />
                <ToggleField
                    label="Enforce Single Session"
                    description="Logout from other devices when logging in"
                    checked={sessionPolicies.enforce_single_session}
                    onChange={(v: boolean) => setSessionPolicies({ ...sessionPolicies, enforce_single_session: v })}
                />
            </div>

            <SectionHeader
                icon={<Key className="w-5 h-5" />}
                title="Token Settings"
                description="Configure access and refresh token expiration"
                color="purple"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField
                    label="Access Token Expire"
                    type="number"
                    value={sessionPolicies.access_token_expire_minutes}
                    onChange={(v: number) => setSessionPolicies({ ...sessionPolicies, access_token_expire_minutes: v })}
                    min={5}
                    max={1440}
                    suffix="minutes"
                />
                <InputField
                    label="Refresh Token Expire"
                    type="number"
                    value={sessionPolicies.refresh_token_expire_days}
                    onChange={(v: number) => setSessionPolicies({ ...sessionPolicies, refresh_token_expire_days: v })}
                    min={1}
                    max={90}
                    suffix="days"
                />
                <InputField
                    label="Remember Me Expire"
                    type="number"
                    value={sessionPolicies.remember_me_expire_days}
                    onChange={(v: number) => setSessionPolicies({ ...sessionPolicies, remember_me_expire_days: v })}
                    min={1}
                    max={365}
                    suffix="days"
                />
            </div>
        </div>
    );

    const renderLoginPolicies = () => (
        <div className="space-y-6">
            <SectionHeader
                icon={<Lock className="w-5 h-5" />}
                title="Failed Login Attempts"
                description="Configure account lockout after failed attempts"
                color="red"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                    label="Max Login Attempts"
                    type="number"
                    value={loginPolicies.max_login_attempts}
                    onChange={(v: number) => setLoginPolicies({ ...loginPolicies, max_login_attempts: v })}
                    min={3}
                    max={10}
                    suffix="attempts"
                />
                <InputField
                    label="Lockout Duration"
                    type="number"
                    value={loginPolicies.lockout_duration_minutes}
                    onChange={(v: number) => setLoginPolicies({ ...loginPolicies, lockout_duration_minutes: v })}
                    min={5}
                    max={1440}
                    suffix="minutes"
                />
            </div>
            <div className="space-y-4">
                <ToggleField
                    label="Progressive Lockout"
                    description="Increase lockout duration after repeated failures"
                    checked={loginPolicies.progressive_lockout}
                    onChange={(v: boolean) => setLoginPolicies({ ...loginPolicies, progressive_lockout: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="Lockout Multiplier"
                        type="number"
                        value={loginPolicies.progressive_lockout_multiplier}
                        onChange={(v: number) => setLoginPolicies({ ...loginPolicies, progressive_lockout_multiplier: v })}
                        min={1.5}
                        max={5}
                        suffix="x"
                        disabled={!loginPolicies.progressive_lockout}
                    />
                    <InputField
                        label="Max Lockout Duration"
                        type="number"
                        value={loginPolicies.max_lockout_duration_minutes}
                        onChange={(v: number) => setLoginPolicies({ ...loginPolicies, max_lockout_duration_minutes: v })}
                        min={60}
                        max={10080}
                        suffix="minutes"
                        disabled={!loginPolicies.progressive_lockout}
                    />
                </div>
            </div>

            <SectionHeader
                icon={<Globe className="w-5 h-5" />}
                title="IP Blocking"
                description="Block suspicious IP addresses"
                color="orange"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable IP Blocking"
                    description="Block IPs with too many failed attempts"
                    checked={loginPolicies.enable_ip_blocking}
                    onChange={(v: boolean) => setLoginPolicies({ ...loginPolicies, enable_ip_blocking: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="Block Threshold"
                        type="number"
                        value={loginPolicies.ip_block_threshold}
                        onChange={(v: number) => setLoginPolicies({ ...loginPolicies, ip_block_threshold: v })}
                        min={5}
                        max={100}
                        suffix="attempts"
                        disabled={!loginPolicies.enable_ip_blocking}
                    />
                    <InputField
                        label="Block Duration"
                        type="number"
                        value={loginPolicies.ip_block_duration_minutes}
                        onChange={(v: number) => setLoginPolicies({ ...loginPolicies, ip_block_duration_minutes: v })}
                        min={15}
                        max={10080}
                        suffix="minutes"
                        disabled={!loginPolicies.enable_ip_blocking}
                    />
                </div>
            </div>

            <SectionHeader
                icon={<Bell className="w-5 h-5" />}
                title="Security Notifications"
                description="Notify users about security events"
                color="blue"
            />
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <ToggleField
                    label="Notify on Account Lockout"
                    description="Email user when their account is locked"
                    checked={loginPolicies.notify_on_lockout}
                    onChange={(v: boolean) => setLoginPolicies({ ...loginPolicies, notify_on_lockout: v })}
                />
                <ToggleField
                    label="Notify on New Device Login"
                    description="Email user when logging in from a new device"
                    checked={loginPolicies.notify_on_new_device_login}
                    onChange={(v: boolean) => setLoginPolicies({ ...loginPolicies, notify_on_new_device_login: v })}
                />
                <ToggleField
                    label="Notify on Password Change"
                    description="Email user when their password is changed"
                    checked={loginPolicies.notify_on_password_change}
                    onChange={(v: boolean) => setLoginPolicies({ ...loginPolicies, notify_on_password_change: v })}
                />
            </div>
        </div>
    );

    const renderTwoFactorConfig = () => (
        <div className="space-y-6">
            <SectionHeader
                icon={<Smartphone className="w-5 h-5" />}
                title="2FA Enforcement"
                description="Configure two-factor authentication requirements"
                color="orange"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable 2FA System-wide"
                    description="Allow users to enable 2FA for their accounts"
                    checked={twoFactorConfig.enabled}
                    onChange={(v: boolean) => setTwoFactorConfig({ ...twoFactorConfig, enabled: v })}
                />
                <ToggleField
                    label="Enforce 2FA Globally"
                    description="Require all users to enable 2FA"
                    checked={twoFactorConfig.enforce_globally}
                    onChange={(v: boolean) => setTwoFactorConfig({ ...twoFactorConfig, enforce_globally: v })}
                />
                <ToggleField
                    label="Enforce 2FA for Admins"
                    description="Require admins to use 2FA"
                    checked={twoFactorConfig.enforce_for_admins}
                    onChange={(v: boolean) => setTwoFactorConfig({ ...twoFactorConfig, enforce_for_admins: v })}
                />
                <InputField
                    label="Grace Period"
                    type="number"
                    value={twoFactorConfig.grace_period_days}
                    onChange={(v: number) => setTwoFactorConfig({ ...twoFactorConfig, grace_period_days: v })}
                    min={0}
                    max={30}
                    suffix="days"
                />
            </div>

            <SectionHeader
                icon={<Mail className="w-5 h-5" />}
                title="2FA Methods"
                description="Configure available authentication methods"
                color="blue"
            />
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <ToggleField
                    label="Email OTP"
                    description="Send verification code via email"
                    checked={twoFactorConfig.email_method_enabled}
                    onChange={(v: boolean) => setTwoFactorConfig({ ...twoFactorConfig, email_method_enabled: v })}
                />
                <ToggleField
                    label="TOTP (Authenticator App)"
                    description="Use apps like Google Authenticator"
                    checked={twoFactorConfig.totp_method_enabled}
                    onChange={(v: boolean) => setTwoFactorConfig({ ...twoFactorConfig, totp_method_enabled: v })}
                />
            </div>

            <SectionHeader
                icon={<Key className="w-5 h-5" />}
                title="OTP Settings"
                description="Configure one-time password settings"
                color="purple"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField
                    label="Email OTP Length"
                    type="number"
                    value={twoFactorConfig.email_otp_length}
                    onChange={(v: number) => setTwoFactorConfig({ ...twoFactorConfig, email_otp_length: v })}
                    min={4}
                    max={8}
                    suffix="digits"
                />
                <InputField
                    label="Email OTP Expiry"
                    type="number"
                    value={twoFactorConfig.email_otp_expiry_minutes}
                    onChange={(v: number) => setTwoFactorConfig({ ...twoFactorConfig, email_otp_expiry_minutes: v })}
                    min={1}
                    max={30}
                    suffix="minutes"
                />
                <InputField
                    label="Email OTP Max Attempts"
                    type="number"
                    value={twoFactorConfig.email_otp_max_attempts}
                    onChange={(v: number) => setTwoFactorConfig({ ...twoFactorConfig, email_otp_max_attempts: v })}
                    min={1}
                    max={10}
                    suffix="attempts"
                />
            </div>

            <div className="space-y-4">
                <ToggleField
                    label="Enable Recovery Codes"
                    description="Allow users to generate backup recovery codes"
                    checked={twoFactorConfig.recovery_codes_enabled}
                    onChange={(v: boolean) => setTwoFactorConfig({ ...twoFactorConfig, recovery_codes_enabled: v })}
                />
                <InputField
                    label="Number of Recovery Codes"
                    type="number"
                    value={twoFactorConfig.recovery_codes_count}
                    onChange={(v: number) => setTwoFactorConfig({ ...twoFactorConfig, recovery_codes_count: v })}
                    min={5}
                    max={20}
                    suffix="codes"
                    disabled={!twoFactorConfig.recovery_codes_enabled}
                />
            </div>
        </div>
    );

    const renderApiSecurityConfig = () => (
        <div className="space-y-6">
            <SectionHeader
                icon={<Globe className="w-5 h-5" />}
                title="Rate Limiting"
                description="Protect API from abuse"
                color="cyan"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable Rate Limiting"
                    description="Limit API requests per time window"
                    checked={apiSecurityConfig.rate_limit_enabled}
                    onChange={(v: boolean) => setApiSecurityConfig({ ...apiSecurityConfig, rate_limit_enabled: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField
                        label="Max Requests"
                        type="number"
                        value={apiSecurityConfig.rate_limit_requests}
                        onChange={(v: number) => setApiSecurityConfig({ ...apiSecurityConfig, rate_limit_requests: v })}
                        min={10}
                        max={10000}
                        suffix="requests"
                    />
                    <InputField
                        label="Time Window"
                        type="number"
                        value={apiSecurityConfig.rate_limit_window_minutes}
                        onChange={(v: number) => setApiSecurityConfig({ ...apiSecurityConfig, rate_limit_window_minutes: v })}
                        min={1}
                        max={60}
                        suffix="minutes"
                    />
                    <SelectField
                        label="Rate Limit By"
                        value={apiSecurityConfig.rate_limit_by}
                        onChange={(v: string) => setApiSecurityConfig({ ...apiSecurityConfig, rate_limit_by: v })}
                        options={[
                            { value: 'IP', label: 'IP Address' },
                            { value: 'USER', label: 'User Account' },
                            { value: 'API_KEY', label: 'API Key' },
                        ]}
                    />
                </div>
            </div>

            <SectionHeader
                icon={<Key className="w-5 h-5" />}
                title="API Keys"
                description="Configure API key settings"
                color="purple"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable API Keys"
                    description="Allow users to create API keys"
                    checked={apiSecurityConfig.api_key_enabled}
                    onChange={(v: boolean) => setApiSecurityConfig({ ...apiSecurityConfig, api_key_enabled: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="Key Expiry"
                        type="number"
                        value={apiSecurityConfig.api_key_expiry_days}
                        onChange={(v: number) => setApiSecurityConfig({ ...apiSecurityConfig, api_key_expiry_days: v })}
                        min={30}
                        max={730}
                        suffix="days"
                    />
                    <InputField
                        label="Max Keys per User"
                        type="number"
                        value={apiSecurityConfig.api_key_max_per_user}
                        onChange={(v: number) => setApiSecurityConfig({ ...apiSecurityConfig, api_key_max_per_user: v })}
                        min={1}
                        max={20}
                        suffix="keys"
                    />
                </div>
            </div>

            <SectionHeader
                icon={<Shield className="w-5 h-5" />}
                title="CORS Settings"
                description="Configure Cross-Origin Resource Sharing"
                color="blue"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable CORS"
                    description="Allow cross-origin requests"
                    checked={apiSecurityConfig.cors_enabled}
                    onChange={(v: boolean) => setApiSecurityConfig({ ...apiSecurityConfig, cors_enabled: v })}
                />
                <InputField
                    label="Allowed Origins"
                    value={apiSecurityConfig.cors_allowed_origins}
                    onChange={(v: string) => setApiSecurityConfig({ ...apiSecurityConfig, cors_allowed_origins: v })}
                    placeholder="* or comma-separated list"
                />
                <ToggleField
                    label="Allow Credentials"
                    description="Allow sending cookies with requests"
                    checked={apiSecurityConfig.cors_allow_credentials}
                    onChange={(v: boolean) => setApiSecurityConfig({ ...apiSecurityConfig, cors_allow_credentials: v })}
                />
            </div>
        </div>
    );

    const renderSmtpSettings = () => (
        <div className="space-y-6">
            <SectionHeader
                icon={<Mail className="w-5 h-5" />}
                title="SMTP Server"
                description="Configure email server connection"
                color="pink"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable Email Sending"
                    description="Allow system to send emails"
                    checked={smtpSettings.smtp_enabled}
                    onChange={(v: boolean) => setSmtpSettings({ ...smtpSettings, smtp_enabled: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="SMTP Host"
                        value={smtpSettings.smtp_host}
                        onChange={(v: string) => setSmtpSettings({ ...smtpSettings, smtp_host: v })}
                        placeholder="smtp.example.com"
                    />
                    <InputField
                        label="SMTP Port"
                        type="number"
                        value={smtpSettings.smtp_port}
                        onChange={(v: number) => setSmtpSettings({ ...smtpSettings, smtp_port: v })}
                        min={1}
                        max={65535}
                    />
                    <InputField
                        label="Username"
                        value={smtpSettings.smtp_username}
                        onChange={(v: string) => setSmtpSettings({ ...smtpSettings, smtp_username: v })}
                        placeholder="user@example.com"
                    />
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={smtpSettings.smtp_password ?? ''}
                                onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 pr-10 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <SelectField
                        label="Encryption"
                        value={smtpSettings.smtp_encryption}
                        onChange={(v: string) => setSmtpSettings({ ...smtpSettings, smtp_encryption: v })}
                        options={[
                            { value: 'NONE', label: 'None' },
                            { value: 'SSL', label: 'SSL' },
                            { value: 'TLS', label: 'TLS (Recommended)' },
                        ]}
                    />
                    <InputField
                        label="Timeout"
                        type="number"
                        value={smtpSettings.smtp_timeout_seconds}
                        onChange={(v: number) => setSmtpSettings({ ...smtpSettings, smtp_timeout_seconds: v })}
                        min={5}
                        max={120}
                        suffix="seconds"
                    />
                </div>
            </div>

            <SectionHeader
                icon={<FileText className="w-5 h-5" />}
                title="Sender Settings"
                description="Configure email sender information"
                color="purple"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                    label="From Email"
                    value={smtpSettings.from_email}
                    onChange={(v: string) => setSmtpSettings({ ...smtpSettings, from_email: v })}
                    placeholder="noreply@example.com"
                />
                <InputField
                    label="From Name"
                    value={smtpSettings.from_name}
                    onChange={(v: string) => setSmtpSettings({ ...smtpSettings, from_name: v })}
                    placeholder="SustainPro"
                />
                <InputField
                    label="Reply-To Email"
                    value={smtpSettings.reply_to_email}
                    onChange={(v: string) => setSmtpSettings({ ...smtpSettings, reply_to_email: v })}
                    placeholder="support@example.com"
                />
            </div>

            <SectionHeader
                icon={<AlertTriangle className="w-5 h-5" />}
                title="Email Limits"
                description="Set sending limits to avoid spam issues"
                color="yellow"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField
                    label="Max Emails/Hour"
                    type="number"
                    value={smtpSettings.max_emails_per_hour}
                    onChange={(v: number) => setSmtpSettings({ ...smtpSettings, max_emails_per_hour: v })}
                    min={10}
                    max={1000}
                />
                <InputField
                    label="Max Emails/Day"
                    type="number"
                    value={smtpSettings.max_emails_per_day}
                    onChange={(v: number) => setSmtpSettings({ ...smtpSettings, max_emails_per_day: v })}
                    min={100}
                    max={10000}
                />
                <InputField
                    label="Max Recipients/Email"
                    type="number"
                    value={smtpSettings.max_recipients_per_email}
                    onChange={(v: number) => setSmtpSettings({ ...smtpSettings, max_recipients_per_email: v })}
                    min={1}
                    max={100}
                />
            </div>

            <div className="space-y-4">
                <ToggleField
                    label="Test Mode"
                    description="Send all emails to a test address instead of real recipients"
                    checked={smtpSettings.test_mode}
                    onChange={(v: boolean) => setSmtpSettings({ ...smtpSettings, test_mode: v })}
                />
                {smtpSettings.test_mode && (
                    <InputField
                        label="Test Email Recipient"
                        value={smtpSettings.test_email_recipient}
                        onChange={(v: string) => setSmtpSettings({ ...smtpSettings, test_email_recipient: v })}
                        placeholder="test@example.com"
                    />
                )}
            </div>
        </div>
    );

    const renderNotificationSettings = () => (
        <div className="space-y-6">
            <SectionHeader
                icon={<Bell className="w-5 h-5" />}
                title="Email Notifications"
                description="Configure email notification frequency"
                color="yellow"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable Email Notifications"
                    description="Send notifications via email"
                    checked={notificationSettings.email_notifications_enabled}
                    onChange={(v: boolean) => setNotificationSettings({ ...notificationSettings, email_notifications_enabled: v })}
                />
                <SelectField
                    label="Notification Frequency"
                    value={notificationSettings.email_frequency}
                    onChange={(v: string) => setNotificationSettings({ ...notificationSettings, email_frequency: v })}
                    options={[
                        { value: 'IMMEDIATE', label: 'Immediate' },
                        { value: 'HOURLY', label: 'Hourly Digest' },
                        { value: 'DAILY', label: 'Daily Digest' },
                    ]}
                />
                {notificationSettings.email_frequency === 'DAILY' && (
                    <InputField
                        label="Daily Digest Time"
                        value={notificationSettings.email_digest_time}
                        onChange={(v: string) => setNotificationSettings({ ...notificationSettings, email_digest_time: v })}
                        placeholder="09:00"
                    />
                )}
            </div>

            <SectionHeader
                icon={<Clock className="w-5 h-5" />}
                title="Quiet Hours"
                description="Pause non-urgent notifications during quiet hours"
                color="purple"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable Quiet Hours"
                    description="Pause notifications during specified hours"
                    checked={notificationSettings.quiet_hours_enabled}
                    onChange={(v: boolean) => setNotificationSettings({ ...notificationSettings, quiet_hours_enabled: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField
                        label="Start Time"
                        value={notificationSettings.quiet_hours_start}
                        onChange={(v: string) => setNotificationSettings({ ...notificationSettings, quiet_hours_start: v })}
                        placeholder="22:00"
                        disabled={!notificationSettings.quiet_hours_enabled}
                    />
                    <InputField
                        label="End Time"
                        value={notificationSettings.quiet_hours_end}
                        onChange={(v: string) => setNotificationSettings({ ...notificationSettings, quiet_hours_end: v })}
                        placeholder="07:00"
                        disabled={!notificationSettings.quiet_hours_enabled}
                    />
                    <SelectField
                        label="Timezone"
                        value={notificationSettings.quiet_hours_timezone}
                        onChange={(v: string) => setNotificationSettings({ ...notificationSettings, quiet_hours_timezone: v })}
                        options={[
                            { value: 'Asia/Dubai', label: 'Asia/Dubai' },
                            { value: 'UTC', label: 'UTC' },
                        ]}
                    />
                </div>
                <ToggleField
                    label="Override for Urgent"
                    description="Allow critical notifications during quiet hours"
                    checked={notificationSettings.quiet_hours_override_urgent}
                    onChange={(v: boolean) => setNotificationSettings({ ...notificationSettings, quiet_hours_override_urgent: v })}
                />
            </div>

            <SectionHeader
                icon={<Settings className="w-5 h-5" />}
                title="In-App Notifications"
                description="Configure in-app notification behavior"
                color="blue"
            />
            <div className="space-y-4">
                <ToggleField
                    label="Enable In-App Notifications"
                    description="Show notifications within the application"
                    checked={notificationSettings.in_app_notifications_enabled}
                    onChange={(v: boolean) => setNotificationSettings({ ...notificationSettings, in_app_notifications_enabled: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                        label="Auto-Dismiss After"
                        type="number"
                        value={notificationSettings.in_app_auto_dismiss_seconds}
                        onChange={(v: number) => setNotificationSettings({ ...notificationSettings, in_app_auto_dismiss_seconds: v })}
                        min={3}
                        max={30}
                        suffix="seconds"
                    />
                    <InputField
                        label="Max Visible Notifications"
                        type="number"
                        value={notificationSettings.in_app_max_visible}
                        onChange={(v: number) => setNotificationSettings({ ...notificationSettings, in_app_max_visible: v })}
                        min={1}
                        max={10}
                    />
                </div>
            </div>

            <InputField
                label="Notification Retention"
                type="number"
                value={notificationSettings.retention_days}
                onChange={(v: number) => setNotificationSettings({ ...notificationSettings, retention_days: v })}
                min={7}
                max={365}
                suffix="days"
            />
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general': return renderGeneralSettings();
            case 'password': return renderPasswordPolicies();
            case 'session': return renderSessionPolicies();
            case 'login': return renderLoginPolicies();
            case 'twoFactor': return renderTwoFactorConfig();
            case 'apiSecurity': return renderApiSecurityConfig();
            case 'smtp': return renderSmtpSettings();
            case 'notifications': return renderNotificationSettings();
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                <Toaster position="top-right" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Settings className="w-6 h-6 text-primary" />
                            System Configuration
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Manage global settings, security policies, and platform configuration
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Tabs */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-card border border-border rounded-xl p-2 space-y-1 sticky top-4">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {tab.icon}
                                    <span className="font-medium text-sm">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
