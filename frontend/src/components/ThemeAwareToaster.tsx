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
                className: 'font-sans',
                style: {
                    border: '1px solid hsl(var(--border))',
                },
                duration: 4000,
            }}
        />
    );
}
