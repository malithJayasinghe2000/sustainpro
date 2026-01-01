'use client';

import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-md text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                    <div className="w-20 h-20 bg-card border border-border rounded-full flex items-center justify-center shadow-lg relative z-10">
                        <FileQuestion className="w-10 h-10 text-muted-foreground" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight uppercase text-foreground">Page Not Found</h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        The resource you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                    </p>
                </div>

                <div className="pt-4 flex justify-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-sm hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <Home className="w-4 h-4" />
                        Return to Dashboard
                    </Link>
                </div>
            </div>

            <div className="absolute bottom-8 text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
                Error 404 • Resource Not Found
            </div>
        </div>
    );
}
