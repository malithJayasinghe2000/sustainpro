'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
            <div className="w-full max-w-md text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
                    <div className="w-20 h-20 bg-card border border-destructive/30 rounded-full flex items-center justify-center shadow-lg relative z-10">
                        <ShieldAlert className="w-10 h-10 text-destructive" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight uppercase text-foreground">Access Denied</h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        You do not have the required permissions to view this page.
                        If you believe this is an error, please contact your system administrator.
                    </p>
                </div>

                <div className="pt-4 flex justify-center">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-sm hover:bg-primary/90 transition-all shadow-sm group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Go Back
                    </button>
                    {/* Optional: Home button backup if history is empty or looped */}
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="ml-3 inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-sm hover:bg-secondary/80 transition-all"
                    >
                        Dashboard
                    </button>
                </div>
            </div>

            <div className="absolute bottom-8 text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
                Error 403 • Insufficient Privileges
            </div>
        </div>
    );
}
