'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi } from '@/lib/api'; // Ensure this uses getMyServices
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
    Cpu,
    Activity,
    MapPin,
    Calendar,
    ArrowRight,
    Clock,
    Briefcase,
    Building2,
    Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getPrimaryColor } from '@/lib/theme-parser';

export default function MyServicesPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { settings } = useSettings();
    const [services, setServices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            setIsLoading(true);
            const data = await servicesApi.getMyServices();
            setServices(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load services:', error);
            toast.error('Failed to load your services');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to get color (Org Color -> System Primary -> Default)
    const getCardColor = () => {
        // 1. Check Organization Theme first
        if (user?.theme_config) {
            const orgPrimary = getPrimaryColor(user.theme_config, '');
            if (orgPrimary) return orgPrimary;
        }

        // 2. Check System Settings
        if (settings?.primary_color) return settings.primary_color;

        // 3. Final default
        return '#10B981'; // Emerald Green for Services default
    };

    // Format Date Range
    const formatEventDates = (start?: string, end?: string) => {
        if (!start) return 'Dates Not Set';
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : null;

        const dateFormat = 'MMM d, yyyy';

        try {
            if (endDate) {
                return `${format(startDate, dateFormat)} - ${format(endDate, dateFormat)}`;
            }
            return `Starts ${format(startDate, dateFormat)}`;
        } catch (e) {
            return 'Invalid Date';
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
                    <span className="font-medium text-foreground">My Services</span>
                </div>

                <div className="flex flex-col gap-2 mb-8">
                    <h1 className="text-3xl font-bold">My Services</h1>
                    <p className="text-muted-foreground">
                        Manage services assigned to you.
                    </p>
                </div>

                {services.length === 0 ? (
                    <div className="text-center py-20 bg-card border border-border rounded-xl">
                        <Cpu className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <h2 className="text-xl font-semibold mb-2">No Services Found</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            You don't have any services assigned to you yet.
                            Services will appear here once you are assigned as a Service Supervisor.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((service) => {
                            const cardColor = getCardColor();
                            return (
                                <div
                                    key={service.id}
                                    onClick={() => router.push(`/events/${service.sps_departments?.event_id}/departments/${service.department_id}/services/${service.id}`)}
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
                                                <Activity className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors truncate max-w-[150px]">
                                                    {service.event_name || 'Unknown Event'}
                                                </div>
                                                {service.event_status && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${service.event_status === 'ACTIVE' || service.event_status === 'RUNNING' ? 'bg-green-500/10 text-green-600 border-green-200' :
                                                            service.event_status === 'PLANNING' ? 'bg-blue-500/10 text-blue-600 border-blue-200' :
                                                                'bg-gray-100 text-gray-600 border-gray-200'
                                                        }`}>
                                                        {service.event_status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1" title={service.service_name}>
                                            {service.service_name || service.template_name}
                                        </h3>
                                        <div className="text-xs text-primary font-medium mb-2 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {service.department_name || 'Unknown Dept'}
                                        </div>

                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-6 min-h-[40px]">
                                            {service.template_description || 'No description available.'}
                                        </p>

                                        <div className="mt-auto space-y-4">
                                            {/* Event Details Section */}
                                            <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{formatEventDates(service.event_start_date, service.event_end_date)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
                                                <div className="flex items-center gap-1.5">
                                                    <Cpu className="w-4 h-4" />
                                                    <span>{service.device_count || 0} Devices</span>
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-border" />
                                                <div className="flex items-center gap-1.5">
                                                    <Briefcase className="w-4 h-4" />
                                                    <span>{service.service_type || 'Service'}</span>
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
        </DashboardLayout>
    );
}
