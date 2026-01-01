'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { User } from 'lucide-react';

export default function ProfilePage() {
    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto">
                <div className="mb-6">
                    <h1 className="page-header-title">
                        <User className="w-7 h-7 text-primary" />
                        User Profile
                    </h1>
                    <p className="page-header-subtext">Manage your account settings and preferences.</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[400px]">
                    <div className="p-4 rounded-full bg-muted mb-4">
                        <span className="text-2xl">👤</span>
                    </div>
                    <h3 className="text-lg font-medium text-foreground">Profile Settings</h3>
                    <p className="text-muted-foreground max-w-sm mt-2">
                        User details, password management, and notification preferences.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
