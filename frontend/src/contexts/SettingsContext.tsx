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

// Default fallback colors
const DEFAULT_PRIMARY_COLOR = '#14b8a6'; // Teal
const DEFAULT_SECONDARY_COLOR = '#10B981'; // Emerald

// Default fallback logo - served from public folder
const DEFAULT_LOGO = '/logo.png';

const defaultSettings: PublicSettings = {
    system_name: 'SustainPro',
    site_title: 'SustainPro IoT',
    site_tagline: 'Smart Sustainability Management',
    site_logo: DEFAULT_LOGO,
    site_favicon: null,
    primary_color: DEFAULT_PRIMARY_COLOR,
    secondary_color: DEFAULT_SECONDARY_COLOR,
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

/**
 * Apply system colors from settings to CSS variables
 */
function applySystemColors(primaryColor: string | null | undefined, secondaryColor: string | null | undefined) {
    // Use provided colors or fallback to defaults
    const primary = primaryColor || DEFAULT_PRIMARY_COLOR;
    const secondary = secondaryColor || DEFAULT_SECONDARY_COLOR;

    // Only run in browser
    if (typeof window === 'undefined') return;

    // Remove existing style tag if any
    const styleId = 'system-theme-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }

    // Convert hex to HSL for generating variations
    const hexToHsl = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return { h: 0, s: 0, l: 0 };
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    };

    const { h, s } = hexToHsl(primary);
    const { r, g, b } = hexToRgb(primary);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const primaryForeground = yiq < 128 ? '#ffffff' : '#0f172a';

    // Dark mode palette based on primary color
    const darkBgS = Math.min(s, 25);
    const darkBg = `hsl(${h}, ${darkBgS}%, 4%)`;
    const darkCard = `hsl(${h}, ${darkBgS}%, 8%)`;
    const darkBorder = `hsl(${h}, ${darkBgS}%, 15%)`;
    const darkMuted = `hsl(${h}, ${darkBgS}%, 12%)`;

    // Apply CSS variables
    styleTag.innerHTML = `
        :root {
            --primary: ${primary} !important;
            --primary-foreground: ${primaryForeground} !important;
            --ring: ${primary} !important;
            --secondary-accent: ${secondary} !important;
        }
        
        .dark {
            --primary: ${primary} !important;
            --primary-foreground: ${primaryForeground} !important;
            --ring: ${primary} !important;
            --secondary-accent: ${secondary} !important;
            
            /* Tinted Dark Mode Backgrounds */
            --background: ${darkBg} !important;
            --card: ${darkCard} !important;
            --popover: ${darkCard} !important;
            --border: ${darkBorder} !important;
            --input: ${darkBorder} !important;
            --muted: ${darkMuted} !important;
            --muted-foreground: hsl(${h}, ${Math.min(s, 20)}%, 70%) !important;
        }
    `;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<PublicSettings | null>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const data = await settingsApi.getPublic();
            if (data) {
                const mergedSettings = { ...defaultSettings, ...data };
                setSettings(mergedSettings);

                // Apply system colors from settings
                applySystemColors(mergedSettings.primary_color, mergedSettings.secondary_color);
            }
            setError(null);
        } catch (err: any) {
            setError(err.message);
            // Keep default settings and colors on error
            applySystemColors(DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Re-apply colors when settings change
    useEffect(() => {
        if (settings) {
            applySystemColors(settings.primary_color, settings.secondary_color);
        }
    }, [settings?.primary_color, settings?.secondary_color]);

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

