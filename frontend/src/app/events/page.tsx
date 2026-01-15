'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Calendar, Plus, Search, LayoutGrid, List, MapPin, Clock, ChevronRight, Activity, Archive, CheckCircle, Filter, Building2 } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { eventsApi, organizationsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { RichSelect } from '@/components/ui/RichSelect';

export default function EventsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');

    // Super Admin Filter State
    const [orgs, setOrgs] = useState<any[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<string>('');

    useEffect(() => {
        if (!user) return;
        fetchEvents();
        if (user.is_super_admin) {
            fetchOrgs();
        }
    }, [user]);

    const fetchOrgs = async () => {
        try {
            const response = await organizationsApi.getAll({ limit: 1000 });
            setOrgs(response.data || []);
        } catch (err) {
            console.error('Failed to fetch orgs', err);
        }
    };

    const fetchEvents = async () => {
        try {
            setIsLoading(true);
            let data = [];
            if (user?.is_super_admin) {
                // Fetch all events for Super Admin
                data = await eventsApi.getAll();
            } else if (user?.organization_id) {
                data = await eventsApi.getByOrg(user.organization_id);
            }
            // Ensure data is array
            setEvents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Events
    const filteredEvents = events.filter(event => {
        // Org Filter (Super Admin only)
        if (selectedOrg && event.organization_id !== selectedOrg) {
            return false;
        }

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            event.name.toLowerCase().includes(q) ||
            event.location?.toLowerCase().includes(q) ||
            event.status?.toLowerCase().includes(q)
        );
    });

    // Check Permissions
    const canCreateEvent = user?.is_super_admin || user?.permissions?.includes('events:create');

    // Combined Items for Grid
    const allItems = [
        ...(canCreateEvent ? [{ type: 'ADD_NEW' }] : []),
        ...filteredEvents.map(evt => ({ type: 'EVENT', data: evt }))
    ];

    // Status Colors Helpers
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-500';
            case 'PLANNING': return 'bg-blue-500';
            case 'ARCHIVED': return 'bg-gray-500';
            default: return 'bg-slate-500';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700';
            case 'PLANNING': return 'bg-blue-100 text-blue-700';
            case 'ARCHIVED': return 'bg-gray-100 text-gray-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Calendar className="w-6 h-6 text-primary" />
                                Event Management
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Manage operational events, deployments, and timelines.
                            </p>
                        </div>

                        {/* View Filters */}
                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid'
                                    ? 'bg-background shadow-sm text-primary'
                                    : 'text-muted-foreground hover:text-foreground'}`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'table'
                                    ? 'bg-background shadow-sm text-primary'
                                    : 'text-muted-foreground hover:text-foreground'}`}
                                title="Table View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Global Search Engine */}
                        <div className="relative w-full max-w-2xl flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search Events... (Name, Location, Status)"
                                className="block w-full pl-10 pr-3 py-3 border border-border/40 rounded-xl leading-5 bg-muted/30 placeholder-muted-foreground/60 focus:outline-none focus:bg-card focus:ring-1 focus:ring-primary/20 focus:border-primary/50 transition-all save-autofill"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Org Filter (Super Admin) */}
                        {user?.is_super_admin && (
                            <div className="w-full md:w-[300px]">
                                <RichSelect
                                    value={selectedOrg}
                                    onChange={setSelectedOrg}
                                    className="h-[50px]" // Match height of search input roughly
                                    options={[
                                        { value: '', label: 'All Organizations', icon: LayoutGrid },
                                        ...orgs.map(org => ({ value: org.id, label: org.name, image: org.logo_url }))
                                    ]}
                                    icon={Building2}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatsCard
                        title="Total Events"
                        value={events.length}
                        subtext="All configured events"
                        icon={Calendar}
                        intent="default"
                    />
                    <StatsCard
                        title="Active"
                        value={events.filter(e => e.status === 'ACTIVE').length}
                        subtext="Currently live"
                        icon={Activity}
                        intent="success"
                    />
                    <StatsCard
                        title="Planning"
                        value={events.filter(e => e.status === 'PLANNING').length}
                        subtext="Upcoming / preparation"
                        icon={CheckCircle}
                        intent="primary"
                    />
                    <StatsCard
                        title="Archived"
                        value={events.filter(e => e.status === 'ARCHIVED').length}
                        subtext="Past events"
                        icon={Archive}
                        intent="warning"
                    />
                </div>

                {/* Section Separator */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent my-8 opacity-60" />

                {/* Content */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {allItems.map((item, index) => {
                            if (item.type === 'ADD_NEW') {
                                return (
                                    <button
                                        key="new"
                                        onClick={() => router.push('/events/new')}
                                        className="group relative flex flex-col items-center justify-center h-full min-h-[320px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-300 gap-4"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                            <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="font-semibold text-foreground">Create New Event</h3>
                                            <p className="text-sm text-muted-foreground mt-1">Set up a new deployment</p>
                                        </div>
                                    </button>
                                );
                            }

                            const event = (item as { data: any }).data;

                            return (
                                <div
                                    key={event.id}
                                    className="group relative flex flex-col h-full min-h-[320px] bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300"
                                    onClick={() => router.push(`/events/${event.id}`)}
                                >
                                    {/* Full Background Image */}
                                    <div
                                        className="absolute inset-0 transition-transform duration-700 group-hover:scale-105 bg-cover bg-center"
                                        style={{
                                            backgroundImage: event.image_url ? `url(${event.image_url})` : undefined
                                        }}
                                    />

                                    {/* Gradient Overlay for Readability */}
                                    <div className={`absolute inset-0 transition-opacity duration-300 ${event.image_url ? 'bg-gradient-to-t from-black via-black/60 to-black/30' : 'bg-gradient-to-br from-primary/90 to-black/80'}`} />

                                    {/* Noise Texture */}
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150 mix-blend-overlay"></div>

                                    {/* Status Badge */}
                                    <span className={`absolute top-4 right-4 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg z-10`}>
                                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${event.status === 'ACTIVE' ? 'bg-green-400' : event.status === 'PLANNING' ? 'bg-blue-400' : 'bg-gray-400'}`} />
                                        {event.status}
                                    </span>

                                    {/* Content Container (Pushed to bottom) */}
                                    <div className="relative z-10 flex flex-col h-full justify-end p-6 text-white">

                                        {/* Floating Icon (Now aligned with text) */}
                                        <div className="mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-xl leading-tight mb-2 text-white text-shadow-sm line-clamp-2" title={event.name}>
                                            {event.name}
                                        </h3>

                                        <div className="space-y-2 text-sm text-gray-200">
                                            {event.location && (
                                                <div className="flex items-center gap-2 text-xs font-medium">
                                                    <MapPin className="w-3.5 h-3.5 text-primary-foreground/80" />
                                                    <span className="line-clamp-1">{event.location}</span>
                                                </div>
                                            )}

                                            {event.start_date && (
                                                <div className="flex items-center gap-2 text-xs font-medium">
                                                    <Clock className="w-3.5 h-3.5 text-primary-foreground/80" />
                                                    <span>{format(new Date(event.start_date), 'MMM d, yyyy • h:mm a')}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer / Manage Button */}
                                        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/10 border border-white/10 text-white/80">
                                                {event.code || 'Pending'}
                                            </span>

                                            <button className="text-xs font-bold text-white hover:text-primary-foreground transition-all uppercase tracking-wider flex items-center gap-1.5 group-hover:gap-2">
                                                Manage
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-xl overflow-hidden animate-in fade-in duration-300">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Event Name</th>
                                        <th>Location</th>
                                        <th>Start Date</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                                    ) : events.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No events found.</td></tr>
                                    ) : (
                                        events.map(event => (
                                            <tr key={event.id}>
                                                <td className="font-medium">{event.name}</td>
                                                <td className="text-muted-foreground">{event.location || '-'}</td>
                                                <td className="text-muted-foreground">{event.start_date ? format(new Date(event.start_date), 'PPP') : '-'}</td>
                                                <td>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(event.status)}`}>
                                                        {event.status}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <button className="text-primary hover:underline text-sm disabled:opacity-50" onClick={() => router.push(`/events/${event.id}`)}>Manage</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
