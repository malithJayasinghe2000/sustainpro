'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, Clock, Settings, ArrowLeft, Edit, Trash2, Archive, Layers, Shield, Heart, Zap, Users, ArrowRight, UserPlus, Save, Image as ImageIcon, Play, Square } from 'lucide-react';
import { eventsApi, departmentsApi, usersApi, getImageUrl } from '@/lib/api';
import DepartmentsSelector from '@/components/DepartmentsSelector';
import DepartmentLocationModal from '@/components/DepartmentLocationModal';
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
    // New permissions for ending events
    const canEndEvent = user?.is_super_admin || user?.permissions?.includes('events.end');
    // Event managers can request end - fallback to events.status if events.endrequest not available
    const canRequestEnd = user?.permissions?.includes('events.endrequest') ||
        (!canEndEvent && user?.permissions?.includes('events.status'));
    // Request delete permission
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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'overview' | 'settings'>('dashboard');
    const [isDeptSelectorOpen, setIsDeptSelectorOpen] = useState(false);
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

    // Timer Logic - Timezone Aware
    useEffect(() => {
        if (!event?.end_date) return;

        // Import timezone utilities dynamically or ensure they are imported at the top
        const getUserTimezone = () => {
            if (typeof window === 'undefined') return 'Asia/Dubai';
            return localStorage.getItem('userTimezone') || 'Asia/Dubai';
        };

        const calculateTimeLeft = () => {
            const userTZ = getUserTimezone();

            // Get the current time in the user's timezone
            const now = new Date();

            // Parse the end_date (stored as UTC in database)
            const end = new Date(event.end_date);

            // Calculate diff in milliseconds (both are in UTC internally, so this is correct)
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
            // Also run immediately
            setTimeLeft(calculateTimeLeft());
            timer = setInterval(() => {
                setTimeLeft(calculateTimeLeft());
            }, 1000);
        } else if (event.status === 'END') {
            setTimeLeft('Event Ended');
        } else {
            setTimeLeft(calculateTimeLeft());
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [event?.status, event?.end_date]);

    const handleStartEvent = () => {
        if (!event?.start_date || !event?.end_date) {
            toast.error('Please set start and end dates first');
            return;
        }
        handleStatusChange('ACTIVE');
    };


    // Get the user's timezone - centralized for consistency
    const getUserTZ = () => localStorage.getItem('userTimezone') || 'Asia/Dubai';

    // Convert UTC date string to datetime-local format in user's timezone
    const utcToLocalInput = (utcDateStr: string | null): string => {
        if (!utcDateStr) return '';

        const date = new Date(utcDateStr);
        const userTZ = getUserTZ();

        // Format date in user's timezone for datetime-local input
        const formatter = new Intl.DateTimeFormat('sv-SE', {
            timeZone: userTZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        // sv-SE locale gives us YYYY-MM-DD HH:mm format
        const formatted = formatter.format(date);
        // Convert "YYYY-MM-DD HH:mm" to "YYYY-MM-DDTHH:mm"
        return formatted.replace(' ', 'T');
    };

    // Convert datetime-local input (in user's timezone) to UTC ISO string for saving
    const localInputToUTC = (localDateStr: string | null): string | null => {
        if (!localDateStr) return null;

        const userTZ = getUserTZ();

        // Parse input: YYYY-MM-DDTHH:mm
        const [datePart, timePart] = localDateStr.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);

        // Create a date string with timezone
        // We need to find what UTC time corresponds to the given local time in userTZ

        // Step 1: Create a reference date to get the timezone offset
        const referenceDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

        // Step 2: Get what time it would be in the target timezone at this UTC time
        const tzFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const tzParts = tzFormatter.formatToParts(referenceDate);
        const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0');
        const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');
        const tzDay = parseInt(tzParts.find(p => p.type === 'day')?.value || '1');

        // Step 3: Calculate the offset between UTC and the timezone
        // The difference tells us how far ahead/behind the timezone is
        let offsetMinutes = (tzHour * 60 + tzMinute) - (hour * 60 + minute);

        // Handle day boundary
        if (tzDay !== day) {
            offsetMinutes += (tzDay > day ? 1 : -1) * 24 * 60;
        }

        // Step 4: Create the UTC date by subtracting the offset
        // If timezone is UTC+4, we need to subtract 4 hours to get UTC
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

    const [showLocationModal, setShowLocationModal] = useState(false);
    const [selectedTemplateForLocation, setSelectedTemplateForLocation] = useState<any>(null);

    const handleDepartmentSelect = (template: any) => {
        setIsDeptSelectorOpen(false);
        // Check if exists
        const alreadyExists = departments.some(
            dept => dept.template_origin_id === template.id
        );

        if (alreadyExists) {
            toast.error('This department has already been added to this event');
            return;
        }

        setSelectedTemplateForLocation(template);
        setShowLocationModal(true);
    };

    const handleAddDepartment = async (template: any, coordinates: any[] = [], locationName: string = '') => {
        try {
            // Check if this template is already added to the event (double check)
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
                location_name: locationName,
                description: template.description,
                icon: template.icon,
                color: template.color,
                template_origin_id: template.id,
                coordinates: { points: coordinates } // Save as JSON
            });

            setDepartments([newDept, ...departments]);
            setShowLocationModal(false);
            setSelectedTemplateForLocation(null);
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
                start_date: localInputToUTC(formData.start_date),
                end_date: localInputToUTC(formData.end_date),
                image_url: formData.banner_url
            };

            await eventsApi.update(params.id as string, updateData);

            // Refetch event data to get the server's response with correct dates
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
                        {/* Back button removed as requested */}
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

                    {/* Right Side Actions & Timer */}
                    <div className="flex items-center gap-4">
                        {/* Timer Display */}
                        {(event.status === 'ACTIVE' || event.status === 'PLANNING') && timeLeft && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm">
                                <Clock className="w-4 h-4 text-primary animate-pulse" />
                                <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                                    {timeLeft}
                                </span>
                            </div>
                        )}

                        {/* Start Button */}
                        {canUpdateStatus && event.status === 'PLANNING' && (
                            <button
                                onClick={handleStartEvent}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Start Event
                            </button>
                        )}

                        {/* End Event Button - For Org Admins/Super Admins */}
                        {canEndEvent && event.status === 'ACTIVE' && (
                            <button
                                onClick={() => setIsEndEventModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <Square className="w-4 h-4 fill-current" />
                                End Event
                            </button>
                        )}

                        {/* Request End Button - For Event Managers */}
                        {!canEndEvent && canRequestEnd && event.status === 'ACTIVE' && !event.end_requested && (
                            <button
                                onClick={() => setIsEndEventModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <Square className="w-4 h-4" />
                                Request End
                            </button>
                        )}

                        {/* Delete Requested Indicator */}
                        {event.delete_requested && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg border border-destructive/50 font-medium">
                                <Trash2 className="w-4 h-4" />
                                Delete Requested
                            </div>
                        )}

                        {/* End Requested Indicator - When request is pending */}
                        {!event.delete_requested && event.status === 'ACTIVE' && event.end_requested && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-orange-700 dark:bg-orange-700 text-white rounded-lg border border-orange-300 dark:border-orange-700 font-medium">
                                <Clock className="w-4 h-4" />
                                End Requested
                            </div>
                        )}

                        {/* End Status Indicator */}
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
                    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold">Departments &amp; Map</h3>
                                <p className="text-sm text-muted-foreground">Overview of operational zones</p>
                            </div>
                            <button
                                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                onClick={() => setIsDeptSelectorOpen(true)}
                            >
                                <Layers className="w-4 h-4" />
                                Add Department
                            </button>
                        </div>

                        {/* Content Grid */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                            {/* Left Side: Departments List (Scrollable) */}
                            <div className="lg:col-span-1 overflow-y-auto pr-2 h-full scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                {departments.length === 0 ? (
                                    <div className="bg-card border border-border rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
                                        <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <h3 className="text-lg font-medium mb-2">No departments</h3>
                                        <p className="text-muted-foreground text-sm mb-6">
                                            Add a department to see it on the list and map.
                                        </p>
                                        <button
                                            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
                                            onClick={() => setIsDeptSelectorOpen(true)}
                                        >
                                            + Add Department
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pb-4">
                                        {departments.map((dept) => {
                                            const displayIcon = dept.template?.icon || dept.icon;
                                            const displayColor = dept.template?.color || dept.color;
                                            const displayName = dept.template?.name || dept.name;
                                            const displayDesc = dept.template?.description || dept.description;
                                            const Icon = ICON_MAP[displayIcon] || Layers;

                                            const hasCoordinates = dept.coordinates?.points && dept.coordinates.points.length > 0;

                                            return (
                                                <div
                                                    key={dept.id}
                                                    className="bg-card hover:bg-muted/30 border border-border rounded-xl p-4 transition-all hover:shadow-md cursor-pointer group flex flex-col"
                                                    onClick={() => router.push(`/events/${event.id}/departments/${dept.id}`)}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                                                                style={{
                                                                    backgroundColor: `${displayColor || '#3B82F6'}15`,
                                                                    color: displayColor || '#3B82F6'
                                                                }}
                                                            >
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-base group-hover:text-primary transition-colors">{displayName}</h4>
                                                                {hasCoordinates ? (
                                                                    <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5" title={dept.location_name || "Location Mapped"}>
                                                                        <MapPin className="w-3 h-3" />
                                                                        <span className="truncate max-w-[100px]">{dept.location_name || 'Mapped'}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                                        <MapPin className="w-3 h-3" />
                                                                        <span>No location</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    </div>

                                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                                        {displayDesc || 'No description provided.'}
                                                    </p>

                                                    <div className="pt-3 border-t border-border mt-auto flex items-center justify-between text-xs text-muted-foreground">
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

                                        {/* Quick Add Button in List */}
                                        <button
                                            onClick={() => setIsDeptSelectorOpen(true)}
                                            className="w-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                                <Layers className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-sm">Add New Department</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Interactive Map */}
                            <div className="lg:col-span-2 h-full rounded-xl overflow-hidden border border-border bg-muted/10 relative shadow-sm">
                                <GoogleMap
                                    lat={Number(event.coordinates?.lat) || 25.2048}
                                    lng={Number(event.coordinates?.lng) || 55.2708}
                                    className="h-full w-full"
                                    readOnly={true}
                                    polygons={departments
                                        .filter(d => d.coordinates?.points && Array.isArray(d.coordinates.points) && d.coordinates.points.length >= 3)
                                        .map(d => ({
                                            id: d.id,
                                            points: d.coordinates.points,
                                            color: d.color || d.template?.color || '#3B82F6',
                                            name: d.location_name || d.name || d.template?.name || 'Unnamed Department',
                                            onClick: () => router.push(`/events/${event.id}/departments/${d.id}`)
                                        }))
                                    }
                                />
                                {/* Legend Overlay */}
                                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border/50 max-w-[200px] z-[500]">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Departments</h4>
                                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {departments.filter(d => d.coordinates?.points?.length > 0).map(d => (
                                            <div key={d.id} className="flex items-center gap-2 text-xs">
                                                <span
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: d.color || d.template?.color || '#3B82F6' }}
                                                />
                                                <span className="truncate">{d.location_name || d.name || d.template?.name}</span>
                                            </div>
                                        ))}
                                        {departments.filter(d => d.coordinates?.points?.length > 0).length === 0 && (
                                            <span className="text-xs text-muted-foreground italic">No mapped zones</span>
                                        )}
                                    </div>
                                </div>
                            </div>
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
                                {(canDelete || canRequestDelete) && (
                                    <div className="border-t border-destructive/20 pt-6">
                                        <h4 className="font-semibold text-destructive mb-2">Danger Zone</h4>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Permanent actions that cannot be undone.
                                        </p>
                                        {canDelete ? (
                                            <button
                                                onClick={() => setShowDeleteDialog(true)}
                                                className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 inline mr-2" />
                                                Delete Event
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setIsDeleteRequestModalOpen(true)}
                                                disabled={event.delete_requested}
                                                className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4 inline mr-2" />
                                                {event.delete_requested ? 'Delete Requested' : 'Request Deletion'}
                                            </button>
                                        )}
                                        {event.delete_requested && (
                                            <p className="text-xs text-destructive mt-2">
                                                Deletion requested on {new Date(event.delete_requested_at).toLocaleDateString()}. Pending approval.
                                            </p>
                                        )}
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
                                    <GoogleMap
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

            {/* End Event Confirmation Modal */}
            <Modal
                isOpen={isEndEventModalOpen}
                onClose={() => setIsEndEventModalOpen(false)}
                title={canEndEvent ? "End Event" : "Request Event End"}
                variant="destructive"
                footer={
                    <>
                        <button
                            onClick={() => setIsEndEventModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        {canEndEvent ? (
                            <button
                                onClick={async () => {
                                    try {
                                        await eventsApi.endEvent(event.id);
                                        await fetchEventData();
                                        toast.success('Event ended successfully');
                                        setIsEndEventModalOpen(false);
                                    } catch (error: any) {
                                        toast.error(error.response?.data?.error || 'Failed to end event');
                                    }
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Square className="w-4 h-4 fill-current" />
                                End Event Now
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    try {
                                        await eventsApi.requestEnd(event.id);
                                        await fetchEventData();
                                        toast.success('End request submitted. Org admins will be notified.');
                                        setIsEndEventModalOpen(false);
                                    } catch (error: any) {
                                        toast.error(error.response?.data?.error || 'Failed to submit end request');
                                    }
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Square className="w-4 h-4" />
                                Submit Request
                            </button>
                        )}
                    </>
                }
            >
                <div className="space-y-4">
                    {canEndEvent ? (
                        <>
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-4">
                                <div className="p-2 bg-destructive/20 rounded-full">
                                    <Square className="w-6 h-6 text-destructive" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-destructive">Confirmation Required</h4>
                                    <p className="text-sm text-destructive/80 mt-1">
                                        Are you sure you want to end this event? This action will stop the countdown timer and mark the event as ended.
                                    </p>
                                </div>
                            </div>
                            {event?.end_requested && (
                                <div className="p-4 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-lg shadow-sm">
                                    <p className="text-sm text-orange-900 dark:text-orange-100">
                                        <strong className="font-bold text-orange-950 dark:text-white uppercase text-xs tracking-wider mr-1">Note:</strong>
                                        An event manager has requested to end this event. By proceeding, you are approving this request.
                                    </p>
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">
                                The event status will be changed to <span className="font-mono font-medium text-destructive">END</span>. You can reactivate it later if needed.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="p-4 bg-orange-100 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg flex items-start gap-4">
                                <div className="p-2 bg-orange-200 dark:bg-orange-500/40 rounded-full">
                                    <Clock className="w-6 h-6 text-orange-900 dark:text-orange-900" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-black dark:text-black">Request to End Event</h4>
                                    <p className="text-sm text-black dark:text-black mt-1">
                                        As an Event Manager, you can request to end this event. The organization administrators will be notified and can approve your request.
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Your request will be sent to the organization admins. They will receive an email notification with a link to this event.
                            </p>
                        </>
                    )}
                </div>
            </Modal>

            {/* Request Delete Modal */}
            <Modal
                isOpen={isDeleteRequestModalOpen}
                onClose={() => setIsDeleteRequestModalOpen(false)}
                title="Request Event Deletion"
                variant="destructive"
                footer={
                    <>
                        <button
                            onClick={() => setIsDeleteRequestModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await eventsApi.requestDelete(event.id);
                                    await fetchEventData();
                                    toast.success('Deletion request submitted');
                                    setIsDeleteRequestModalOpen(false);
                                } catch (error: any) {
                                    toast.error(error.response?.data?.error || 'Failed to submit request');
                                }
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Submit Request
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-4">
                        <div className="p-2 bg-destructive/20 rounded-full">
                            <Trash2 className="w-6 h-6 text-destructive" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-destructive">Requesting Deletion</h4>
                            <p className="text-sm text-destructive/80 mt-1">
                                As an Event Manager, you cannot delete events directly. This action will send a request to organization administrators to permanently delete <strong>{event.name}</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Template Selector Modal */}
            <DepartmentsSelector
                isOpen={isDeptSelectorOpen}
                onClose={() => setIsDeptSelectorOpen(false)}
                onSelect={handleDepartmentSelect}
            />

            {/* Location Modal */}
            {showLocationModal && selectedTemplateForLocation && (
                <DepartmentLocationModal
                    isOpen={showLocationModal}
                    onClose={() => setShowLocationModal(false)}
                    template={selectedTemplateForLocation}
                    eventLocation={event?.coordinates ? { lat: event.coordinates.lat, lng: event.coordinates.lng } : { lat: 25.2048, lng: 55.2708 }}
                    onConfirm={(coords, locationName) => handleAddDepartment(selectedTemplateForLocation, coords, locationName)}
                />
            )}
        </DashboardLayout >
    );
}
