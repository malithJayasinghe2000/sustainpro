'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, Clock, Settings, ArrowLeft, Edit, Trash2, Archive, Layers, Shield, Heart, Zap, Users, ArrowRight, UserPlus, Save, Image as ImageIcon, Play, Square } from 'lucide-react';
import { eventsApi, departmentsApi, usersApi, getImageUrl } from '@/lib/api';
import AddDepartmentWizard from '@/components/AddDepartmentWizard';
import { ICON_MAP } from '@/lib/constants';
import ImageUpload from '@/components/ImageUpload';
import { format } from 'date-fns';
import { toast } from 'sonner';

import Modal from '@/components/Modal';
import GoogleMap from '@/components/GoogleMap';

export default function EventDetailPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<any>(null);

    const canUpdate = user?.is_super_admin || user?.permissions?.includes('events.update');
    const canUpdateStatus = user?.is_super_admin || user?.permissions?.includes('events.status');
    const canDelete = user?.is_super_admin || user?.permissions?.includes('events.delete');
    const canEndEvent = user?.is_super_admin || user?.permissions?.includes('events.end');
    const canRequestEnd = user?.permissions?.includes('events.endrequest') ||
        (!canEndEvent && user?.permissions?.includes('events.status'));
    const canRequestDelete = user?.permissions?.includes('events.deleterequest') ||
        (!canDelete && canUpdate);

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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'overview' | 'settings' | 'users'>('dashboard');
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // User Management State
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEndEventModalOpen, setIsEndEventModalOpen] = useState(false);
    const [isDeleteRequestModalOpen, setIsDeleteRequestModalOpen] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchEventData();
        }
    }, [params.id]);

    const [timeLeft, setTimeLeft] = useState<string>('');

    // Timer Logic
    useEffect(() => {
        if (!event?.end_date) return;
        const getUserTimezone = () => {
            if (typeof window === 'undefined') return 'Asia/Dubai';
            return localStorage.getItem('userTimezone') || 'Asia/Dubai';
        };

        const calculateTimeLeft = () => {
            const userTZ = getUserTimezone();
            const now = new Date();
            const end = new Date(event.end_date);
            const diff = end.getTime() - now.getTime();

            if (diff <= 0) {
                if (event.status === 'ACTIVE') {
                    handleStatusChange('END');
                }
                return '00:00:00';
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            const dayString = days > 0 ? `${days}d ` : '';
            return `${dayString}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        let timer: NodeJS.Timeout;
        if (event.status === 'ACTIVE') {
            setTimeLeft(calculateTimeLeft());
            timer = setInterval(() => {
                setTimeLeft(calculateTimeLeft());
            }, 1000);
        } else if (event.status === 'END') {
            setTimeLeft('Event Ended');
        } else {
            setTimeLeft(calculateTimeLeft());
        }
        return () => { if (timer) clearInterval(timer); };
    }, [event?.status, event?.end_date]);

    const handleStartEvent = () => {
        if (!event?.start_date || !event?.end_date) {
            toast.error('Please set start and end dates first');
            return;
        }
        handleStatusChange('ACTIVE');
    };

    const getUserTZ = () => localStorage.getItem('userTimezone') || 'Asia/Dubai';

    const utcToLocalInput = (utcDateStr: string | null): string => {
        if (!utcDateStr) return '';
        const date = new Date(utcDateStr);
        const userTZ = getUserTZ();
        const formatter = new Intl.DateTimeFormat('sv-SE', {
            timeZone: userTZ, year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false,
        });
        const formatted = formatter.format(date);
        return formatted.replace(' ', 'T');
    };

    const localInputToUTC = (localDateStr: string | null): string | null => {
        if (!localDateStr) return null;
        const userTZ = getUserTZ();
        const [datePart, timePart] = localDateStr.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        const referenceDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
        const tzFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTZ, year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false,
        });
        const tzParts = tzFormatter.formatToParts(referenceDate);
        const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0');
        const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');
        const tzDay = parseInt(tzParts.find(p => p.type === 'day')?.value || '1');
        let offsetMinutes = (tzHour * 60 + tzMinute) - (hour * 60 + minute);
        if (tzDay !== day) {
            offsetMinutes += (tzDay > day ? 1 : -1) * 24 * 60;
        }
        const utcTime = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
        utcTime.setMinutes(utcTime.getMinutes() - offsetMinutes);
        return utcTime.toISOString();
    };

    useEffect(() => {
        if (event) {
            setFormData({
                name: event.name || '',
                description: event.description || '',
                location: event.location || '',
                coordinates: event.coordinates || { lat: 25.075908, lng: 55.1453303 },
                start_date: utcToLocalInput(event.start_date),
                end_date: utcToLocalInput(event.end_date),
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

    const handleWizardSuccess = (newDept: any) => {
        setDepartments([newDept, ...departments]);
        setIsWizardOpen(false);
        // Toast is already handled in wizard
    };

    const handleSaveDetails = async () => {
        if (!canUpdate) return;
        try {
            setIsSaving(true);
            const updateData = {
                ...formData,
                start_date: localInputToUTC(formData.start_date),
                end_date: localInputToUTC(formData.end_date),
                image_url: formData.banner_url
            };
            await eventsApi.update(params.id as string, updateData);
            await fetchEventData();
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
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">{event.name}</h1>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    {event.code}
                                </span>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${event.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    event.status === 'END' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                    }`}>
                                    {event.status}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {event.location || 'No location specified'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {(event.status === 'ACTIVE' || event.status === 'PLANNING') && timeLeft && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm">
                                <Clock className="w-4 h-4 text-primary animate-pulse" />
                                <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                                    {timeLeft}
                                </span>
                            </div>
                        )}
                        {canUpdateStatus && event.status === 'PLANNING' && (
                            <button
                                onClick={handleStartEvent}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Start Event
                            </button>
                        )}
                        {canEndEvent && event.status === 'ACTIVE' && (
                            <button
                                onClick={() => setIsEndEventModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <Square className="w-4 h-4 fill-current" />
                                End Event
                            </button>
                        )}
                        {!canEndEvent && canRequestEnd && event.status === 'ACTIVE' && !event.end_requested && (
                            <button
                                onClick={() => setIsEndEventModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <Square className="w-4 h-4" />
                                Request End
                            </button>
                        )}
                        {event.delete_requested && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg border border-destructive/50 font-medium">
                                <Trash2 className="w-4 h-4" />
                                Delete Requested
                            </div>
                        )}
                        {!event.delete_requested && event.status === 'ACTIVE' && event.end_requested && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-orange-700 dark:bg-orange-700 text-white rounded-lg border border-orange-300 dark:border-orange-700 font-medium">
                                <Clock className="w-4 h-4" />
                                End Requested
                            </div>
                        )}
                        {event.status === 'END' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg border border-border">
                                <Square className="w-4 h-4 fill-current" />
                                Event Ended
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-border">
                    <div className="flex gap-6">
                        {['dashboard', 'overview', 'settings', 'users'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`pb-3 px-1 border-b-2 transition-colors text-sm font-medium capitalize ${activeTab === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content: Dashboard */}
                {activeTab === 'dashboard' && (
                    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold">Departments &amp; Map</h3>
                                <p className="text-sm text-muted-foreground">Overview of operational zones</p>
                            </div>
                            {(user?.is_super_admin || user?.permissions?.includes('departments.create')) && (
                                <button
                                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    onClick={() => setIsWizardOpen(true)}
                                >
                                    <Layers className="w-4 h-4" />
                                    Add Department
                                </button>
                            )}
                        </div>
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                            <div className="lg:col-span-1 overflow-y-auto pr-2 h-full scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                {departments.length === 0 ? (
                                    <div className="bg-card border border-border rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
                                        <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <h3 className="text-lg font-medium mb-2">No departments</h3>
                                        <p className="text-muted-foreground text-sm mb-6"> Add a department to see it on the list and map. </p>
                                        {(user?.is_super_admin || user?.permissions?.includes('departments.create')) && (
                                            <button className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors" onClick={() => setIsWizardOpen(true)}> + Add Department </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4 pb-4">
                                        {departments
                                            .filter(dept => {
                                                // Admins and Event Managers see all
                                                if (user?.is_super_admin || user?.roles?.some((r: any) => { const role = typeof r === 'string' ? r : r.role; return ['ORG_ADMIN', 'EVENT_MANAGER'].includes(role); })) return true;
                                                // Specific Department Heads/Staff see only their assigned departments
                                                return (user as any)?.deptIds?.includes(dept.id);
                                            })
                                            .map((dept) => {
                                                const displayIcon = dept.template?.icon || dept.icon;
                                                const displayColor = dept.template?.color || dept.color;
                                                const displayName = dept.template?.name || dept.name;
                                                const displayDesc = dept.template?.description || dept.description;
                                                const Icon = ICON_MAP[displayIcon] || Layers;
                                                const hasCoordinates = dept.coordinates?.points && dept.coordinates.points.length > 0;
                                                return (
                                                    <div key={dept.id} className="bg-card hover:bg-muted/30 border border-border rounded-xl p-4 transition-all hover:shadow-md cursor-pointer group flex flex-col" onClick={() => router.push(`/events/${event.id}/departments/${dept.id}`)}>
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105" style={{ backgroundColor: `${displayColor || '#3B82F6'}15`, color: displayColor || '#3B82F6' }}>
                                                                    <Icon className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-base group-hover:text-primary transition-colors">{displayName}</h4>
                                                                    {hasCoordinates ? (
                                                                        <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5" title={dept.location_name || "Location Mapped"}> <MapPin className="w-3 h-3" /> <span className="truncate max-w-[100px]">{dept.location_name || 'Mapped'}</span> </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"> <MapPin className="w-3 h-3" /> <span>No location</span> </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity"> <ArrowRight className="w-4 h-4 text-muted-foreground" /> </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3"> {displayDesc || 'No description provided.'} </p>
                                                        <div className="pt-3 border-t border-border mt-auto flex items-center justify-between text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1"> <Users className="w-3 h-3" /> {dept.staff_count || 0} Staff </span>
                                                            <span className="flex items-center gap-1"> <Zap className="w-3 h-3" /> {dept.services_count || 0} Services </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        {(user?.is_super_admin || user?.permissions?.includes('departments.create')) && (
                                            <button onClick={() => setIsWizardOpen(true)} className="w-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all group">
                                                <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors"> <Layers className="w-4 h-4" /> </div>
                                                <span className="font-medium text-sm">Add New Department</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="lg:col-span-2 h-full rounded-xl overflow-hidden border border-border bg-muted/10 relative shadow-sm">
                                <GoogleMap
                                    lat={Number(event.coordinates?.lat) || 25.2048}
                                    lng={Number(event.coordinates?.lng) || 55.2708}
                                    className="h-full w-full"
                                    readOnly={true}
                                    polygons={departments.filter(d => {
                                        // Same filtering logic for map
                                        if (user?.is_super_admin || user?.roles?.some((r: any) => { const role = typeof r === 'string' ? r : r.role; return ['ORG_ADMIN', 'EVENT_MANAGER'].includes(role); })) return true;
                                        return (user as any)?.deptIds?.includes(d.id);
                                    })
                                        .filter(d => d.coordinates?.points && Array.isArray(d.coordinates.points) && d.coordinates.points.length >= 3).map(d => ({
                                            id: d.id,
                                            points: d.coordinates.points,
                                            color: d.color || d.template?.color || '#3B82F6',
                                            name: d.location_name || d.name || d.template?.name || 'Unnamed Department',
                                            onClick: () => router.push(`/events/${event.id}/departments/${d.id}`)
                                        }))}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Content: Overview */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${event.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{event.status}</span>
                                            </dd>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {(canUpdate || canDelete) && (
                            <div className="space-y-6">
                                <div className="bg-card border border-border rounded-lg p-6">
                                    <h3 className="font-semibold text-base mb-6">Quick Actions</h3>
                                    <div className="space-y-2">
                                        {canUpdate && (
                                            <button className="w-full flex items-center justify-start gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"> <Edit className="w-4 h-4" /> Edit Event </button>
                                        )}
                                        {canDelete && (
                                            <button onClick={() => handleDelete()} className="w-full flex items-center justify-start gap-2 px-4 py-2 border border-border rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-sm"> <Trash2 className="w-4 h-4" /> Delete Event </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Content: Settings (Reconstructed Basic) */}
                {activeTab === 'settings' && (
                    <div className="bg-card border border-border rounded-xl p-6 max-w-2xl">
                        <h3 className="font-semibold text-lg mb-6">Event Settings</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Event Name</label>
                                <input type="text" disabled={!canUpdate} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea disabled={!canUpdate} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 border rounded-md bg-background min-h-[100px] disabled:opacity-50 disabled:cursor-not-allowed" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Start Date</label>
                                    <input type="datetime-local" disabled={!canUpdate} value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="w-full p-2 border rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">End Date</label>
                                    <input type="datetime-local" disabled={!canUpdate} value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="w-full p-2 border rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed" />
                                </div>
                            </div>
                            {canUpdate && (
                                <button disabled={isSaving} onClick={handleSaveDetails} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg mt-4 flex items-center gap-2">
                                    {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Content: Users */}
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
                                    <UserPlus className="w-4 h-4" />
                                    Add User
                                </button>
                            )}
                        </div>
                        <div className="p-6">
                            {users.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">No users found.</div>
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
                                                        <span key={r.role} className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"> {r.role.replace('_', ' ')} </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Modals */}
            <Modal isOpen={isEndEventModalOpen} onClose={() => setIsEndEventModalOpen(false)} title="End Event" variant="destructive" footer={<button onClick={() => setIsEndEventModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg">Cancel</button>}>
                <div className="space-y-4">
                    <p>Are you sure you want to end this event?</p>
                    {canEndEvent ? (
                        <button onClick={async () => { await eventsApi.endEvent(event.id); setIsEndEventModalOpen(false); toast.success('Event ended'); fetchEventData(); }} className="w-full bg-destructive text-white px-4 py-2 rounded-lg">End Event Now</button>
                    ) : (
                        <button onClick={async () => { await eventsApi.requestEnd(event.id); setIsEndEventModalOpen(false); toast.success('Request sent'); fetchEventData(); }} className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg">Request End</button>
                    )}
                </div>
            </Modal>

            <AddDepartmentWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                eventId={event.id}
                organizationId={event.organization_id}
                eventCoordinates={event.coordinates}
                onSuccess={handleWizardSuccess}
                existingDepartments={departments}
            />

        </DashboardLayout>
    );
}
