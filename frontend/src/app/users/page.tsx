'use client';

// ... imports
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import TimeDisplay from '@/components/TimeDisplay';
import { usersApi, rolesApi, Role } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LEVELS, ROLE_LABELS } from '@/lib/roles';

import { RichSelect } from '@/components/ui/RichSelect';
import {
    Plus, Search, Trash2, Shield, ShieldAlert, User as UserIcon, Users,
    MoreVertical, X, AlertTriangle, Pencil, Crown, UserCog, Eye,
    CheckCircle2, XCircle, Building2, Filter, LayoutList, ListTree,
    ChevronRight, ChevronDown, ChevronLeft, Activity, Settings, Calendar
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface User {
    id: string;
    email: string;
    full_name?: string;
    roles: { role: string }[];
    role_code?: string;
    role_name?: string;
    is_active: boolean;
    force_password_change?: boolean;
    created_at: string;
    last_login_at?: string;
    org_name?: string; // For Super Admin view
    org_logo?: string;
    org_id?: string; // Ideally we have this
}

type ViewMode = 'table' | 'tree';

// Use centralized ROLE_LEVELS from roles.ts for consistency
const getRolePriority = (role?: string) => ROLE_LEVELS[role || 'VIEWER'] ?? 99;

export default function UsersPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
    });

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    // We can persist viewMode in localStorage later if needed

    // Filters
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [orgFilter, setOrgFilter] = useState('ALL');
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

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

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [editFormData, setEditFormData] = useState({
        full_name: '',
        email: '',
        timezone: 'Asia/Colombo',
        is_active: true,
        role: '',
    });

    const [passwordError, setPasswordError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Fetch available roles for filter
    useEffect(() => {
        rolesApi.getAll()
            .then(roles => setAvailableRoles(roles.filter(r => r.code !== 'SUPER_ADMIN')))
            .catch(err => console.error('Failed to fetch roles:', err));
    }, []);

    // Permission Check: Allow Super Admin OR users with users.view permission
    useEffect(() => {
        if (!authLoading && user) {
            const hasAccess = user.is_super_admin || 
                              user.permissions?.includes('users.view') ||
                              user.roles?.some(r => r.role === 'ORG_ADMIN');
            if (!hasAccess) {
                router.replace('/not-found');
            }
        }
    }, [user, authLoading, router]);

    // Fetch users when filters or page changes
    useEffect(() => {
        if (user && !authLoading) {
            const timeoutId = setTimeout(() => {
                fetchUsers();
            }, 300); // 300ms debounce
            return () => clearTimeout(timeoutId);
        }
    }, [user, authLoading, pagination.page, searchQuery, roleFilter, orgFilter]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [searchQuery, roleFilter, orgFilter]);

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
        setIsLoading(true);
        try {
            const data = await usersApi.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search: searchQuery,
                role: roleFilter === 'ALL' ? undefined : roleFilter,
                organization_id: orgFilter === 'ALL' ? undefined : orgFilter
            });
            if (data.success) {
                setUsers(data.data);
                if (data.meta) {
                    setPagination(prev => ({
                        ...prev,
                        total: data.meta.total,
                        pages: data.meta.pages
                    }));
                }
            }
        } catch (error) {
            console.error(error);
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
            toast.success('User created! They will receive login credentials via email.');
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

    // Edit User Handlers
    const handleEditUser = (user: User) => {
        setUserToEdit(user);
        setEditFormData({
            full_name: user.full_name || '',
            email: user.email,
            timezone: 'Asia/Colombo',
            is_active: user.is_active,
            role: user.role_code || user.roles?.[0]?.role || '',
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToEdit) return;

        setIsSubmitting(true);
        try {
            const updatePayload: any = {
                full_name: editFormData.full_name,
                email: editFormData.email,
                timezone: editFormData.timezone,
                is_active: editFormData.is_active,
            };

            // Only include role if it's been changed (not empty)
            if (editFormData.role) {
                updatePayload.role = editFormData.role;
            }

            await usersApi.update(userToEdit.id, updatePayload);
            toast.success('User updated successfully');
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update user');
        } finally {
            setIsSubmitting(false);
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

    // Role Options - dynamically built from API or fallback to static
    const roleOptions = useMemo(() => {
        const defaultOption = { value: 'ALL', label: 'All Roles', icon: Users };

        if (availableRoles.length > 0) {
            // Use dynamic roles from API
            return [
                defaultOption,
                ...availableRoles.map(role => ({
                    value: role.code,
                    label: role.name,
                    icon: Users // Could map icons dynamically too, but keeping simple
                }))
            ];
        }

        // Fallback to static options
        return [
            defaultOption,
            { value: 'ORG_ADMIN', label: 'Org Admin', icon: Crown },
            { value: 'EVENT_MANAGER', label: 'Event Manager', icon: UserCog },
            { value: 'DEPT_HEAD', label: 'Dept Head', icon: UserIcon },
            { value: 'SERVICE_SUPERVISOR', label: 'Supervisor', icon: Eye },
            { value: 'TECHNICIAN', label: 'Technician', icon: Shield },
            { value: 'SERVICE_SUPPLIER', label: 'Service Supplier', icon: Shield },
            { value: 'VIEWER', label: 'Viewer', icon: Eye }
        ];
    }, [availableRoles]);

    // Server-side filtering is now used, so we just use the users array directly
    const filteredUsers = users;

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
            const primaryRole = u.role_code || 'NO_ROLE';

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
                                                                                onClick={() => handleEditUser(user)}
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

    const hasAccess = user?.is_super_admin || 
                  user?.permissions?.includes('users.view') ||
                  user?.roles?.some(r => r.role === 'ORG_ADMIN');
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
                    <>
                        <div className="bg-card border border-border rounded-lg overflow-hidden text-sm shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="data-table w-full text-left">
                                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">User Info</th>
                                            {isSuperAdmin && <th className="px-4 py-3">Organization</th>}
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Password</th>
                                            <th className="px-4 py-3">Created</th>
                                            <th className="px-4 py-3">Last Login</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={isSuperAdmin ? 8 : 7} className="text-center py-12 text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                        <span className="text-xs">Loading users...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={isSuperAdmin ? 8 : 7} className="text-center py-12 text-muted-foreground">
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
                                                            {user.role_code === 'ORG_ADMIN' && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />}
                                                            {user.role_code === 'EVENT_MANAGER' && <UserCog className="w-3.5 h-3.5 text-blue-500" />}
                                                            {user.role_code === 'TECHNICIAN' && <Settings className="w-3.5 h-3.5 text-purple-500" />}
                                                            {user.role_code === 'DEPT_HEAD' && <UserIcon className="w-3.5 h-3.5 text-teal-500" />}
                                                            {user.role_code === 'SERVICE_SUPERVISOR' && <Activity className="w-3.5 h-3.5 text-orange-500" />}
                                                            {user.role_code === 'VIEWER' && <Eye className="w-3.5 h-3.5 text-gray-500" />}
                                                            <span className="capitalize text-foreground/90">{user.role_name || user.role_code?.replace(/_/g, ' ') || 'No Role'}</span>
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
                                                    <td className="px-4 py-3">
                                                        {user.force_password_change ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-amber-500/10 text-amber-600 border-amber-500/20">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                Pending
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-muted/50 text-muted-foreground border-border">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                                                                Set
                                                            </div>
                                                        )}
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
                                                                onClick={() => handleEditUser(user)}
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

                        {/* Pagination Controls */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                    disabled={pagination.page === 1 || isLoading}
                                    className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="text-sm font-medium text-muted-foreground">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                                    disabled={pagination.page >= pagination.pages || isLoading}
                                    className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}

                    </>
                )}

                {/* Edit User Modal */}
                <Modal
                    isOpen={isEditModalOpen && userToEdit !== null}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setUserToEdit(null);
                    }}
                    title={
                        <div className="flex items-center gap-2">
                            <Pencil className="w-5 h-5" />
                            Edit User
                        </div>
                    }
                    size="md"
                >
                    {userToEdit && (
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.full_name}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                    placeholder="User's full name"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                    Status
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditFormData(prev => ({ ...prev, is_active: true }))}
                                        className={cn(
                                            "flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-all",
                                            editFormData.is_active
                                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                                                : "bg-background border-border text-muted-foreground hover:border-emerald-300"
                                        )}
                                    >
                                        <CheckCircle2 className="w-4 h-4 inline mr-2" />
                                        Active
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditFormData(prev => ({ ...prev, is_active: false }))}
                                        className={cn(
                                            "flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-all",
                                            !editFormData.is_active
                                                ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                                                : "bg-background border-border text-muted-foreground hover:border-rose-300"
                                        )}
                                    >
                                        <XCircle className="w-4 h-4 inline mr-2" />
                                        Inactive
                                    </button>
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                    Role
                                </label>
                                <select
                                    value={editFormData.role}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                >
                                    <option value="">No change</option>
                                    {availableRoles.map((role) => (
                                        <option key={role.id} value={role.code}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Current: {ROLE_LABELS[userToEdit?.role_code || userToEdit?.roles?.[0]?.role] || 'Unknown'}
                                </p>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setUserToEdit(null);
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn-primary disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    )}
                </Modal>

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
            </div >
        </DashboardLayout >
    );
}
