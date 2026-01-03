'use client';

// ... imports
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import TimeDisplay from '@/components/TimeDisplay';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

import { RichSelect } from '@/components/ui/RichSelect';
import {
    Plus, Search, Trash2, Shield, ShieldAlert, User as UserIcon, Users,
    MoreVertical, X, AlertTriangle, Pencil, Crown, UserCog, Eye,
    CheckCircle2, XCircle, Building2, Filter, LayoutList, ListTree,
    ChevronRight, ChevronDown, Activity, Settings, Calendar
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface User {
    id: string;
    email: string;
    roles: { role: string }[];
    is_active: boolean;
    created_at: string;
    last_login_at?: string;
    org_name?: string; // For Super Admin view
    org_logo?: string;
    org_id?: string; // Ideally we have this
}

type ViewMode = 'table' | 'tree';

// Role Hierarchy Definition for Sorting/Grouping
const ROLE_PRIORITY: Record<string, number> = {
    'SUPER_ADMIN': 0,
    'ORG_ADMIN': 1,
    'EVENT_MANAGER': 2,
    'DEPT_HEAD': 3,
    'SERVICE_SUPERVISOR': 4,
    'TECHNICIAN': 5,
    'VIEWER': 6
};

const getRolePriority = (role?: string) => ROLE_PRIORITY[role || 'VIEWER'] ?? 99;

export default function UsersPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    // We can persist viewMode in localStorage later if needed

    // Filters
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [orgFilter, setOrgFilter] = useState('ALL');

    // Create Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        id: '',
        password: '',
        confirmPassword: '',
        role: 'viewer',
        timezone: 'Asia/Colombo',
        adminPassword: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [deleteAdminPassword, setDeleteAdminPassword] = useState('');

    const [passwordError, setPasswordError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Permission Check: Allow Super Admin OR Org Admin
    useEffect(() => {
        if (!authLoading && user) {
            const hasAccess = user.is_super_admin || user.roles?.some(r => r.role === 'ORG_ADMIN');
            if (!hasAccess) {
                router.replace('/not-found');
            }
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            fetchUsers();
        }
    }, [user]);

    // Auto-generate User ID when modal opens
    useEffect(() => {
        if (isModalOpen) {
            const randomId = 'U_' + Math.floor(1000 + Math.random() * 9000);
            setNewUser(prev => ({ ...prev, id: randomId }));
            setPasswordStrength(0);
            setPasswordError('');
        }
    }, [isModalOpen]);



    const fetchUsers = async () => {
        try {
            const data = await usersApi.getAll();
            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const checkPasswordStrength = (pass: string) => {
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[a-z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        setPasswordStrength(score);

        if (pass.length === 0) setPasswordError('');
        else if (pass.length < 8) setPasswordError('Min 8 chars required');
        else if (score < 5) setPasswordError('Weak password');
        else setPasswordError('');

        return score >= 5;
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateEmail(newUser.email)) {
            toast.error('Invalid email address');
            return;
        }
        if (!checkPasswordStrength(newUser.password)) {
            toast.error('Password is too weak');
            return;
        }

        setIsSubmitting(true);
        try {
            await usersApi.create(newUser);
            toast.success('User created successfully');
            setIsModalOpen(false);
            setNewUser({ email: '', id: '', password: '', confirmPassword: '', role: 'viewer', timezone: 'Asia/Colombo', adminPassword: '' });
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = (user: any) => {
        setUserToDelete(user);
        setDeleteAdminPassword('');
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            await usersApi.delete(userToDelete.id, deleteAdminPassword);
            toast.success('User deleted successfully');
            setIsDeleteModalOpen(false);
            fetchUsers();
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Failed to delete user';
            toast.error(errorMessage);
        }
    };

    // --- Filtering Logic ---
    const uniqueOrgsMap = new Map();
    users.forEach(u => {
        if (u.org_name && !uniqueOrgsMap.has(u.org_name)) {
            uniqueOrgsMap.set(u.org_name, u.org_logo);
        }
    });

    const uniqueOrgOptions = Array.from(uniqueOrgsMap.entries()).map(([name, logo]) => ({
        value: name,
        label: name,
        image: logo // This might be undefined depending on earlier fix, but let's assume valid
    }));

    // Role Options with Icons
    const roleOptions = [
        { value: 'ALL', label: 'All Roles', icon: Users },
        { value: 'ORG_ADMIN', label: 'Org Admin', icon: Crown },
        { value: 'EVENT_MANAGER', label: 'Event Manager', icon: UserCog },
        { value: 'DEPT_HEAD', label: 'Dept Head', icon: UserIcon },
        { value: 'SERVICE_SUPERVISOR', label: 'Supervisor', icon: Eye },
        { value: 'TECHNICIAN', label: 'Technician', icon: Shield },
        { value: 'VIEWER', label: 'Viewer', icon: Eye }
    ];

    const filteredUsers = users.filter(user => {
        // Text Search
        const matchesSearch =
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.org_name && user.org_name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Role Filter
        const matchesRole = roleFilter === 'ALL' || user.roles.some(r => r.role === roleFilter);

        // Org Filter (Super Admin only)
        const matchesOrg = orgFilter === 'ALL' || user.org_name === orgFilter;

        return matchesSearch && matchesRole && matchesOrg;
    });

    const isSuperAdmin = user?.is_super_admin;


    // --- Tree View Logic ---
    // Structure: Organization -> Role Group -> Users
    const treeData = useMemo(() => {
        const grouped = new Map<string, { logo?: string, roles: Map<string, User[]> }>();

        filteredUsers.forEach(u => {
            const orgName = u.org_name || 'Global / Unassigned';

            if (!grouped.has(orgName)) {
                grouped.set(orgName, { logo: u.org_logo, roles: new Map() });
            }

            const orgGroup = grouped.get(orgName)!;
            // Assuming simplified single role for grouping, or primary role
            const primaryRole = u.roles?.[0]?.role || 'NO_ROLE';

            if (!orgGroup.roles.has(primaryRole)) {
                orgGroup.roles.set(primaryRole, []);
            }
            orgGroup.roles.get(primaryRole)!.push(u);
        });

        // Sort Orgs? Maybe by name
        // Sort Roles by priority
        return Array.from(grouped.entries()).map(([orgName, data]) => {
            const sortedRoles = Array.from(data.roles.entries()).sort((a, b) => {
                return getRolePriority(a[0]) - getRolePriority(b[0]);
            });
            return { orgName, logo: data.logo, roles: sortedRoles };
        });
    }, [filteredUsers]);


    const renderTreeView = () => {
        if (filteredUsers.length === 0) {
            return (
                <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-lg">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                        <Search className="w-8 h-8" />
                        <p className="text-sm font-medium">No users found</p>
                        <p className="text-xs">Try adjusting your filters or search query.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4 animate-in fade-in duration-300">
                {treeData.map((org) => (
                    <div key={org.orgName} className="border border-border rounded-xl bg-card overflow-hidden">
                        <details className="group/org">
                            <summary className="bg-muted/40 p-4 flex items-center justify-between border-b border-border/50 cursor-pointer hover:bg-muted/60 transition-colors list-none">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-md border border-border/50 bg-background group-open/org:rotate-90 transition-transform mr-1">
                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    {org.logo ? (
                                        <img src={org.logo} alt="" className="w-10 h-10 rounded-lg object-cover bg-white border border-border/50" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-base text-foreground">{org.orgName}</h3>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Organization</p>
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-muted-foreground bg-background px-3 py-1.5 rounded-md border border-border/50">
                                    {org.roles.reduce((acc, [_, users]) => acc + users.length, 0)} Users
                                </div>
                            </summary>

                            {/* Roles List */}
                            <div className="relative pt-4 pb-4 pl-8">
                                {/* Vertical connection line from Org to Roles */}
                                <div className="absolute left-[20px] top-0 bottom-0 w-[2px] bg-gray-300" />

                                {org.roles.map(([role, users], roleIndex, roleArr) => {
                                    const isLastRole = roleIndex === roleArr.length - 1;

                                    // Determine Role Icon/Color
                                    const RoleIcon =
                                        role === 'ORG_ADMIN' ? Crown :
                                            role === 'EVENT_MANAGER' ? UserCog :
                                                role === 'TECHNICIAN' ? Settings :
                                                    role === 'DEPT_HEAD' ? UserIcon :
                                                        role === 'SERVICE_SUPERVISOR' ? Activity :
                                                            Eye; // Viewer/Default

                                    return (
                                        <div key={role} className="relative mb-3 last:mb-0">
                                            {/* Horizontal connector from main vertical line to role */}
                                            <div className="absolute left-[-12px] top-[18px] w-3 h-[2px] bg-gray-300" />
                                            {/* Cover bottom vertical for last role */}
                                            {isLastRole && <div className="absolute left-[-12px] top-[20px] bottom-0 w-[2px] bg-background" />}

                                            <details className="group">
                                                <summary className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer list-none select-none relative bg-background">
                                                    <div className="w-6 h-6 flex items-center justify-center rounded-md border border-border/50 bg-background group-open:rotate-90 transition-transform">
                                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </div>
                                                    <RoleIcon className="w-5 h-5 text-primary/70" />
                                                    <span className="text-sm font-medium text-foreground/90">{role.replace(/_/g, ' ')}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">{users.length}</span>
                                                </summary>

                                                <div className="relative pl-8 pt-2 pb-2">
                                                    {/* Vertical connection line from Role to Users */}
                                                    <div className="absolute left-[12px] top-0 bottom-0 w-[2px] bg-gray-300" />

                                                    {users.map((user, userIndex, userArr) => {
                                                        const isLastUser = userIndex === userArr.length - 1;
                                                        return (
                                                            <div key={user.id} className="relative mb-2 last:mb-0">
                                                                {/* Horizontal connector from role line to user */}
                                                                <div className="absolute left-[-20px] top-[26px] w-5 h-[2px] bg-gray-300" />
                                                                {/* Cover bottom vertical for last user */}
                                                                {isLastUser && <div className="absolute left-[-20px] top-[28px] bottom-0 w-[2px] bg-background" />}

                                                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-transparent hover:border-border hover:bg-muted/40 transition-all group/user">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-8 h-8 rounded-full bg-primary/5 text-primary text-xs font-bold flex items-center justify-center border border-primary/10 relative z-10 bg-background">
                                                                            {user.email[0].toUpperCase()}
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-medium text-foreground">{user.email}</span>
                                                                            <span className="text-xs text-muted-foreground font-mono opacity-0 group-hover/user:opacity-100 transition-opacity">
                                                                                ID: {user.id} • Last Login: <TimeDisplay timestamp={user.last_login_at} format="relative" fallback="Never" />
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-3">
                                                                        <div className={cn("w-2.5 h-2.5 rounded-full", user.is_active ? "bg-emerald-500" : "bg-rose-500")} title={user.is_active ? "Active" : "Inactive"} />

                                                                        <div className="flex opacity-0 group-hover/user:opacity-100 transition-opacity gap-1">
                                                                            <button
                                                                                onClick={() => toast('Edit coming soon', { icon: '🚧' })}
                                                                                className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-primary transition-all"
                                                                            >
                                                                                <Pencil className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteUser(user)}
                                                                                className="p-2 hover:bg-background rounded-md text-muted-foreground hover:text-destructive transition-all"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </details>
                                        </div>
                                    );
                                })}
                            </div>
                        </details>
                    </div>
                ))}
            </div>
        );
    };

    const hasAccess = user?.is_super_admin || user?.roles?.some(r => r.role === 'ORG_ADMIN');
    if (authLoading || (user && !hasAccess)) {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                <Toaster position="bottom-right" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title">
                            <Users className="w-6 h-6 text-primary" />
                            {isSuperAdmin ? 'Global User Management' : 'User Management'}
                        </h1>
                        <p className="page-header-subtext">
                            {isSuperAdmin
                                ? 'View and manage users across all organizations and hierarchies.'
                                : 'Manage user access, roles, and permissions securely.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center p-1 bg-muted rounded-lg border border-border">
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'table' ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                                title="Table View"
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('tree')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'tree' ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                                title="Smart Tree View"
                            >
                                <ListTree className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={() => router.push('/users/new')}
                            className="btn-primary"
                        >
                            <Plus className="w-4 h-4" />
                            Add User
                        </button>
                    </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-1">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder={isSuperAdmin ? "Search users, emails, or orgs..." : "Search users..."}
                            className="block w-full pl-10 pr-3 py-3 border border-border/40 rounded-xl leading-5 bg-muted/30 placeholder-muted-foreground/60 focus:outline-none focus:bg-card focus:ring-1 focus:ring-primary/20 focus:border-primary/50 transition-all save-autofill text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto flex-wrap items-center">
                        {/* Role Filter */}
                        <div className="min-w-[180px]">
                            <RichSelect
                                value={roleFilter}
                                onChange={setRoleFilter}
                                icon={UserCog}
                                className="h-[46px]"
                                options={roleOptions}
                            />
                        </div>

                        {/* Org Filter (Super Admin Only) */}
                        {isSuperAdmin && (
                            <div className="min-w-[200px]">
                                <RichSelect
                                    value={orgFilter}
                                    onChange={setOrgFilter}
                                    icon={Building2}
                                    className="h-[46px]"
                                    options={[
                                        { value: 'ALL', label: 'All Organizations', icon: Building2 },
                                        ...uniqueOrgOptions
                                    ]}
                                />
                            </div>
                        )}

                        {(roleFilter !== 'ALL' || orgFilter !== 'ALL' || searchQuery) && (
                            <button
                                onClick={() => {
                                    setRoleFilter('ALL');
                                    setOrgFilter('ALL');
                                    setSearchQuery('');
                                }}
                                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors whitespace-nowrap"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Content View */}
                {viewMode === 'tree' ? renderTreeView() : (
                    <div className="bg-card border border-border rounded-lg overflow-hidden text-sm shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="data-table w-full text-left">
                                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">User Info</th>
                                        {isSuperAdmin && <th className="px-4 py-3">Organization</th>}
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Created</th>
                                        <th className="px-4 py-3">Last Login</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 6 : 5} className="text-center py-12 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                    <span className="text-xs">Loading users...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 6 : 5} className="text-center py-12 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2 opacity-60">
                                                    <Search className="w-8 h-8" />
                                                    <p className="text-sm font-medium">No users found</p>
                                                    <p className="text-xs">Try adjusting your filters or search query.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shrink-0">
                                                            {user.email[0].toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-semibold text-foreground truncate max-w-[200px]" title={user.email}>{user.email}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">{user.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {isSuperAdmin && (
                                                    <td className="px-4 py-3">
                                                        {user.org_name ? (
                                                            <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                                                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                                {user.org_name}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">Global / None</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background/50 text-xs font-medium">
                                                        {user.roles?.[0]?.role === 'ORG_ADMIN' && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />}
                                                        {user.roles?.[0]?.role === 'EVENT_MANAGER' && <UserCog className="w-3.5 h-3.5 text-blue-500" />}
                                                        {user.roles?.[0]?.role === 'TECHNICIAN' && <Settings className="w-3.5 h-3.5 text-purple-500" />}
                                                        <span className="capitalize text-foreground/90">{user.roles?.[0]?.role?.replace(/_/g, ' ') || 'User'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${user.is_active
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    <TimeDisplay timestamp={user.created_at} format="short" />
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    <TimeDisplay
                                                        timestamp={user.last_login_at}
                                                        format="relative"
                                                        fallback="Never"
                                                        className="font-medium"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => toast('Edit functionality coming soon', { icon: '🚧' })}
                                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                                            title="Edit User"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Keeping the Delete Modal as is for now */}
                <Modal
                    isOpen={isDeleteModalOpen && userToDelete !== null}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setDeleteAdminPassword('');
                    }}
                    title={
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Confirm Deletion
                        </div>
                    }
                    size="sm"
                    variant="destructive"
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setDeleteAdminPassword('');
                                }}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteUser}
                                disabled={
                                    userToDelete && (userToDelete.role === 'admin' || userToDelete.role === 'moderator') && !deleteAdminPassword
                                }
                                className="btn-primary bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Delete User
                            </button>
                        </>
                    }
                >
                    {userToDelete && (
                        <div className="space-y-4">
                            <p className="text-sm text-foreground/80">
                                Are you sure you want to delete user <span className="font-mono font-bold text-foreground">{userToDelete.email}</span>?
                                <br />
                                <span className="text-xs text-muted-foreground mt-1 block">This action cannot be undone.</span>
                            </p>

                            {/* Conditional Admin Password Field */}
                            {(userToDelete.roles?.some((r: any) => r.role === 'ORG_ADMIN' || r.role === 'SUPER_ADMIN')) && (
                                <div className="p-3 bg-primary/5 rounded-md border border-primary/10 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                                        <ShieldAlert className="w-3.5 h-3.5" /> Your Admin Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={deleteAdminPassword}
                                        onChange={(e) => setDeleteAdminPassword(e.target.value)}
                                        placeholder="Confirm identity to delete..."
                                        className="w-full px-3 py-2 bg-background border border-primary/20 rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                                    />
                                    <p className="text-[10px] text-primary/80 mt-1.5">
                                        Required to delete privileged accounts.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </Modal>
            </div>
        </DashboardLayout>
    );
}
