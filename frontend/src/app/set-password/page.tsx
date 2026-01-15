'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getFullImageUrl } from '@/components/ImageUpload';
import PasswordRequirements from '@/components/PasswordRequirements';
import { Sun, Moon, Lock, Eye, EyeOff, Check, AlertCircle, Shield } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import apiClient from '@/lib/api';

export default function SetPasswordPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { settings } = useSettings();

    // Get branding from settings
    const systemName = settings?.system_name || 'SustainPro';
    const siteTagline = settings?.site_tagline || 'IoT Cloud Platform';
    const siteLogo = getFullImageUrl(settings?.site_logo) || '/logo.png';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password validation state (controlled by PasswordRequirements component)
    const [isPasswordValid, setIsPasswordValid] = useState(false);

    // Memoized callback for password validation changes
    const handlePasswordValidChange = useCallback((valid: boolean) => {
        setIsPasswordValid(valid);
    }, []);

    // Check if user has temp credentials
    useEffect(() => {
        const user = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');

        if (!user || !accessToken) {
            router.push('/login');
            return;
        }

        const userData = JSON.parse(user);
        if (!userData.force_password_change) {
            // User doesn't need to change password, redirect to dashboard
            router.push('/dashboard');
        }
    }, [router]);
    const doPasswordsMatch = password === confirmPassword && password.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isPasswordValid) {
            toast.error('Please meet all password requirements');
            return;
        }

        if (!doPasswordsMatch) {
            toast.error('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        try {
            // Call the change password API
            const accessToken = localStorage.getItem('accessToken');
            const user = JSON.parse(localStorage.getItem('user') || '{}');

            await apiClient.post('/auth/change-password', {
                currentPassword: '', // For force_password_change, backend should accept empty
                newPassword: password,
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            toast.success('Password set successfully!');

            // Clear the temp storage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            // Redirect to login
            setTimeout(() => {
                router.push('/login');
            }, 1500);
        } catch (error: any) {
            console.error('Password change error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to set password';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // PasswordRequirement component is now imported from @/components/PasswordRequirements

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Toaster
                position="top-right"
                gutter={8}
                toastOptions={{
                    className: '!bg-card !text-card-foreground !border !border-border !shadow-lg',
                    duration: 4000,
                    style: {
                        background: '#042f2e',
                        color: '#f0fdfa',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        padding: '12px 16px',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(20, 184, 166, 0.2)',
                    },
                    success: {
                        iconTheme: { primary: '#2dd4bf', secondary: '#042f2e' },
                    },
                    error: {
                        iconTheme: { primary: '#fb7185', secondary: '#042f2e' },
                        style: {
                            background: '#4c0519',
                            border: '1px solid rgba(251, 113, 133, 0.2)',
                            color: '#fff1f2'
                        }
                    },
                }}
            />

            {/* Theme Toggle */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={toggleTheme}
                    className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card border border-border shadow-sm"
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>

            <div className="max-w-md w-full space-y-6 bg-card p-8 rounded-2xl shadow-xl border border-border">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center mb-6">
                        {siteLogo && !logoError ? (
                            <img
                                src={siteLogo}
                                alt={systemName}
                                className="h-12 w-auto object-contain"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-xl font-bold text-primary-foreground">
                                    {systemName?.charAt(0) || 'S'}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-xs font-medium mb-4 border border-amber-500/20">
                        <Shield className="w-3.5 h-3.5" />
                        Password Setup Required
                    </div>

                    <h2 className="text-xl font-bold text-card-foreground">
                        Create Your Password
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Please set a secure password to continue using your account.
                    </p>
                </div>

                {/* Form */}
                <form className="space-y-5" onSubmit={handleSubmit}>
                    {/* New Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none block w-full pl-10 pr-10 py-3 border border-input placeholder-muted-foreground text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all bg-background"
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements - Dynamic from API */}
                    <PasswordRequirements
                        password={password}
                        onValidChange={handlePasswordValidChange}
                    />

                    {/* Confirm Password */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`appearance-none block w-full pl-10 pr-10 py-3 border placeholder-muted-foreground text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all bg-background ${confirmPassword.length > 0
                                    ? doPasswordsMatch
                                        ? 'border-green-500/50'
                                        : 'border-red-500/50'
                                    : 'border-input'
                                    }`}
                                placeholder="Confirm new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && !doPasswordsMatch && (
                            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Passwords do not match
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!isPasswordValid || !doPasswordsMatch || isSubmitting}
                        className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all ${!isPasswordValid || !doPasswordsMatch || isSubmitting
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:bg-primary/90 hover:shadow-lg'
                            }`}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Setting Password...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Set Password & Continue
                            </>
                        )}
                    </button>
                </form>
            </div>

            <p className="absolute bottom-6 text-center text-xs text-muted-foreground w-full">
                &copy; {new Date().getFullYear()} {systemName}. All rights reserved.
            </p>
        </div>
    );
}
