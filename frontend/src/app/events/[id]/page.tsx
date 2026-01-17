'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, Clock, Settings, ArrowLeft, Edit, Trash2, Archive, Layers, Shield, Heart, Zap, Users, ArrowRight, UserPlus, Save, Image as ImageIcon } from 'lucide-react';
import { eventsApi, departmentsApi, usersApi, getImageUrl } from '@/lib/api';
import DepartmentsSelector from '@/components/DepartmentsSelector';
import ImageUpload from '@/components/ImageUpload';
import { format } from 'date-fns';
import { toast } from 'sonner';

import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { ssr: false });

// Helper for dynamic icons
const ICON_MAP: Record<string, any> = {
    Shield, Heart, Zap, Users, Settings, Layers
};

export default function EventDetailPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<any>(null);

    const canUpdate = user?.is_super_admin || user?.permissions?.includes('events.update');
    const canUpdateStatus = user?.is_super_admin || user?.permissions?.includes('events.status');
    const canDelete = user?.is_super_admin || user?.permissions?.includes('events.delete');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        coordinates: { lat: 0, lng: 0 },
        start_date: '',
        end_date: '',
        banner_url: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'overview' | 'settings'>('dashboard');
    const [isDeptSelectorOpen, setIsDeptSelectorOpen] = useState(false);
    // User Management State
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchEventData();
        }
    }, [params.id]);



    useEffect(() => {
        if (event) {
            setFormData({
                name: event.name || '',
                description: event.description || '',
                location: event.location || '',
                coordinates: event.coordinates || { lat: 25.075908, lng: 55.1453303 }, // Default to Dubai if missing
                start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
                end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
                banner_url: event.image_url || ''
            });
        }
    }, [event]);

    const fetchEventData = async () => {
        try {
            setIsLoading(true);
            const [eventData, deptsData, usersResponse] = await Promise.all([
                eventsApi.getById(params.id as string),
                departmentsApi.getByEvent(params.id as string),
                usersApi.getAll({ event_id: params.id as string })
            ]);
            setEvent(eventData);
            setDepartments(deptsData);
            setUsers(usersResponse.data || []);
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

    const handleLocationSelect = (lat: number, lng: number, locationName?: string) => {
        if (!canUpdate) return;
        setFormData(prev => ({
            ...prev,
            coordinates: { lat, lng },
            location: locationName || prev.location
        }));
    };

    const handleSaveDetails = async () => {
        if (!canUpdate) return;
        try {
            setIsSaving(true);
            const updateData = {
                ...formData,
                start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
                end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
                image_url: formData.banner_url
            };
            await eventsApi.update(params.id as string, updateData);
            setEvent({ ...event, ...formData });
            toast.success('Event details updated');
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Failed to update event');
        } finally {
            setIsSaving(false);
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

    const handleCreateUser = () => {
        if (!event?.organization_id || !event?.id) {
            toast.error('Event information missing');
            return;
        }
        router.push(`/users/new?org=${event.organization_id}&event=${event.id}`);
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
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`pb-3 px-1 border-b-2 transition-colors text-sm font-medium flex items-center gap-2 ${activeTab === 'users'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Users
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

                        {/* Right Column: Team Members & Quick Actions */}
                        <div className="space-y-6">
                            {/* Team Members */}
                            <div className="bg-card border border-border rounded-lg p-6">
                                <h3 className="font-semibold text-base mb-6 flex items-center justify-between">
                                    <span>Team Members</span>
                                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">{users.length} Users</span>
                                </h3>

                                {users.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm">
                                        No users assigned to this event.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {users.map((user: any) => (
                                            <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                                                    {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">{user.full_name || 'Unnamed User'}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {user.roles?.filter((r: any) => r.event_id === event.id).map((r: any) => (
                                                            <span key={r.role} className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                                {r.role.replace('_', ' ')}
                                                            </span>
                                                        ))}
                                                        {(!user.roles || user.roles.length === 0) && (
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">Member</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quick Actions */}
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

                {activeTab === 'users' && (
                    <div className="bg-card border border-border rounded-xl shadow-sm">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Event Users
                            </h3>
                            {canUpdate && (
                                <button
                                    onClick={handleCreateUser}
                                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <UserPlus className="w-4 h-4" /> Add User
                                </button>
                            )}
                        </div>
                        {isLoading ? (
                            <div className="p-10 flex justify-center">
                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : users.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">User</th>
                                            <th className="px-6 py-4 font-medium">Role</th>
                                            <th className="px-6 py-4 font-medium">Status</th>
                                            <th className="px-6 py-4 font-medium">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {users.map((u) => (
                                            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {u.full_name?.charAt(0) || u.email.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-foreground">{u.full_name || 'Unnamed User'}</div>
                                                            <div className="text-xs text-muted-foreground">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.roles?.filter((r: any) => r.event_id === event.id).map((r: any) => (
                                                        <span key={r.role} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border bg-blue-500/10 text-blue-600 border-blue-500/20 mr-2">
                                                            {r.role.replace('_', ' ')}
                                                        </span>
                                                    ))}
                                                    {(!u.roles || u.roles.length === 0) && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border bg-gray-100 text-gray-600">
                                                            Member
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${u.is_active
                                                        ? 'bg-green-500/5 text-green-600 border-green-500/20'
                                                        : 'bg-gray-500/5 text-gray-500 border-gray-500/20'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                        {u.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No users assigned to this event.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-card border border-border rounded-xl p-6 !shadow-none space-y-8">
                                {/* Event Configuration Form */}
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="font-semibold">Event Details</h3>
                                            <p className="text-sm text-muted-foreground">Manage basic event information.</p>
                                        </div>
                                        {canUpdate && (
                                            <button
                                                onClick={handleSaveDetails}
                                                disabled={isSaving}
                                                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                <Save className="w-4 h-4" />
                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid gap-6">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Event Name</label>
                                            <input
                                                type="text"
                                                disabled={!canUpdate}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-border rounded-lg bg-background disabled:opacity-50 disabled:bg-muted"
                                                placeholder="Enter event name"
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Description</label>
                                            <textarea
                                                disabled={!canUpdate}
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full px-3 py-2 border border-border rounded-lg bg-background min-h-[100px] disabled:opacity-50 disabled:bg-muted"
                                                placeholder="Enter event description"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Start Date</label>
                                                <input
                                                    type="datetime-local"
                                                    disabled={!canUpdate}
                                                    value={formData.start_date}
                                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background disabled:opacity-50 disabled:bg-muted"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">End Date</label>
                                                <input
                                                    type="datetime-local"
                                                    disabled={!canUpdate}
                                                    value={formData.end_date}
                                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background disabled:opacity-50 disabled:bg-muted"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Location</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    disabled={!canUpdate}
                                                    value={formData.location}
                                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                    className="w-full pl-9 px-3 py-2 border border-border rounded-lg bg-background disabled:opacity-50 disabled:bg-muted"
                                                    placeholder="Event location (e.g. Dubai Internet City)"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Management */}
                                <div className="border-t border-border pt-6">
                                    <h4 className="font-semibold mb-4">Event Status</h4>
                                    <div className="flex gap-2">
                                        {['PLANNING', 'ACTIVE', 'ARCHIVED'].map(status => (
                                            <button
                                                key={status}
                                                disabled={!canUpdateStatus}
                                                onClick={() => handleStatusChange(status)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${event.status === status
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                    } ${!canUpdateStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                    {!canUpdateStatus && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            You do not have permission to change event status.
                                        </p>
                                    )}
                                </div>

                                {/* Danger Zone */}
                                {canDelete && (
                                    <div className="border-t border-destructive/20 pt-6">
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
                                )}
                            </div>
                        </div>

                        {/* Right Column: Media & Map */}
                        <div className="space-y-6">
                            {/* Event Banner */}
                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-primary" />
                                    Event Banner
                                </h3>
                                {canUpdate ? (
                                    <ImageUpload
                                        label=""
                                        value={formData.banner_url}
                                        onChange={(url) => setFormData({ ...formData, banner_url: url })}
                                        folder="events"
                                        placeholder="Upload event banner"
                                    />
                                ) : (
                                    <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
                                        {formData.banner_url ? (
                                            <img
                                                src={getImageUrl(formData.banner_url) || ''}
                                                alt="Event Banner"
                                                className="w-full h-auto object-cover max-h-48"
                                            />
                                        ) : (
                                            <div className="p-8 text-center text-muted-foreground text-sm">
                                                No banner image set.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Location Map */}
                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    Location Map
                                </h3>
                                <div className="rounded-lg overflow-hidden border border-border bg-muted/30 h-[400px] relative">
                                    <LeafletMap
                                        lat={formData.coordinates?.lat}
                                        lng={formData.coordinates?.lng}
                                        onLocationSelect={canUpdate ? handleLocationSelect : undefined}
                                        readOnly={!canUpdate}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Map updates automatically based on the location field.
                                </p>
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


        </DashboardLayout >
    );
}
