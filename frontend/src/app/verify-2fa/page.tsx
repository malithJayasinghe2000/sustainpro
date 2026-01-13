'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Verify2FAPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setAuthState, isAuthenticated } = useAuth();
    
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(600); // 10 minutes in seconds
    
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const email = searchParams.get('email');
    const tempToken = searchParams.get('token');

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, router]);

    // Redirect if no email or token
    useEffect(() => {
        if (!email || !tempToken) {
            toast.error('Invalid verification link');
            router.push('/login');
        }
    }, [email, tempToken, router]);

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Auto-focus first input
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Only take last character
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits are entered
        if (index === 5 && value && newOtp.every(digit => digit !== '')) {
            handleSubmit(newOtp.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        
        const newOtp = [...otp];
        pastedData.split('').forEach((digit, index) => {
            if (index < 6) {
                newOtp[index] = digit;
            }
        });
        setOtp(newOtp);

        // Focus last filled input or first empty
        const nextEmptyIndex = newOtp.findIndex(digit => digit === '');
        const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
        inputRefs.current[focusIndex]?.focus();

        // Auto-submit if all filled
        if (newOtp.every(digit => digit !== '')) {
            handleSubmit(newOtp.join(''));
        }
    };

    const handleSubmit = async (code?: string) => {
        const otpCode = code || otp.join('');
        
        if (otpCode.length !== 6) {
            toast.error('Please enter all 6 digits');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post('/auth/verify-2fa', {
                tempToken,
                code: otpCode,
            });

            if (response.data.success) {
                // Store the auth token with correct key
                localStorage.setItem('auth_token', response.data.token);
                
                // Store user data
                const userData = {
                    ...response.data.user,
                    code: response.data.user.code || 'SPS-USR-Pending',
                    created_at: response.data.user.created_at || new Date().toISOString()
                };
                localStorage.setItem('user', JSON.stringify(userData));
                
                if (userData.timezone) {
                    localStorage.setItem('userTimezone', userData.timezone);
                }
                
                // Update auth context
                setAuthState({
                    isAuthenticated: true,
                    user: userData,
                    isLoading: false,
                });

                toast.success('Verification successful!');
                
                // Small delay to ensure state is updated before navigation
                setTimeout(() => {
                    // Redirect based on user role
                    if (response.data.user.is_super_admin) {
                        router.push('/admin/dashboard');
                    } else {
                        router.push('/dashboard');
                    }
                }, 100);
            }
        } catch (error: any) {
            console.error('2FA verification error:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Verification failed';
            toast.error(errorMessage);
            
            // Clear OTP inputs on error
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
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
                }}
            />

            <div className="w-full max-w-md">
                <div className="bg-card shadow-xl rounded-2xl p-8 border border-border">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500/10 rounded-full mb-4">
                            <svg
                                className="w-8 h-8 text-teal-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Two-Factor Authentication
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            We've sent a 6-digit code to<br />
                            <span className="font-medium text-foreground">{email}</span>
                        </p>
                    </div>

                    {/* OTP Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-foreground mb-3 text-center">
                            Enter verification code
                        </label>
                        <div className="flex justify-center gap-2 mb-4">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={index === 0 ? handlePaste : undefined}
                                    disabled={isSubmitting}
                                    className="w-12 h-14 text-center text-xl font-bold bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            ))}
                        </div>

                        {/* Timer */}
                        <div className="text-center mb-4">
                            {countdown > 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Code expires in <span className="font-medium text-foreground">{formatCountdown(countdown)}</span>
                                </p>
                            ) : (
                                <p className="text-sm text-red-500 font-medium">
                                    Code expired
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={() => handleSubmit()}
                            disabled={isSubmitting || otp.some(digit => digit === '')}
                            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-background"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </span>
                            ) : 'Verify'}
                        </button>
                    </div>

                    {/* Resend Code */}
                    <div className="text-center border-t border-border pt-6">
                        <p className="text-sm text-muted-foreground">
                            Didn't receive the code? Check your spam folder or try logging in again.
                        </p>
                    </div>

                    {/* Back to Login */}
                    <div className="text-center mt-4">
                        <button
                            onClick={() => router.push('/login')}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ← Back to login
                        </button>
                    </div>
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        For security, this code will expire in 10 minutes.<br />
                        Check your spam folder if you don't see the email.
                    </p>
                </div>
            </div>
        </div>
    );
}
