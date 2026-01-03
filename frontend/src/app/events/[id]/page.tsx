'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Calendar, MapPin, Clock, Settings, ArrowLeft, Edit, Trash2, Archive, Layers, Shield, Heart, Zap, Users, ArrowRight } from 'lucide-react';
import { eventsApi, departmentsApi } from '@/lib/api';
import DepartmentsSelector from '@/components/DepartmentsSelector';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Helper for dynamic icons
const ICON_MAP: Record<string, any> = {
    Shield, Heart, Zap, Users, Settings, Layers
};

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<any>(null);
    const [departments, setDepartments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'overview' | 'settings'>('dashboard');
    const [isDeptSelectorOpen, setIsDeptSelectorOpen] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchEventData();
        }
    }, [params.id]);

    const fetchEventData = async () => {
        try {
            setIsLoading(true);
            const [eventData, deptsData] = await Promise.all([
                eventsApi.getById(params.id as string),
                departmentsApi.getByEvent(params.id as string)
            ]);
            setEvent(eventData);
            setDepartments(deptsData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load event data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddDepartment = async (template: any) => {
        try {
            // Check if this template is already added to the event
            const alreadyExists = departments.some(
                dept => dept.template_origin_id === template.id
            );

            if (alreadyExists) {
                toast.error('This department has already been added to this event');
                return;
            }

            const newDept = await departmentsApi.create({
                event_id: event.id,
                name: template.name,
                description: template.description,
                icon: template.icon,
                color: template.color,
                template_origin_id: template.id
            });

            setDepartments([newDept, ...departments]);
            setIsDeptSelectorOpen(false);
            toast.success(`${newDept.name} added successfully`);
        } catch (error: any) {
            console.error('Add department error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to add department';
            toast.error(errorMessage);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await eventsApi.update(params.id as string, { status: newStatus });
            setEvent({ ...event, status: newStatus });
            toast.success(`Event status updated to ${newStatus}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!deletePassword) {
            toast.error('Please enter your password');
            return;
        }

        try {
            setIsDeleting(true);
            await eventsApi.delete(params.id as string, deletePassword);
            toast.success('Event deleted successfully');
            router.push('/events');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete event');
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
            setDeletePassword('');
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!event) {
        return (
            <DashboardLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <p className="text-muted-foreground">Event not found</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Back button removed as requested */}
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">{event.name}</h1>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    {event.code}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {event.location || 'No location specified'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`pb-3 px-1 border-b-2 transition-colors text-sm font-medium ${activeTab === 'dashboard'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`pb-3 px-1 border-b-2 transition-colors text-sm font-medium ${activeTab === 'overview'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`pb-3 px-1 border-b-2 transition-colors text-sm font-medium flex items-center gap-2 ${activeTab === 'settings'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* Departments Section - Big Cards */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold">Departments</h3>
                                    <p className="text-sm text-muted-foreground">Manage operational units and services</p>
                                </div>
                                <button
                                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    onClick={() => setIsDeptSelectorOpen(true)}
                                >
                                    <Layers className="w-4 h-4" />
                                    Add Department
                                </button>
                            </div>

                            {departments.length === 0 ? (
                                <div className="bg-card border border-border rounded-xl p-12 text-center">
                                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <h3 className="text-lg font-medium mb-2">No departments yet</h3>
                                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                        Departments help organize your event's services and personnel.
                                        Add one from a template to get started.
                                    </p>
                                    <button
                                        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
                                        onClick={() => setIsDeptSelectorOpen(true)}
                                    >
                                        + Add First Department
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {departments.map((dept) => {
                                        const Icon = ICON_MAP[dept.icon] || Layers;
                                        return (
                                            <div
                                                key={dept.id}
                                                className="bg-card hover:bg-muted/30 border border-border rounded-xl p-6 transition-all hover:shadow-md cursor-pointer group flex flex-col h-full"
                                                onClick={() => router.push(`/events/${event.id}/departments/${dept.id}`)}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div
                                                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                                        style={{
                                                            backgroundColor: `${dept.color || '#3B82F6'}15`,
                                                            color: dept.color || '#3B82F6'
                                                        }}
                                                    >
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                </div>

                                                <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{dept.name}</h4>
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                                                    {dept.description || 'No description provided for this department.'}
                                                </p>

                                                <div className="pt-4 border-t border-border mt-auto flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" /> 0 Staff
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Zap className="w-3 h-3" /> {dept.services_count || 0} Services
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Quick Add Card */}
                                    <button
                                        onClick={() => setIsDeptSelectorOpen(true)}
                                        className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px] transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                                            <Layers className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                        <h4 className="font-medium mb-1">Add Department</h4>
                                        <p className="text-xs text-muted-foreground">From template</p>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Info */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card border border-border rounded-lg p-6">
                                <h3 className="font-semibold text-base mb-6">Event Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</dt>
                                        <dd className="text-sm text-foreground">{event.description || 'No description provided'}</dd>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Event Type</dt>
                                            <dd className="text-sm font-medium text-foreground">{event.event_type || 'CULTURAL_FESTIVAL'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</dt>
                                            <dd className="mt-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${event.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    event.status === 'PLANNING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                    {event.status}
                                                </span>
                                            </dd>
                                        </div>
                                    </div>

                                    {event.start_date && (
                                        <div>
                                            <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Schedule</dt>
                                            <dd className="text-sm text-foreground">
                                                {format(new Date(event.start_date), 'MMMM do, yyyy')}
                                                {event.end_date && ` - ${format(new Date(event.end_date), 'MMMM do, yyyy')}`}
                                            </dd>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <div className="bg-card border border-border rounded-lg p-6">
                                <h3 className="font-semibold text-base mb-4">Quick Actions</h3>
                                <div className="space-y-2">
                                    <button className="w-full flex items-center justify-start gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm">
                                        <Edit className="w-4 h-4" />
                                        Edit Event
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(event.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE')}
                                        className="w-full flex items-center justify-start gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
                                    >
                                        <Archive className="w-4 h-4" />
                                        {event.status === 'ACTIVE' ? 'Archive' : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-3xl">
                        <div className="bg-card border border-border rounded-xl p-6 !shadow-none space-y-6">
                            <div>
                                <h3 className="font-semibold mb-4">Event Configuration</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Manage event status, settings, and danger zone actions.
                                </p>
                            </div>

                            {/* Status Management */}
                            <div className="border-t border-border pt-6">
                                <label className="text-sm font-medium mb-2 block">Event Status</label>
                                <div className="flex gap-2">
                                    {['PLANNING', 'ACTIVE', 'ARCHIVED'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(status)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${event.status === status
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="border-t border-destructive/20 pt-6 mt-6">
                                <h4 className="font-semibold text-destructive mb-2">Danger Zone</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Permanent actions that cannot be undone.
                                </p>
                                <button
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 inline mr-2" />
                                    Delete Event
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                {showDeleteDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 !shadow-xl">
                            <h3 className="text-lg font-semibold text-destructive mb-2 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" />
                                Delete Event
                            </h3>
                            <div className="space-y-3 mb-4">
                                <p className="text-sm text-foreground">
                                    This action cannot be undone. This will permanently delete the event <strong>{event.name}</strong>.
                                </p>
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                                    <p className="text-xs text-destructive font-semibold mb-2">⚠️ This will also delete:</p>
                                    <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                                        <li>All departments and services</li>
                                        <li>All associated devices and data</li>
                                        <li><strong className="text-destructive">Users who only have roles in this event</strong></li>
                                    </ul>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="text-sm font-medium mb-2 block">
                                    Enter your password to confirm
                                </label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Your password"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-destructive/50"
                                    onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => {
                                        setShowDeleteDialog(false);
                                        setDeletePassword('');
                                    }}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting || !deletePassword}
                                    className="px-4 py-2 bg-destructive text-white hover:bg-destructive/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isDeleting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {isDeleting ? 'Deleting...' : 'Delete Event'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Template Selector Modal */}
            <DepartmentsSelector
                isOpen={isDeptSelectorOpen}
                onClose={() => setIsDeptSelectorOpen(false)}
                onSelect={handleAddDepartment}
            />
        </DashboardLayout>
    );
}
