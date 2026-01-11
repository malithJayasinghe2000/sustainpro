'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsApi } from '@/lib/api';

interface PublicSettings {
    system_name: string;
    site_title: string;
    site_tagline: string | null;
    site_logo: string | null;
    site_favicon: string | null;
    primary_color: string;
    secondary_color: string;
    default_timezone: string;
    date_format: string;
    time_format: string;
    maintenance_mode: boolean;
    maintenance_message: string | null;
    global_alert_message: string | null;
    global_alert_type: string;
    support_email: string | null;
    support_phone: string | null;
    support_url: string | null;
}

interface SettingsContextType {
    settings: PublicSettings | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const defaultSettings: PublicSettings = {
    system_name: 'SustainPro',
    site_title: 'SustainPro IoT',
    site_tagline: 'Smart Sustainability Management',
    site_logo: null,
    site_favicon: null,
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    default_timezone: 'Asia/Dubai',
    date_format: 'DD/MM/YYYY',
    time_format: 'HH:mm:ss',
    maintenance_mode: false,
    maintenance_message: null,
    global_alert_message: null,
    global_alert_type: 'INFO',
    support_email: null,
    support_phone: null,
    support_url: null,
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    isLoading: true,
    error: null,
    refetch: async () => { },
});

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<PublicSettings | null>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            console.log('[SettingsContext] Fetching public settings...');
            const data = await settingsApi.getPublic();
            console.log('[SettingsContext] Received settings:', data);
            if (data) {
                setSettings({ ...defaultSettings, ...data });
            }
            setError(null);
        } catch (err: any) {
            console.error('[SettingsContext] Failed to load public settings:', err);
            setError(err.message);
            // Keep default settings on error
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, isLoading, error, refetch: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

export default SettingsContext;
