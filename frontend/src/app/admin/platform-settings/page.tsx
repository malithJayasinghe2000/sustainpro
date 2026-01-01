'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { Shield } from 'lucide-react';

export default function AdminSettingsPage() {
    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            Admin Settings
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Platform-level configuration and maintenance
                        </p>
                    </div>
                </div>

                <div className="p-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground min-h-[400px] bg-card/50">
                    <Shield className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-medium text-lg">Platform Administration</p>
                    <p className="text-sm mt-1 opacity-70">Advanced system configuration coming soon.</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
