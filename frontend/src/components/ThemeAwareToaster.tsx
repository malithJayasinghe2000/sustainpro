'use client';

import { useTheme } from "@/contexts/ThemeContext";
import { Toaster as SonnerToaster } from "sonner";

export default function ThemeAwareToaster() {
    const { theme } = useTheme();

    return (
        <SonnerToaster
            position="top-right"
            richColors
            expand={true}
            theme={theme as 'light' | 'dark'}
            toastOptions={{
                className: 'font-sans !z-[9999]',
                style: {
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                    zIndex: 9999,
                },
                duration: 4000,
            }}
            style={{
                zIndex: 9999,
            }}
            offset={80}
        />
    );
}
