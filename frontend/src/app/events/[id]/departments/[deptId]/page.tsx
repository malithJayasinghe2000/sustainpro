'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { departmentsApi, servicesApi, eventsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { hasRole, ROLES } from '@/lib/roles';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Layers,
    Shield,
    Heart,
    Zap,
    Users,
    Settings,
    MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import AddServiceWizard from '@/components/AddServiceWizard';

// Helper for dynamic icons
const ICON_MAP: Record<string, any> = {
    Shield, Heart, Zap, Users, Settings, Layers
};

import GoogleMap from '@/components/GoogleMap';

interface DepartmentDetailPageProps {
    params: Promise<{ id: string; deptId: string }>;
}

export default function DepartmentDetailPage({ params }: DepartmentDetailPageProps) {
    const { id: eventId, deptId } = use(params);
    const router = useRouter();
    const { user } = useAuth();

    const [event, setEvent] = useState<any>(null);
    const [department, setDepartment] = useState<any>(null);
    const [departmentServices, setDepartmentServices] = useState<any[]>([]);
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddServiceWizard, setShowAddServiceWizard] = useState(false);

    useEffect(() => {
        loadData();
    }, [deptId]);

    // Filter services for SERVICE_SUPERVISOR users
    const getFilteredServices = (services: any[]) => {
        if (!user || !hasRole(user, ROLES.SERVICE_SUPERVISOR)) {
            return services;
        }

        // Get the service IDs that the user is assigned to supervise
        const assignedServiceIds = user.roles
            .filter(role => 
                role.role === ROLES.SERVICE_SUPERVISOR && 
                role.event_id === eventId && 
                role.service_id
            )
            .map(role => role.service_id);

        // Filter services to only show those assigned to this supervisor
        return services.filter(service => 
            assignedServiceIds.includes(service.service_id || service.id)
        );
    };

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [deptData, deptServicesData, allServicesData, eventData] = await Promise.all([
                departmentsApi.getById(deptId),
                departmentsApi.getServices(deptId),
                servicesApi.getAll(),
                eventsApi.getById(eventId)
            ]);

            setDepartment(deptData);
            setEvent(eventData);
            setDepartmentServices(Array.isArray(deptServicesData) ? deptServicesData : (deptServicesData?.data || []));
            setAvailableServices(Array.isArray(allServicesData) ? allServicesData : (allServicesData?.data || []));
        } catch (error) {
            console.error('Failed to load department data:', error);
            toast.error('Failed to load department data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleServiceAdded = (newService: any) => {
        // Refresh data after service is added via wizard
        loadData();
    };

    const handleRemoveService = async (serviceId: string) => {
        if (!confirm('Are you sure you want to remove this service from the department?')) return;

        try {
            await departmentsApi.removeService(deptId, serviceId);
            toast.success('Service removed successfully');
            loadData(); // Refresh
        } catch (error) {
            console.error('Failed to remove service:', error);
            toast.error('Failed to remove service');
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

    if (!department) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-screen gap-4">
                    <h2 className="text-xl font-semibold">Department Not Found</h2>
                    <button
                        onClick={() => router.push(`/events/${eventId}`)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                    >
                        Return to Event
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const Icon = ICON_MAP[department.icon] || Layers;

    // Apply service filtering
    const filteredServices = getFilteredServices(departmentServices);
    const canAddServices = !hasRole(user, ROLES.SERVICE_SUPERVISOR) || user?.is_super_admin;

    return (
        <DashboardLayout>
            <div className="p-8 max-w-[1600px] mx-auto space-y-4">
                {/* Event Header */}
                <div className="flex flex-col gap-4">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <button
                            onClick={() => router.push(`/events/${eventId}`)}
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Event
                        </button>
                        <span>/</span>
                        <span className="text-foreground font-medium">{department.name}</span>
                    </div>

                    {/* Event Info */}
                    {event && (
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold">{event.name}</h2>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-mono">
                                {event.code}
                            </span>
                        </div>
                    )}

                    {/* Department Details & Map */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-border">
                        {/* Left: Info */}
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            <div className="flex items-start gap-4">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                                    style={{
                                        backgroundColor: `${department.color || '#3B82F6'}15`,
                                        color: department.color || '#3B82F6'
                                    }}
                                >
                                    <Icon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold mb-2">{department.name}</h1>
                                    <p className="text-muted-foreground leading-relaxed max-w-2xl">
                                        {department.description || 'Manage services and operations for this department.'}
                                    </p>
                                    {department.location_name && (
                                        <div className="flex items-center gap-2 mt-3 text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg w-fit">
                                            <MapPin className="w-4 h-4 text-primary" />
                                            {department.location_name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Specific Department Map */}
                        <div className="lg:col-span-1 h-[160px] bg-muted/10 rounded-xl overflow-hidden border border-border relative shadow-sm">
                            <GoogleMap
                                lat={Number(event.coordinates?.lat) || 25.2048}
                                lng={Number(event.coordinates?.lng) || 55.2708}
                                className="h-full w-full"
                                readOnly={true}
                                polygons={[{
                                    id: department.id,
                                    points: department.coordinates?.points || [],
                                    color: department.color || '#3B82F6',
                                    name: department.location_name || department.name,
                                }]}
                            />
                            {!department.coordinates?.points?.length && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                                    <p className="text-xs font-medium text-muted-foreground bg-background/80 px-2 py-1 rounded">No map zone defined</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Services Section */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-semibold text-lg">Services</h3>
                            <p className="text-sm text-muted-foreground">
                                Manage services for this department
                            </p>
                        </div>
                    </div>

                    {filteredServices.length === 0 ? (
                        <div className="text-center py-16 bg-card border border-border rounded-xl">
                            <Zap className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground mb-6">
                                {hasRole(user, ROLES.SERVICE_SUPERVISOR) 
                                    ? 'No services assigned to you.' 
                                    : 'No services assigned yet.'}
                            </p>
                            {canAddServices && (
                                <button
                                    onClick={() => setShowAddServiceWizard(true)}
                                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add First Service
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Service Cards */}
                            {filteredServices.map((service) => (
                                <div
                                    key={service.id}
                                    onClick={() => router.push(`/events/${eventId}/departments/${deptId}/services/${service.id}`)}
                                    className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all group relative cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Layers className="w-6 h-6 text-primary" />
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveService(service.service_id || service.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
                                            title="Remove Service"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <h4 className="font-bold text-lg mb-2">{service.sps_service_templates?.name || service.service_name}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {service.sps_service_templates?.description || 'No description'}
                                    </p>

                                    <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                                        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                                            Active
                                        </span>
                                        <span className="text-muted-foreground">{service.scope || 'GLOBAL'}</span>
                                    </div>
                                </div>
                            ))}

                            {/* Add Service Card */}
                            {canAddServices && (
                                <button
                                    onClick={() => setShowAddServiceWizard(true)}
                                    className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[240px] transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                                        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                                    </div>
                                    <h4 className="font-medium mb-1">Add Service</h4>
                                    <p className="text-xs text-muted-foreground">From template</p>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Service Wizard */}
                {canAddServices && (
                    <AddServiceWizard
                        isOpen={showAddServiceWizard}
                        onClose={() => setShowAddServiceWizard(false)}
                        departmentId={deptId}
                        departmentName={department?.name || ''}
                        organizationId={event?.organization_id || ''}
                        eventId={eventId}
                        onSuccess={handleServiceAdded}
                        existingServices={departmentServices}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
