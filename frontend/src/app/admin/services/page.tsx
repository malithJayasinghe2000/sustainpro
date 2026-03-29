'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Layers, Activity, Users, Globe, Lock, MoreVertical, Edit, Trash2, ArrowRight, LayoutTemplate, Eye } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import StatsCard from '@/components/StatsCard';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface ServiceTemplate {
    id: string;
    name: string;
    description: string;
    scope: 'GLOBAL' | 'INTERNAL' | 'ORG_SPECIFIC';
    is_public_dashboard_supported: boolean;
    device_models: { id: string, role: string }[];
    created_at: string;
}

export default function ServicesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [services, setServices] = useState<ServiceTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingService, setDeletingService] = useState<ServiceTemplate | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        // Strict Super Admin Access
        if (user && !user.is_super_admin) {
            router.push('/dashboard');
            return;
        }

        if (user?.is_super_admin) {
            fetchServices();
        }
    }, [user, router]);

    const fetchServices = async () => {
        try {
            const response = await servicesApi.getAll();
            setServices(Array.isArray(response) ? response : (response?.data || []));
        } catch (error) {
            toast.error('Failed to load services');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        try {
            await servicesApi.delete(id);
            toast.success('Service deleted successfully');
            fetchServices();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete service');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setDeletingService(null);
        }
    };

    const confirmDelete = (service: ServiceTemplate) => {
        setDeletingService(service);
        setShowDeleteModal(true);
    };

    const filteredServices = services.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground animate-pulse">Loading services...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-8 max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Services</h1>
                        <p className="text-muted-foreground mt-1">Manage reusable IoT service templates and assignments.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search services..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                    {/* Create New Card */}
                    <button
                        onClick={() => router.push('/admin/services/new')}
                        className="group flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/30 transition-all"
                    >
                        <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform mb-4">
                            <Plus className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-semibold">Create Service</h3>
                        <p className="text-sm text-muted-foreground mt-1">Define a new template</p>
                    </button>

                    {filteredServices.map((service) => (
                        <div key={service.id} className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:translate-y-[-2px] transition-all min-h-[300px] flex flex-col">
                            {/* Header Banner */}
                            <div className="h-24 relative overflow-hidden bg-gradient-to-br from-primary/80 via-primary/60 to-primary/40">
                                {service.image_url && (
                                    <Image
                                        src={service.image_url}
                                        alt={service.name}
                                        fill
                                        className="object-cover opacity-30"
                                    />
                                )}
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-soft-light"></div>
                                <div className="absolute top-4 right-4 bg-background/20 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] font-medium text-white uppercase tracking-wider">
                                    {service.scope}
                                </div>
                            </div>

                            {/* Icon */}
                            <div className="absolute top-12 left-6">
                                <div className="w-16 h-16 rounded-xl bg-card shadow-lg overflow-hidden flex items-center justify-center border border-border group-hover:scale-105 transition-transform">
                                    {service.image_url ? (
                                        <Image
                                            src={service.image_url}
                                            alt={service.name}
                                            width={64}
                                            height={64}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <Layers className="w-8 h-8 text-primary" />
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="pt-8 p-6 flex-1 flex flex-col">
                                <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                    {service.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 mb-4">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        <Activity className="w-3 h-3" />
                                        <span>{service.device_models?.length || 0} Models</span>
                                    </div>
                                    {service.is_public_dashboard_supported && (
                                        <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                            <Globe className="w-3 h-3" />
                                            <span>Public</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                                    {service.description || 'No description provided.'}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => router.push(`/admin/services/${service.id}/dashboard`)}
                                            className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                                            title="Build Dashboard"
                                        >
                                            <LayoutTemplate className="w-3.5 h-3.5" />
                                            Dashboard
                                        </button>
                                        <button
                                            onClick={() => router.push(`/admin/services/${service.id}/view`)}
                                            className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-primary transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => router.push(`/admin/services/${service.id}/edit`)}
                                            className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-primary transition-colors"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(service)}
                                            className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-destructive transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/admin/services/${service.id}/view`)}
                                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                    >
                                        Details <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && deletingService && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => { setShowDeleteModal(false); setDeletingService(null); }}
                        />
                        <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-destructive" />
                                </div>
                                <h2 className="text-lg font-bold">Delete Service</h2>
                            </div>

                            <p className="text-sm text-muted-foreground mb-6">
                                Are you sure you want to delete <strong>{deletingService.name}</strong>? 
                                This action cannot be undone.
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowDeleteModal(false); setDeletingService(null); }}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deletingService.id)}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
