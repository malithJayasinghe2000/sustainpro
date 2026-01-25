'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import WidgetLibraryManager from '@/components/dashboard/WidgetLibraryManager';

export default function WidgetsPage() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Strict Super Admin Access
        if (user && !user.is_super_admin) {
            router.push('/dashboard');
        }
    }, [user, router]);

    if (!user?.is_super_admin) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                        <p className="text-muted-foreground">You don't have permission to access this page.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <WidgetLibraryManager />
        </DashboardLayout>
    );
}
