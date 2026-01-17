'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Building2, Plus, Search, LayoutGrid, List, Users, Smartphone, ChevronRight, Activity, Shield, CreditCard, BadgeCheck, Briefcase } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { organizationsApi, getImageUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Organization } from '@/types/auth';
import { getPrimaryColor } from '@/lib/theme-parser';

export default function OrganizationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    // const [error, setError] = useState(''); // Removed unused error state if needed, or keep
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ total: 0, providers: 0, partners: 0, clients: 0 });

    // Chunking Helper for Grid Layout (4 items per row)
    const chunkArray = (arr: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    // Prepare display items (AddNew button is first item)
    // Only in Grid View do we mix the add button. In table view it's a separate button usually.
    const allItems = [
        { type: 'ADD_NEW' },
        ...orgs.map(org => ({ type: 'ORG', data: org }))
    ];

    const itemChunks = chunkArray(allItems, 4);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchOrgs();
        }, 300); // Debounce search

        return () => clearTimeout(delayDebounceFn);
    }, [user, router, page, searchQuery]);

    useEffect(() => {
        if (user?.is_super_admin) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const data = await organizationsApi.getStats();
            if (data) setStats(data);
        } catch (err) {
            console.error('Failed to fetch org stats:', err);
        }
    };

    const fetchOrgs = async () => {
        try {
            setIsLoading(true);
            const response: any = await organizationsApi.getAll({ page, limit: 7, search: searchQuery });
            if (response.data) {
                setOrgs(response.data);
                setTotalPages(response.totalPages || 1);
            }
        } catch (err) {
            console.error(err);
            // setError('Failed to fetch organizations.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user?.is_super_admin) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[80vh] text-center">
                    <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
                    <p className="text-muted-foreground">You do not have permission to view this page.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Building2 className="w-6 h-6 text-primary" />
                                Organizations
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Manage enterprise tenants, subscriptions, and profiles.
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

                    {/* Global Search Engine */}
                    <div className="relative w-full max-w-2xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder="Global Search Engine... (Name, Code, Industry)"
                            className="block w-full pl-10 pr-3 py-3 border border-border/40 rounded-xl leading-5 bg-muted/30 placeholder-muted-foreground/60 focus:outline-none focus:bg-card focus:ring-1 focus:ring-primary/20 focus:border-primary/50 transition-all save-autofill"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Top Stats Row (Reusable Component) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatsCard
                        title="Total Tenants"
                        value={stats.total}
                        subtext="All registered entities"
                        icon={Building2}
                        intent="default"
                    />
                    <StatsCard
                        title="SustainPro"
                        value={stats.providers}
                        subtext="Internal provider accounts"
                        icon={BadgeCheck}
                        intent="primary"
                    />
                    <StatsCard
                        title="Partners"
                        value={stats.partners}
                        subtext="Resellers & integrators"
                        icon={Briefcase}
                        intent="success"
                    />
                    <StatsCard
                        title="Clients"
                        value={stats.clients}
                        subtext="End-user organizations"
                        icon={Users}
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
                                        onClick={() => router.push('/admin/organizations/new')}
                                        className="group relative flex flex-col items-center justify-center h-full min-h-[320px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-300 gap-4"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                            <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="font-semibold text-foreground">Add New Organization</h3>
                                            <p className="text-sm text-muted-foreground mt-1">Create a new tenant workspace</p>
                                        </div>
                                    </button>
                                );
                            }

                            const org = (item as { data: Organization }).data;

                            // Get primary color using the theme parser
                            const primaryColor = getPrimaryColor(org.theme_config, '');

                            return (
                                <div key={org.id} className="group relative flex flex-col h-full min-h-[320px] bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                                    {/* Banner Header - Custom Color */}
                                    <div
                                        className="h-24 relative overflow-hidden transition-colors duration-300"
                                        style={{
                                            background: primaryColor ? `linear-gradient(135deg, ${primaryColor}, #000000)` : `linear-gradient(135deg, var(--primary), #000000)`,
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

                                        {/* Status Badge */}
                                        <span className={`absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/20 backdrop-blur-sm text-white border border-white/20 shadow-sm`}>
                                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${org.subscription_status === 'ACTIVE' ? 'bg-green-400' : 'bg-red-400'}`} />
                                            {org.subscription_status || 'ACTIVE'}
                                        </span>
                                    </div>

                                    {/* Floating Icon / Logo */}
                                    <div className="absolute top-16 left-6">
                                        <div className="w-16 h-16 rounded-xl bg-white p-1 shadow-lg flex items-center justify-center border border-border z-10 group-hover:scale-105 transition-transform duration-300">
                                            <div className="w-full h-full rounded-lg bg-white flex items-center justify-center overflow-hidden">
                                                {org.logo_url ? (
                                                    <img src={getImageUrl(org.logo_url) || ''} alt={org.name} className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <span className="text-2xl font-bold text-gray-900">
                                                        {org.name.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="flex-1 flex flex-col pt-10 px-6 pb-6">
                                        <h3 className="font-bold text-lg text-foreground truncate mt-1" title={org.name}>{org.name}</h3>

                                        {/* Basic Client Details Overview */}
                                        <div className="mt-2 text-sm text-muted-foreground space-y-3">
                                            {org.description ? (
                                                <p className="line-clamp-2 text-xs leading-relaxed">{org.description}</p>
                                            ) : (
                                                <p className="text-xs italic opacity-50">No description provided.</p>
                                            )}

                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {org.industry && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 border border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                        {org.industry}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 border border-border text-[10px] font-medium text-muted-foreground font-mono">
                                                    {org.code}
                                                </span>
                                                {org.website && (
                                                    <a
                                                        href={org.website}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center px-2 py-1 rounded-md bg-primary/5 border border-primary/20 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                                                        onClick={e => e.stopPropagation()}
                                                        style={{ color: primaryColor, borderColor: primaryColor ? `${primaryColor}40` : undefined, backgroundColor: primaryColor ? `${primaryColor}10` : undefined }}
                                                    >
                                                        Website
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
                                        <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md ${org.plan_tier === 'ENTERPRISE' ? 'bg-purple-500/10 text-purple-600' :
                                            org.plan_tier === 'PRO' ? 'bg-blue-500/10 text-blue-600' :
                                                'bg-slate-500/10 text-slate-600'
                                            }`}>
                                            {org.plan_tier}
                                        </span>
                                        <button
                                            onClick={() => router.push(`/admin/organizations/${org.code}`)}
                                            className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider flex items-center gap-1"
                                        >
                                            Manage
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
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
                                        <th>Tenant</th>
                                        <th>Location</th>
                                        <th>Contact</th>
                                        <th>Plan</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                                    ) : orgs.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No organizations found.</td></tr>
                                    ) : (
                                        orgs.map(org => (
                                            <tr key={org.id}>
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground text-sm">{org.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">{org.code}</span>
                                                        <span className="text-xs text-muted-foreground">{org.industry}</span>
                                                    </div>
                                                </td>
                                                <td className="text-sm text-muted-foreground">
                                                    {org.city && org.country ? `${org.city}, ${org.country}` : '-'}
                                                </td>
                                                <td className="text-sm text-muted-foreground">
                                                    <div>{org.contact_email}</div>
                                                    <div className="text-xs">{org.phone}</div>
                                                </td>
                                                <td>
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${org.plan_tier === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                                                            org.plan_tier === 'PRO' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {org.plan_tier}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                            {org.max_users} users / {org.max_devices} devices
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${org.subscription_status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {org.subscription_status || 'ACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <button className="text-primary hover:underline text-sm disabled:opacity-50" disabled>Manage</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm font-medium text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isLoading}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
}
