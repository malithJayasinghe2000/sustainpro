'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { User, Shield, Key, Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function ProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [passwordForDisable, setPasswordForDisable] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);

    useEffect(() => {
        // Get user's 2FA status from auth context
        setTwoFactorEnabled(user?.two_factor_enabled || false);
    }, [user]);

    const handleEnable2FA = async () => {
        setLoading(true);
        setMessage(null);
        
        try {
            const response = await api.post('/auth/2fa/enable');
            setTwoFactorEnabled(true);
            setMessage({ 
                type: 'success', 
                text: '✅ Two-Factor Authentication enabled! A confirmation email has been sent.' 
            });
        } catch (error: any) {
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.error || 'Failed to enable 2FA' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!passwordForDisable) {
            setMessage({ type: 'error', text: 'Please enter your password' });
            return;
        }

        setLoading(true);
        setMessage(null);
        
        try {
            const response = await api.post('/auth/2fa/disable', {
                password: passwordForDisable
            });
            setTwoFactorEnabled(false);
            setShowPasswordInput(false);
            setPasswordForDisable('');
            setMessage({ 
                type: 'success', 
                text: '✅ Two-Factor Authentication disabled successfully' 
            });
        } catch (error: any) {
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.error || 'Failed to disable 2FA. Check your password.' 
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
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            await api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });
            setMessage({ type: 'success', text: '✅ Password changed successfully' });
            (e.target as HTMLFormElement).reset();
        } catch (error: any) {
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.error || 'Failed to change password' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="page-padding max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="page-header-title">
                        <User className="w-7 h-7 text-primary" />
                        User Profile
                    </h1>
                    <p className="page-header-subtext">Manage your account settings and security preferences</p>
                </div>

                {/* Message Alert */}
                {message && (
                    <div className={`mb-4 p-4 rounded-lg border ${
                        message.type === 'success' 
                            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                    }`}>
                        {message.text}
                    </div>
                )}

                {/* User Info Card */}
                <div className="bg-card border border-border rounded-xl p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <User className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-foreground mb-1">Account Information</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Name:</span>
                                    <span className="text-foreground font-medium">{user?.full_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="text-foreground">{user?.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Organization:</span>
                                    <span className="text-foreground">{user?.org_name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two-Factor Authentication Card */}
                <div className="bg-card border border-border rounded-xl p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-foreground mb-1">Two-Factor Authentication</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Add an extra layer of security to your account by requiring a verification code in addition to your password.
                            </p>

                            {/* 2FA Status */}
                            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                                {twoFactorEnabled ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        <span className="text-sm font-medium text-foreground">2FA is currently enabled</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-5 h-5 text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">2FA is currently disabled</span>
                                    </>
                                )}
                            </div>

                            {/* 2FA Controls */}
                            {!twoFactorEnabled ? (
                                <button
                                    onClick={handleEnable2FA}
                                    disabled={loading}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                <div className="space-y-3">
                                    {!showPasswordInput ? (
                                        <button
                                            onClick={() => setShowPasswordInput(true)}
                                            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                                        >
                                            Disable Two-Factor Authentication
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    Enter your password to disable 2FA:
                                                </label>
                                                <input
                                                    type="password"
                                                    value={passwordForDisable}
                                                    onChange={(e) => setPasswordForDisable(e.target.value)}
                                                    placeholder="Your password"
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleDisable2FA}
                                                    disabled={loading}
                                                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                                <p className="text-xs text-blue-800 dark:text-blue-400">
                                    <strong>How it works:</strong> When 2FA is enabled, you'll receive a 6-digit verification code via email every time you log in. This code expires after 10 minutes.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Change Password Card */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <Key className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-foreground mb-1">Change Password</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Update your password regularly to keep your account secure.
                            </p>

                            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        required
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        required
                                        minLength={8}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Minimum 8 characters
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        required
                                        minLength={8}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
