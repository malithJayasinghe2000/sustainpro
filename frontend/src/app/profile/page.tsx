'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import PasswordRequirements, { usePasswordValidation } from '@/components/PasswordRequirements';
import { User, Shield, Key, Mail, CheckCircle2, XCircle, Loader2, Info, Building2, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';

// Define the sections for the profile page
interface ProfileSection {
    id: string;
    label: string;
}

const SECTIONS: ProfileSection[] = [
    { id: 'ACCOUNT', label: 'Account Information' },
    { id: 'SECURITY', label: 'Two-Factor Authentication' },
    { id: 'PASSWORD', label: 'Change Password' }
];

export default function ProfilePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [currentSection, setCurrentSection] = useState(0);
    const [loading, setLoading] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [passwordForDisable, setPasswordForDisable] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    const { isValid: isPasswordValid } = usePasswordValidation(newPassword);

    useEffect(() => {
        setTwoFactorEnabled(user?.two_factor_enabled || false);
    }, [user]);

    const handleEnable2FA = async () => {
        setLoading(true);

        try {
            await api.post('/auth/2fa/enable');
            setTwoFactorEnabled(true);
            toast.success('Two-Factor Authentication enabled successfully', {
                description: 'A confirmation email has been sent to your inbox.'
            });
        } catch (error: any) {
            toast.error('Failed to enable 2FA', {
                description: error.response?.data?.error || 'Please try again later.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!passwordForDisable) {
            toast.error('Password required', {
                description: 'Please enter your password to disable 2FA.'
            });
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/2fa/disable', {
                password: passwordForDisable
            });
            setTwoFactorEnabled(false);
            setShowPasswordInput(false);
            setPasswordForDisable('');
            toast.success('Two-Factor Authentication disabled');
        } catch (error: any) {
            toast.error('Failed to disable 2FA', {
                description: error.response?.data?.error || 'Check your password and try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!isPasswordValid) {
            toast.error('Password does not meet requirements');
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });
            toast.success('Password changed successfully');
            (e.target as HTMLFormElement).reset();
        } catch (error: any) {
            toast.error('Failed to change password', {
                description: error.response?.data?.error || 'Please check your current password.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Section: Account Information
    const renderAccountSection = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Account Information</h2>
            <p className="text-sm text-muted-foreground -mt-4">Your profile details and organization information.</p>

            <div className="bg-muted/30 rounded-lg border border-border divide-y divide-border">
                <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-medium text-foreground">{user?.full_name || '-'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Email Address</p>
                        <p className="font-medium text-foreground">{user?.email || '-'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Organization</p>
                        <p className="font-medium text-foreground">{user?.org_name || '-'}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Section: Two-Factor Authentication
    const renderSecuritySection = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground -mt-4">
                Add an extra layer of security to your account by requiring a verification code in addition to your password.
            </p>

            {/* 2FA Status */}
            <div className="bg-muted/30 rounded-lg border border-border p-4">
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${twoFactorEnabled
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-zinc-500/10 text-zinc-500'
                        }`}>
                        <Shield className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-foreground">Current Status</p>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${twoFactorEnabled
                                ? 'bg-green-600 text-white border border-green-600'
                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${twoFactorEnabled ? 'bg-white' : 'bg-zinc-400'}`} />
                                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {twoFactorEnabled
                                ? 'Your account takes advantage of an extra layer of security.'
                                : 'Enable 2FA to protect your account from unauthorized access.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2FA Controls */}
            {!twoFactorEnabled ? (
                <button
                    onClick={handleEnable2FA}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enabling...
                        </>
                    ) : (
                        <>
                            <Shield className="w-4 h-4" />
                            Enable Two-Factor Authentication
                        </>
                    )}
                </button>
            ) : (
                <div className="space-y-4">
                    {!showPasswordInput ? (
                        <button
                            onClick={() => setShowPasswordInput(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium text-sm"
                        >
                            Disable Two-Factor Authentication
                        </button>
                    ) : (
                        <div className="space-y-4 max-w-sm">
                            <div>
                                <label className="label-compact">Enter your password to disable 2FA</label>
                                <div className="relative">
                                    <Key className="icon-input" />
                                    <input
                                        type="password"
                                        value={passwordForDisable}
                                        onChange={(e) => setPasswordForDisable(e.target.value)}
                                        placeholder="Your password"
                                        className="input-compactWithIcon"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDisable2FA}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Disabling...
                                        </>
                                    ) : (
                                        'Confirm Disable'
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPasswordInput(false);
                                        setPasswordForDisable('');
                                    }}
                                    className="px-5 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );

    // Section: Change Password
    const renderPasswordSection = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Change Password</h2>
            <p className="text-sm text-muted-foreground -mt-4">
                Update your password regularly to keep your account secure.
            </p>

            <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                <div>
                    <label className="label-compact">Current Password</label>
                    <div className="relative">
                        <Key className="icon-input" />
                        <input
                            type="password"
                            name="currentPassword"
                            required
                            className="input-compactWithIcon"
                            placeholder="Enter current password"
                        />
                    </div>
                </div>
                <div>
                    <label className="label-compact">New Password</label>
                    <div className="relative">
                        <Key className="icon-input" />
                        <input
                            type="password"
                            name="newPassword"
                            required
                            minLength={8}
                            className="input-compactWithIcon"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                </div>

                {/* Password Requirements - Dynamic from API */}
                <PasswordRequirements password={newPassword} />
                <div>
                    <label className="label-compact">Confirm New Password</label>
                    <div className="relative">
                        <Key className="icon-input" />
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            minLength={8}
                            className="input-compactWithIcon"
                            placeholder="Confirm new password"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Changing Password...
                        </>
                    ) : (
                        'Change Password'
                    )}
                </button>
            </form>
        </div>
    );

    // Render current section content
    const renderSectionContent = () => {
        switch (currentSection) {
            case 0:
                return renderAccountSection();
            case 1:
                return renderSecuritySection();
            case 2:
                return renderPasswordSection();
            default:
                return renderAccountSection();
        }
    };

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto py-6">
                {/* Header with Breadcrumb */}
                <div className="flex flex-col gap-4 mb-8">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            Dashboard
                        </button>
                        <span>/</span>
                        <span className="text-foreground font-medium">User Profile</span>
                    </div>

                    {/* Title */}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">
                            User Profile
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage your account settings and security preferences.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Section Sidebar */}
                    <div className="hidden lg:block space-y-1">
                        {SECTIONS.map((section, idx) => {
                            const isActive = currentSection === idx;

                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setCurrentSection(idx)}
                                    className={`w-full relative flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 text-left ${isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                        }`}
                                >
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${isActive
                                        ? 'bg-white text-primary'
                                        : 'bg-muted border border-border'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <span className="font-medium text-sm">{section.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        <div className="bg-card border border-border rounded-xl p-8 min-h-[400px]">
                            {/* Mobile Section Tabs */}
                            <div className="lg:hidden flex gap-2 mb-6 overflow-x-auto pb-2 -mx-2 px-2">
                                {SECTIONS.map((section, idx) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setCurrentSection(idx)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${currentSection === idx
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {section.label}
                                    </button>
                                ))}
                            </div>

                            {renderSectionContent()}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
