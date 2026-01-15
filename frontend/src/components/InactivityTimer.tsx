'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface InactivityTimerProps {
    children: React.ReactNode;
}

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 10 * 1000; // 10 seconds warning

export default function InactivityTimer({ children }: InactivityTimerProps) {
    const { isAuthenticated, logout } = useAuth();
    const router = useRouter();

    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [progress, setProgress] = useState(100);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleLogout = useCallback(() => {
        logout();
        router.push('/login');
        setShowWarning(false);
    }, [logout, router]);

    const resetTimer = useCallback(() => {
        // Clear all existing timers
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        setShowWarning(false);
        setCountdown(10);
        setProgress(100);

        if (!isAuthenticated) return;

        // Set warning timer (1:50 - show warning at 10 seconds before logout)
        warningTimeoutRef.current = setTimeout(() => {
            setShowWarning(true);
            setCountdown(10);
            setProgress(100);

            // Start countdown
            let secondsLeft = 10;
            countdownIntervalRef.current = setInterval(() => {
                secondsLeft -= 1;
                setCountdown(secondsLeft);
                setProgress((secondsLeft / 10) * 100);

                if (secondsLeft <= 0) {
                    if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                    }
                }
            }, 1000);
        }, INACTIVITY_TIMEOUT - WARNING_TIME);

        // Set logout timer (2:00 - auto logout)
        timeoutRef.current = setTimeout(() => {
            handleLogout();
        }, INACTIVITY_TIMEOUT);
    }, [isAuthenticated, handleLogout]);

    const handleContinue = () => {
        resetTimer();
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        // List of events to track user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        // Reset timer on any activity
        events.forEach((event) => {
            document.addEventListener(event, resetTimer);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            events.forEach((event) => {
                document.removeEventListener(event, resetTimer);
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [isAuthenticated, resetTimer]);

    return (
        <>
            {children}

            {/* Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-slideUp">
                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-4">
                                <svg className="w-12 h-12 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            Session Timeout Warning
                        </h2>

                        {/* Message */}
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            You've been inactive. Your session will expire in:
                        </p>

                        {/* Countdown */}
                        <div className="text-center mb-6">
                            <div className="text-5xl font-bold text-yellow-600 dark:text-yellow-400 tabular-nums">
                                {countdown}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                seconds
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-1000 ease-linear rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleLogout}
                                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                            >
                                Logout Now
                            </button>
                            <button
                                onClick={handleContinue}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition font-medium shadow-lg"
                            >
                                Stay Logged In
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
        </>
    );
}
