'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { FileText } from 'lucide-react';

export default function GlobalReportsPage() {
    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="w-6 h-6 text-primary" />
                            Global Reports
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Cross-organization analytics and system-wide insights
                        </p>
                    </div>
                </div>

                <div className="p-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground min-h-[400px] bg-card/50">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-medium text-lg">Global Reporting Dashboard</p>
                    <p className="text-sm mt-1 opacity-70">Analytics modules are currently under development.</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
