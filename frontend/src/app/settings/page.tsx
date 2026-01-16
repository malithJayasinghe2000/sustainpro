'use client';

import { useState, useEffect } from 'react';
import {
    Shield, Save, Settings, Building2, Palette, Globe, Clock,
    RefreshCw, User, Lock, AlertCircle
} from 'lucide-react';
import { RichSelect } from '@/components/ui/RichSelect';
import { getAllTimezones } from '@/lib/timezone';
import DashboardLayout from '@/components/DashboardLayout';
import { organizationsApi, authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

type Tab = 'organization' | 'profile' | 'security';

interface Organization {
    id: string;
    name: string;
    slug: string;
    code: string;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    theme_config: {
        primaryColor?: string;
        logoUrl?: string;
    } | null;
    is_active: boolean;
    created_at: string;
}

export default function OrgSettingsPage() {
    const { user, updateUser, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // State
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('organization');
    const [selectedTimezone, setSelectedTimezone] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Password Change State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Style Classes
    const inputClass = "w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50";
    const labelClass = "text-xs font-semibold uppercase text-muted-foreground mb-1.5 block tracking-wider";

    // Permission check - redirect if not org admin
    useEffect(() => {
        if (!authLoading && user) {
            const isOrgAdmin = user.roles?.some((r: any) => r.role === 'ORG_ADMIN');
            if (!isOrgAdmin && !user.is_super_admin) {
                router.replace('/dashboard');
            }
        }
    }, [user, authLoading, router]);

    // Load organization data when user is available
    useEffect(() => {
        if (!authLoading && user?.organization_id) {
            loadOrganization();
        } else if (!authLoading && !user?.organization_id) {
            setIsLoading(false);
            setError('No organization assigned to your account');
        }
    }, [authLoading, user?.organization_id]);

    // Set user timezone
    useEffect(() => {
        if (user?.timezone) {
            setSelectedTimezone(user.timezone);
        }
    }, [user?.timezone]);

    const loadOrganization = async () => {
        if (!user?.organization_id) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await organizationsApi.getOne(user.organization_id);
            setOrganization(data);
        } catch (err: any) {
            console.error('Failed to load organization:', err);
            setError(err.response?.data?.error || 'Failed to load organization data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveOrganization = async () => {
        if (!organization || !user?.organization_id) return;

        setIsSaving(true);
        try {
            const updateData = {
                name: organization.name,
                slug: organization.slug,
                contact_email: organization.contact_email,
                contact_phone: organization.contact_phone,
                address: organization.address,
                theme_config: organization.theme_config,
            };

            const response = await organizationsApi.update(user.organization_id, updateData);
            if (response.data) {
                setOrganization(response.data);
            }
            toast.success('Organization updated successfully');
        } catch (err: any) {
            console.error('Failed to save:', err);
            toast.error(err.response?.data?.error || 'Failed to update organization');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTimezone = async () => {
        try {
            const response = await authApi.updateProfile({ timezone: selectedTimezone });
            if (response.user) {
                updateUser(response.user);
            }
            toast.success('Timezone updated successfully');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update timezone');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        try {
            await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
            toast.success('Password changed successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to change password');
        }
    };

    const updateOrgField = (field: string, value: any) => {
        if (!organization) return;
        setOrganization({ ...organization, [field]: value });
    };

    const updateThemeField = (field: string, value: string) => {
        if (!organization) return;
        setOrganization({
            ...organization,
            theme_config: {
                ...organization.theme_config,
                [field]: value
            }
        });
    };

    // Check access
    const isOrgAdmin = user?.roles?.some((r: any) => r.role === 'ORG_ADMIN');
    if (authLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (!isOrgAdmin && !user?.is_super_admin) {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1400px] mx-auto space-y-6">
                <Toaster position="bottom-right" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title">
                            <Settings className="w-6 h-6 text-primary" />
                            Organization Settings
                        </h1>
                        <p className="page-header-subtext">
                            Manage your organization profile, branding, and personal account settings.
                        </p>
                    </div>
                    {activeTab === 'organization' && organization && (
                        <button
                            onClick={handleSaveOrganization}
                            disabled={isSaving}
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
                    {activeTab === 'profile' && (
                        <button
                            onClick={handleSaveTimezone}
                            disabled={selectedTimezone === user?.timezone}
                            className="btn-primary"
                        >
                            <Save className="w-4 h-4" />
                            Save Timezone
                        </button>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
                    {[
                        { id: 'organization', label: 'Organization', icon: Building2 },
                        { id: 'profile', label: 'My Profile', icon: User },
                        { id: 'security', label: 'Security', icon: Lock },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${isActive
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Error State */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <p className="text-sm text-destructive">{error}</p>
                        <button onClick={loadOrganization} className="ml-auto text-sm text-primary hover:underline">
                            Retry
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading settings...</p>
                    </div>
                )}

                {/* Content */}
                {!isLoading && !error && (
                    <>
                        {/* Organization Tab */}
                        {activeTab === 'organization' && organization && (
                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        <h2 className="font-semibold text-base">Organization Details</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClass}>Organization Name</label>
                                            <input
                                                type="text"
                                                value={organization.name || ''}
                                                onChange={(e) => updateOrgField('name', e.target.value)}
                                                className={inputClass}
                                                placeholder="Your Organization"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Slug</label>
                                            <input
                                                type="text"
                                                value={organization.slug || ''}
                                                onChange={(e) => updateOrgField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                                className={inputClass}
                                                placeholder="your-org"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
                                        <Globe className="w-5 h-5 text-primary" />
                                        <h2 className="font-semibold text-base">Contact Information</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClass}>Email</label>
                                            <input
                                                type="email"
                                                value={organization.contact_email || ''}
                                                onChange={(e) => updateOrgField('contact_email', e.target.value)}
                                                className={inputClass}
                                                placeholder="contact@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Phone</label>
                                            <input
                                                type="tel"
                                                value={organization.contact_phone || ''}
                                                onChange={(e) => updateOrgField('contact_phone', e.target.value)}
                                                className={inputClass}
                                                placeholder="+1 234 567 890"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelClass}>Address</label>
                                            <textarea
                                                value={organization.address || ''}
                                                onChange={(e) => updateOrgField('address', e.target.value)}
                                                className={`${inputClass} min-h-[80px] resize-none`}
                                                placeholder="Full address"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Branding */}
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
                                        <Palette className="w-5 h-5 text-primary" />
                                        <h2 className="font-semibold text-base">Branding</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelClass}>Primary Color</label>
                                            <div className="flex gap-3 items-center">
                                                <input
                                                    type="color"
                                                    value={organization.theme_config?.primaryColor || '#3b82f6'}
                                                    onChange={(e) => updateThemeField('primaryColor', e.target.value)}
                                                    className="w-12 h-10 rounded-lg border border-border cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={organization.theme_config?.primaryColor || '#3b82f6'}
                                                    onChange={(e) => updateThemeField('primaryColor', e.target.value)}
                                                    className={`${inputClass} flex-1 font-mono`}
                                                    placeholder="#3b82f6"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Logo URL</label>
                                            <input
                                                type="url"
                                                value={organization.theme_config?.logoUrl || ''}
                                                onChange={(e) => updateThemeField('logoUrl', e.target.value)}
                                                className={inputClass}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Read-only Info */}
                                <div className="bg-muted/30 border border-border rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/50">
                                        <Shield className="w-4 h-4 text-muted-foreground" />
                                        <h2 className="font-medium text-sm text-muted-foreground">System Information</h2>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-xs text-muted-foreground block">ID</span>
                                            <span className="font-mono">{organization.id?.slice(0, 8)}...</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Code</span>
                                            <span className="font-mono">{organization.code}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Status</span>
                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${organization.is_active
                                                    ? 'bg-green-500/10 text-green-600'
                                                    : 'bg-red-500/10 text-red-600'
                                                }`}>
                                                {organization.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Created</span>
                                            <span>{new Date(organization.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                            <User className="w-10 h-10 text-primary" />
                                        </div>
                                        <h3 className="font-semibold text-lg">{user?.full_name || user?.email}</h3>
                                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                                        <span className="mt-2 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                            {user?.roles?.[0]?.role || 'User'}
                                        </span>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
                                        <Clock className="w-5 h-5 text-primary" />
                                        <h2 className="font-semibold text-base">Preferences</h2>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Timezone</label>
                                        <RichSelect
                                            value={selectedTimezone}
                                            onChange={setSelectedTimezone}
                                            options={getAllTimezones().map(tz => ({
                                                value: tz,
                                                label: tz.replace(/_/g, ' '),
                                                icon: Clock
                                            }))}
                                            className="h-11"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            All timestamps will be displayed in this timezone.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="max-w-xl">
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
                                        <Shield className="w-5 h-5 text-primary" />
                                        <h2 className="font-semibold text-base">Change Password</h2>
                                    </div>
                                    <form onSubmit={handleChangePassword} className="space-y-5">
                                        <div>
                                            <label className={labelClass}>Current Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Confirm Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <button type="submit" className="btn-primary w-full">
                                            <Lock className="w-4 h-4" />
                                            Update Password
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
