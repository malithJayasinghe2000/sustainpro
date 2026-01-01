'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/lib/api';

import { User, LoginResponse } from '@/types/auth'; // Import centralized types

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (user: User) => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('auth_token');

            if (!storedToken) {
                setIsLoading(false);
                return;
            }

            // Set token immediately so API calls work
            setToken(storedToken);

            try {
                // ALWAYS fetch fresh data from server (don't show cached until server responds)
                const response: any = await authApi.getProfile();

                if (response.user) {
                    const freshUser = {
                        ...response.user,
                        code: response.user.code || 'SPS-USR-Pending',
                        created_at: response.user.created_at || new Date().toISOString()
                    };

                    setUser(freshUser);
                    localStorage.setItem('user', JSON.stringify(freshUser));

                    if (freshUser.timezone) {
                        localStorage.setItem('userTimezone', freshUser.timezone);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch fresh profile:', error);

                // Only fallback to cache if server is unreachable
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);

                        if (parsedUser.timezone) {
                            localStorage.setItem('userTimezone', parsedUser.timezone);
                        }
                    } catch (e) {
                        console.error("Failed to parse stored user", e);
                        localStorage.removeItem('user');
                        localStorage.removeItem('auth_token');
                        setToken(null);
                    }
                }
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        // We cast the response because api.ts is not fully typed yet, 
        // but we know it returns the structure matching LoginResponse partially
        const data = await authApi.login(email, password);

        // Map backend response to Frontend User Interface if needed
        // Backend returns: user: { id, email, organization_id, roles, isSuperAdmin, code, timezone }
        // Frontend User type expects same + created_at? 
        // We generally store what the backend gives us.

        const userData: User = {
            ...data.user,
            code: data.user.code || 'SPS-USR-Pending', // Fallback if backend update pending
            created_at: data.user.created_at || new Date().toISOString()
        };

        setToken(data.token);
        setUser(userData);

        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userTimezone', userData.timezone || 'UTC');
    };

    const logout = () => {
        authApi.logout().catch(() => { });
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('userTimezone');

        // Remove Organization Theme
        const styleTag = document.getElementById('org-theme-styles');
        if (styleTag) {
            styleTag.remove();
        }
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (updatedUser.timezone) {
            localStorage.setItem('userTimezone', updatedUser.timezone);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
                updateUser,
                isAuthenticated: !!token,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
