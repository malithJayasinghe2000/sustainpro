'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Initialize with 'light' to avoid mismatch, effect will handle real value
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // This runs on mount
        setMounted(true);

        // Check localStorage OR system preference
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;

        if (savedTheme) {
            setTheme(savedTheme);
            updateDOM(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            updateDOM('dark');
        } else {
            setTheme('light');
            updateDOM('light');
        }
    }, []);

    const updateDOM = (mode: 'light' | 'dark') => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(mode);
        root.style.colorScheme = mode; // This helps with scrollbars and system inputs
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        updateDOM(newTheme);
    };

    // We render children even if not mounted to support SEO/Initial render,
    // but we might get a hydration warning if we used specific theme-dependent UI.
    // Since we rely on CSS variables, the flicker should be handled by the script in layout.tsx.
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
