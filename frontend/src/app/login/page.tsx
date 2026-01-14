'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getFullImageUrl } from '@/components/ImageUpload';
import { Sun, Moon } from 'lucide-react';
import { isAdmin, hasRole, ROLES } from '@/lib/roles';
import toast, { Toaster, Toast } from 'react-hot-toast';
import apiClient from '@/lib/api';



export default function LoginPage() {
    const router = useRouter();
    const { login, isAuthenticated, isLoading, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { settings } = useSettings();

    // Get branding from settings
    const systemName = settings?.system_name || 'SustainPro';
    const siteTagline = settings?.site_tagline || 'IoT Cloud Platform';
    const siteLogo = getFullImageUrl(settings?.site_logo) || '/logo.png'; // Fallback to default logo

    // ... (state hooks same as before)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [lockInfo, setLockInfo] = useState<{ lockedUntil: string; minutesRemaining: number } | null>(null);
    const [countdown, setCountdown] = useState(0);

    // Redirect if already authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated && user) {
            if (user.is_super_admin) {
                router.push('/admin/dashboard');
            } else if (hasRole(user, ROLES.EVENT_MANAGER)) {
                // Find the event ID this user is assigned to
                const eventRole = user?.roles?.find((r: any) => r.role === ROLES.EVENT_MANAGER && r.event_id);
                if (eventRole?.event_id) {
                    router.push(`/events/${eventRole.event_id}`);
                } else {
                    router.push('/events'); // Fallback if no specific event found (unlikely)
                }
            } else {
                router.push('/dashboard');
            }
        }
    }, [isAuthenticated, isLoading, router, user]);

    // Countdown logic ...
    useEffect(() => {
        if (lockInfo) {
            const timer = setInterval(() => {
                const now = new Date().getTime();
                const lockUntil = new Date(lockInfo.lockedUntil).getTime();
                const remaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));
                setCountdown(remaining);
                if (remaining === 0) {
                    setLockInfo(null);
                    clearInterval(timer);
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [lockInfo]);

    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            
            // Check if 2FA is required
            if (response.data.requiresTwoFactor) {
                toast.success('Code sent to your email!');
                // Redirect to 2FA verification page
                router.push(`/verify-2fa?email=${encodeURIComponent(email)}&token=${response.data.tempToken}`);
                return;
            }

            // Normal login without 2FA
            await login(email, password);
            toast.success('Login successful!');
            // Redirect handled by useEffect
        } catch (error: any) {
            console.error("Login Handler Error:", error);
            const status = error.response?.status;

            // 423 = Locked by DB policy (has lockUntil)
            // 429 = Rate Limited by middleware (usually no lockUntil)
            if (status === 423 || status === 429) {
                const lockUntil = error.response?.data?.lockUntil;

                if (lockUntil) {
                    const minutes = Math.ceil((new Date(lockUntil).getTime() - Date.now()) / 60000);
                    setLockInfo({ lockedUntil: lockUntil, minutesRemaining: minutes });
                    // Simple toast, no countdown popup
                    toast.error("Account locked due to multiple failed attempts.");
                } else {
                    // Fallback for 429 without specific lock time
                    toast.error('Maximum login attempts exceeded. Please try again later.');
                }
            } else {
                const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Login failed';
                toast.error(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

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
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    },
                    success: {
                        iconTheme: {
                            primary: '#2dd4bf',
                            secondary: '#042f2e',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#fb7185',
                            secondary: '#042f2e',
                        },
                        style: {
                            background: '#4c0519',
                            border: '1px solid rgba(251, 113, 133, 0.2)',
                            color: '#fff1f2'
                        }
                    },
                    loading: {
                        style: {
                            border: '1px solid rgba(45, 212, 191, 0.2)',
                        }
                    }
                }}

            />

            {/* Theme Toggle in Top Right */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={toggleTheme}
                    className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 bg-card border border-border shadow-sm"
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5" />
                    ) : (
                        <Moon className="w-5 h-5" />
                    )}
                </button>
            </div>

            <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-2xl shadow-xl border border-border">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center mb-6">
                        {siteLogo && !logoError ? (
                            <img
                                src={siteLogo}
                                alt={systemName}
                                className="h-16 w-auto object-contain"
                                onError={() => {
                                    console.log('Logo failed to load:', siteLogo);
                                    setLogoError(true);
                                }}
                                onLoad={() => console.log('Logo loaded successfully:', siteLogo)}
                            />
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg mb-2">
                                    <span className="text-3xl font-bold text-primary-foreground">
                                        {systemName?.charAt(0) || 'S'}
                                    </span>
                                </div>
                                <h1 className="text-2xl font-bold text-primary">{systemName}</h1>
                            </div>
                        )}
                    </div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        {siteTagline}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Sign in to your account
                    </p>
                </div>

                {/* Account Locked Alert - Simplified Text */}
                {lockInfo && countdown > 0 && (
                    <div className="flex items-center justify-center gap-2 text-red-500 font-medium text-sm animate-pulse">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Account locked. Unlocks in {formatCountdown(countdown)}</span>
                    </div>
                )}

                {/* Form */}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none relative block w-full px-3 py-3 border border-input placeholder-muted-foreground text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all bg-background"
                                placeholder="Enter your email"
                                disabled={!!lockInfo || isSubmitting}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-3 border border-input placeholder-muted-foreground text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all bg-background"
                                    placeholder="Enter your password"
                                    disabled={!!lockInfo || isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={!!lockInfo || isSubmitting}
                            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all ${(!!lockInfo || isSubmitting) ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-lg transform hover:-translate-y-0.5'
                                }`}
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                    <svg className="h-5 w-5 text-primary-foreground/50 group-hover:text-primary-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            )}
                            {isSubmitting ? 'Signing in...' : (lockInfo ? `Locked (${formatCountdown(countdown)})` : 'Sign in')}
                        </button>
                    </div>
                </form>
            </div>

            <p className="absolute bottom-6 text-center text-xs text-muted-foreground w-full">
                &copy; {new Date().getFullYear()} {systemName}. All rights reserved.
            </p>
        </div>
    );
}
