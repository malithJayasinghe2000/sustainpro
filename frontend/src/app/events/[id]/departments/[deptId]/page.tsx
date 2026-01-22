'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { departmentsApi, servicesApi, eventsApi } from '@/lib/api';
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
    CheckCircle,
    MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

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

    const [event, setEvent] = useState<any>(null);
    const [department, setDepartment] = useState<any>(null);
    const [departmentServices, setDepartmentServices] = useState<any[]>([]);
    const [availableServices, setAvailableServices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddServiceModal, setShowAddServiceModal] = useState(false);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, [deptId]);

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

    const handleSaveServices = async () => {
        try {
            setIsLoading(true);
            let successCount = 0;
            let failCount = 0;

            for (const serviceId of selectedServices) {
                try {
                    await departmentsApi.addService(deptId, serviceId);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to add service ${serviceId}:`, error);
                    failCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`Successfully added ${successCount} service${successCount > 1 ? 's' : ''}`);
            }
            if (failCount > 0) {
                toast.error(`Failed to add ${failCount} service${failCount > 1 ? 's' : ''}`);
            }

            setShowAddServiceModal(false);
            setSelectedServices([]);
            loadData();
        } catch (error) {
            console.error('Error saving services:', error);
            toast.error('An unexpected error occurred');
            setIsLoading(false);
        }
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
    const assignedServiceIds = departmentServices.map(s => s.service_id || s.id);
    const unassignedServices = availableServices.filter(s => !assignedServiceIds.includes(s.id));

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

                    {departmentServices.length === 0 ? (
                        <div className="text-center py-16 bg-card border border-border rounded-xl">
                            <Zap className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground mb-6">No services assigned yet.</p>
                            <button
                                onClick={() => setShowAddServiceModal(true)}
                                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add First Service
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Service Cards */}
                            {departmentServices.map((service) => (
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

                                    <h4 className="font-bold text-lg mb-2">{service.name || service.service_name}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {service.description || 'No description'}
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
                            <button
                                onClick={() => setShowAddServiceModal(true)}
                                className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[240px] transition-all group"
                            >
                                <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <h4 className="font-medium mb-1">Add Service</h4>
                                <p className="text-xs text-muted-foreground">From template</p>
                            </button>
                        </div>
                    )}
                </div>

                {/* Add Service Modal */}
                {showAddServiceModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-border">
                                <h3 className="font-bold text-lg">Add Service to Department</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Select services to assign to {department.name}
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {unassignedServices.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {unassignedServices.map((service) => {
                                            const isSelected = selectedServices.includes(service.id);
                                            return (
                                                <div
                                                    key={service.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedServices(prev => prev.filter(id => id !== service.id));
                                                        } else {
                                                            setSelectedServices(prev => [...prev, service.id]);
                                                        }
                                                    }}
                                                    className={`p-4 border rounded-lg cursor-pointer transition-all ${isSelected
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected
                                                                ? 'bg-primary border-primary'
                                                                : 'border-muted-foreground'
                                                                }`}>
                                                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />}
                                                            </div>
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-primary/20' : 'bg-primary/10'
                                                                }`}>
                                                                <Layers className="w-5 h-5 text-primary" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold">
                                                                    {service.name}
                                                                </h4>
                                                                <p className="text-sm text-muted-foreground line-clamp-1">
                                                                    {service.description || 'No description'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>All available services have been assigned!</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-border flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowAddServiceModal(false);
                                        setSelectedServices([]);
                                    }}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveServices}
                                    disabled={selectedServices.length === 0}
                                    className={`px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedServices.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
                                        }`}
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Selected ({selectedServices.length})
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
