'use client';
// Event Detail Page - Last updated: 2026-01-01

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Calendar, MapPin, Clock, Settings, ArrowLeft, Edit, Trash2, Archive } from 'lucide-react';
import { eventsApi } from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchEvent();
        }
    }, [params.id]);

    const fetchEvent = async () => {
        try {
            setIsLoading(true);
            const data = await eventsApi.getById(params.id as string);
            setEvent(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load event');
        } finally {
            setIsLoading(false);
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
            <div className="page-padding max-w-[1400px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/events')}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
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
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Info */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card border border-border rounded-xl p-6 !shadow-none">
                                <h3 className="font-semibold mb-4">Event Details</h3>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-xs text-muted-foreground uppercase tracking-wider">Description</dt>
                                        <dd className="mt-1 text-sm">{event.description || 'No description provided'}</dd>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <dt className="text-xs text-muted-foreground uppercase tracking-wider">Event Type</dt>
                                            <dd className="mt-1 text-sm font-medium">{event.event_type || 'N/A'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-muted-foreground uppercase tracking-wider">Status</dt>
                                            <dd className="mt-1">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${event.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                    event.status === 'PLANNING' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {event.status}
                                                </span>
                                            </dd>
                                        </div>
                                    </div>
                                    {event.start_date && (
                                        <div>
                                            <dt className="text-xs text-muted-foreground uppercase tracking-wider">Schedule</dt>
                                            <dd className="mt-1 text-sm">
                                                {format(new Date(event.start_date), 'PPP')}
                                                {event.end_date && ` - ${format(new Date(event.end_date), 'PPP')}`}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <div className="bg-card border border-border rounded-xl p-6 !shadow-none">
                                <h3 className="font-semibold mb-4">Quick Actions</h3>
                                <div className="space-y-2">
                                    <button className="w-full btn-outline text-sm">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Event
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(event.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE')}
                                        className="w-full btn-outline text-sm"
                                    >
                                        <Archive className="w-4 h-4 mr-2" />
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
                            <p className="text-sm text-muted-foreground mb-4">
                                This action cannot be undone. This will permanently delete the event <strong>{event.name}</strong> and all associated data.
                            </p>
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
        </DashboardLayout>
    );
}
