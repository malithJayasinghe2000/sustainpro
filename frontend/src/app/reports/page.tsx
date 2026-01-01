'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto">
                <div className="mb-6">
                    <h1 className="page-header-title">
                        <FileText className="w-7 h-7 text-primary" />
                        Reports
                    </h1>
                    <p className="page-header-subtext">View system telemetry and generate analytics reports.</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[400px]">
                    <div className="p-4 rounded-full bg-muted mb-4">
                        <span className="text-2xl">📊</span>
                    </div>
                    <h3 className="text-lg font-medium text-foreground">Analytics Dashboard</h3>
                    <p className="text-muted-foreground max-w-sm mt-2">
                        Charts and data visualization components will be integrated here.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
