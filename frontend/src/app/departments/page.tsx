'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { departmentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
    Layers,
    MapPin,
    Users,
    AlertCircle,
    Calendar,
    ArrowRight,
    Clock,
    Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { applyOrganizationTheme } from '@/lib/theme-utils';
import { getPrimaryColor } from '@/lib/theme-parser';

export default function MyDepartmentsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { settings } = useSettings(); // Use system settings for fallback
    const [departments, setDepartments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            setIsLoading(true);
            const data = await departmentsApi.getMyDepartments();
            setDepartments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load departments:', error);
            toast.error('Failed to load your departments');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to get color (Org Color -> System Primary -> Dept Color -> Default)
    const getCardColor = (deptColor: string | null) => {
        // 1. Check Organization Theme first (highest priority for branding)
        if (user?.theme_config) {
            const orgPrimary = getPrimaryColor(user.theme_config, '');
            if (orgPrimary) return orgPrimary;
        }

        // 2. Check System Settings
        if (settings?.primary_color) return settings.primary_color;

        // 3. Fallback to Department specific color
        if (deptColor) return deptColor;

        // 4. Final default
        return '#3B82F6';
    };

    // Format Date Range
    const formatEventDates = (start?: string, end?: string) => {
        if (!start) return 'Dates Not Set';
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : null;

        const dateFormat = 'MMM d, yyyy';
        const timeFormat = 'h:mm a';

        try {
            if (endDate) {
                return `${format(startDate, dateFormat)} - ${format(endDate, dateFormat)}`;
            }
            return `Starts ${format(startDate, dateFormat)}`;
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const formatEventTime = (start?: string, end?: string) => {
        if (!start) return '';
        try {
            const startDate = new Date(start);
            return format(startDate, 'h:mm a');
        } catch (e) {
            return '';
        }
    };


    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <LoadingSpinner className="" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <span onClick={() => router.push('/dashboard')} className="hover:text-primary cursor-pointer transition-colors">Dashboard</span>
                    <span>/</span>
                    <span className="font-medium text-foreground">My Departments</span>
                </div>

                <div className="flex flex-col gap-2 mb-8">
                    <h1 className="text-3xl font-bold">My Departments</h1>
                    <p className="text-muted-foreground">
                        Manage departments assigned to you.
                    </p>
                </div>

                {departments.length === 0 ? (
                    <div className="text-center py-20 bg-card border border-border rounded-xl">
                        <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <h2 className="text-xl font-semibold mb-2">No Departments Found</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            You don't have any departments assigned to you yet.
                            Departments will appear here once you are assigned as a Department Head.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {departments.map((dept) => {
                            const cardColor = getCardColor(dept.color);
                            return (
                                <div
                                    key={dept.id}
                                    onClick={() => router.push(`/events/${dept.event_id}/departments/${dept.id}`)}
                                    className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
                                >
                                    {/* Card Header / Color Strip */}
                                    <div
                                        className="h-3 w-full"
                                        style={{ backgroundColor: cardColor }}
                                    />

                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="flex items-start justify-between mb-4">
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                                                style={{
                                                    backgroundColor: cardColor,
                                                }}
                                            >
                                                <Layers className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors truncate max-w-[150px]">
                                                    {dept.event_name || 'Unknown Event'}
                                                </div>
                                                {dept.event_status && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${dept.event_status === 'ACTIVE' || dept.event_status === 'RUNNING' ? 'bg-green-500/10 text-green-600 border-green-200' :
                                                        dept.event_status === 'PLANNING' ? 'bg-blue-500/10 text-blue-600 border-blue-200' :
                                                            'bg-gray-100 text-gray-600 border-gray-200'
                                                        }`}>
                                                        {dept.event_status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1" title={dept.name}>
                                            {dept.name}
                                        </h3>

                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-6 min-h-[40px]">
                                            {dept.description || 'No description available.'}
                                        </p>

                                        <div className="mt-auto space-y-4">
                                            {/* Event Details Section */}
                                            <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{formatEventDates(dept.event_start_date, dept.event_end_date)}</span>
                                                </div>
                                                {dept.event_start_date && (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{formatEventTime(dept.event_start_date)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="w-4 h-4" />
                                                    <span>{dept.staff_count || 0} Members</span>
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-border" />
                                                <div className="flex items-center gap-1.5">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span>{dept.services_count || 0} Services</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
}
