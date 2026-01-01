'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import SearchBar from '@/components/SearchBar';
import Modal from '@/components/Modal';
import TimeDisplay from '@/components/TimeDisplay';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Trash2, Shield, ShieldAlert, User as UserIcon, Users, MoreVertical, X, AlertTriangle, Pencil, Crown, UserCog, Eye, CheckCircle2, XCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface User {
    id: string;
    email: string;
    roles: { role: string }[];
    is_active: boolean;
    created_at: string;
    last_login_at?: string;
}

export default function UsersPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        id: '',
        password: '',
        confirmPassword: '',
        role: 'viewer', // This remains for the form state
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

    // Permission Check: Prevent flash of content
    useEffect(() => {
        if (!authLoading && user) {
            const isAdmin = user.roles?.some(r => r.role === 'ORG_ADMIN');
            if (!isAdmin) {
                router.replace('/not-found');
            }
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        // Only fetch if admin
        const isAdmin = user?.roles?.some(r => r.role === 'ORG_ADMIN');
        if (isAdmin) {
            fetchUsers();
        }
    }, [user]);

    // Auto-generate User ID when modal opens
    useEffect(() => {
        if (isModalOpen) {
            const randomId = 'U_' + Math.floor(1000 + Math.random() * 9000); // Simple 4-digit ID
            setNewUser(prev => ({ ...prev, id: randomId }));
            setPasswordStrength(0);
            setPasswordError('');
        }
    }, [isModalOpen]);

    // Render loading state or null while checking permissions
    // MOVED: strict check after all hooks to prevent "Rendered fewer hooks than expected"
    const isAdmin = user?.roles?.some(r => r.role === 'ORG_ADMIN');
    if (authLoading || (user && !isAdmin)) {
        return null;
    }

    const fetchUsers = async () => {
        try {
            const data = await usersApi.getAll();
            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            // console.error('Failed to fetch users:', error);
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
        if (pass.length >= 8) score++; // Length
        if (/[A-Z]/.test(pass)) score++; // Uppercase
        if (/[a-z]/.test(pass)) score++; // Lowercase
        if (/[0-9]/.test(pass)) score++; // Number
        if (/[^A-Za-z0-9]/.test(pass)) score++; // Special char

        setPasswordStrength(score);

        if (pass.length === 0) setPasswordError('');
        else if (pass.length < 8) setPasswordError('Min 8 chars required');
        else if (score < 5) setPasswordError('Weak password (needs Upper, Lower, Number, Special)');
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
            // console.error('Delete error', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete user';
            toast.error(errorMessage);
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">
                <Toaster position="bottom-right" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title">
                            <Users className="w-6 h-6 text-primary" />
                            User Management
                        </h1>
                        <p className="page-header-subtext">
                            Manage user access, roles, and permissions securely.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                </div>

                {/* Search */}
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search users..."
                />

                {/* Users Table */}
                <div className="bg-card border border-border rounded-sm overflow-hidden text-sm">
                    {/* Mobile Card View (Visible < md) */}
                    <div className="md:hidden space-y-3">
                        {isLoading ? (
                            <div className="p-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-sm border border-border animate-pulse">
                                Loading system data...
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-sm border border-border">
                                No users found matching "{searchQuery}"
                            </div>
                        ) : (
                            filteredUsers.map((user) => (
                                <div key={user.id} className="bg-card border border-border rounded-sm p-4 space-y-3 hover:border-primary/30 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                                                {user.email[0].toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground tracking-tight">{user.email}</span>
                                                <span className="text-xs text-muted-foreground/80 font-mono">{user.id}</span>
                                            </div>
                                        </div>
                                        <div className="relative group flex items-center gap-2">
                                            <button
                                                onClick={() => toast('Edit functionality coming soon', { icon: '🚧' })}
                                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-sm transition-colors border border-transparent hover:border-primary/20"
                                                title="Edit User"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm transition-colors border border-transparent hover:border-destructive/20"
                                                title="Delete User"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
                                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                                            {/* Role */}
                                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-muted/40">
                                                {user.roles?.[0]?.role === 'ORG_ADMIN' && <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
                                                {user.roles?.[0]?.role === 'EVENT_MANAGER' && <UserCog className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />}
                                                {user.roles?.[0]?.role === 'VIEWER' && <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                                                <span className="text-xs font-medium text-foreground capitalize">{user.roles?.[0]?.role?.replace('_', ' ') || 'User'}</span>
                                            </div>

                                            {/* Status */}
                                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-muted/40">
                                                {user.is_active
                                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                                                    : <XCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                                                }
                                                <span className="text-xs font-medium text-foreground">
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <TimeDisplay
                                                timestamp={user.created_at}
                                                format="short"
                                                className="text-[10px] font-medium text-muted-foreground whitespace-nowrap"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop Table View (Hidden < md) */}
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User Info</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Created Date</th>
                                    <th>Last Login</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-muted-foreground text-xs italic">
                                            Loading users...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-muted-foreground text-xs italic">
                                            No users found matching "{searchQuery}"
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                                                        {user.email[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-foreground tracking-tight leading-none">{user.email}</span>
                                                        <span className="text-xs text-muted-foreground/80 leading-tight mt-1">{user.id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-muted/40 transition-colors hover:bg-muted/60">
                                                    {user.roles?.[0]?.role === 'ORG_ADMIN' && <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
                                                    {user.roles?.[0]?.role === 'EVENT_MANAGER' && <UserCog className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />}
                                                    {user.roles?.[0]?.role === 'VIEWER' && <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                                                    <span className="text-xs font-medium text-foreground capitalize">{user.roles?.[0]?.role?.replace('_', ' ') || 'User'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-muted/40 transition-colors hover:bg-muted/60">
                                                    {user.is_active
                                                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                                                        : <XCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                                                    }
                                                    <span className="text-xs font-medium text-foreground">
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-xs text-muted-foreground font-medium">
                                                <TimeDisplay timestamp={user.created_at} format="short" />
                                            </td>
                                            <td className="text-xs text-muted-foreground font-medium">
                                                <TimeDisplay
                                                    timestamp={user.last_login_at}
                                                    format="full"
                                                    fallback="Never"
                                                    className="text-muted-foreground/50"
                                                />
                                            </td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toast('Edit functionality coming soon', { icon: '🚧' })}
                                                        className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-sm transition-colors border border-transparent hover:border-primary/20"
                                                        title="Edit User"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm transition-colors border border-transparent hover:border-destructive/20"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
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

                {/* Add User Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={
                        <div className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            Create New Account
                        </div>
                    }
                    size="md"
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="add-user-form"
                                disabled={
                                    isSubmitting ||
                                    !!passwordError ||
                                    !validateEmail(newUser.email) ||
                                    newUser.password !== newUser.confirmPassword ||
                                    ((newUser.role === 'admin' || newUser.role === 'moderator') && !newUser.adminPassword)
                                }
                                className="btn-primary"
                            >
                                {isSubmitting ? 'Provisioning...' : 'Create Account'}
                            </button>
                        </>
                    }
                >
                    <form id="add-user-form" onSubmit={handleCreateUser} className="space-y-4">
                        {/* User ID (Read Only) */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">User ID</label>
                            <input
                                type="text"
                                readOnly
                                value={newUser.id}
                                className="w-full px-3 py-2 bg-muted/40 border border-input rounded-md text-sm font-mono text-muted-foreground focus:outline-none cursor-not-allowed"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Auto-generated System ID
                            </p>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
                            <input
                                type="email"
                                required
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="user@example.com"
                                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
                            <input
                                type="password"
                                required
                                value={newUser.password}
                                onChange={(e) => {
                                    setNewUser({ ...newUser, password: e.target.value });
                                    checkPasswordStrength(e.target.value);
                                }}
                                placeholder="••••••••"
                                className={`w-full px-3 py-2 bg-background border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground/50 ${passwordError
                                    ? 'border-destructive/50 focus:ring-destructive/20 focus:border-destructive'
                                    : 'border-border focus:ring-primary/20 focus:border-primary'
                                    }`}
                            />

                            {/* Password Strength Meter (Below Input) */}
                            <div className="mt-2 text-[10px] text-muted-foreground font-medium flex items-center justify-between">
                                <span>Strength:</span>
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-4 h-1 rounded-full transition-colors ${i < passwordStrength
                                                ? (passwordStrength < 3 ? 'bg-destructive' : passwordStrength < 5 ? 'bg-yellow-500' : 'bg-green-500')
                                                : 'bg-muted-foreground/20'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {passwordError ? (
                                <p className="text-[10px] text-destructive mt-1.5 font-medium flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" /> {passwordError}
                                </p>
                            ) : (
                                <p className="text-[10px] text-muted-foreground mt-1.5">
                                    Must include Upper, Lower, Number & Special char
                                </p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={newUser.confirmPassword}
                                onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                                placeholder="••••••••"
                                className={`w-full px-3 py-2 bg-background border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground/50 ${newUser.confirmPassword && newUser.password !== newUser.confirmPassword
                                    ? 'border-destructive/50 focus:ring-destructive/20 focus:border-destructive'
                                    : 'border-border focus:ring-primary/20 focus:border-primary'
                                    }`}
                            />
                            {newUser.confirmPassword && newUser.password !== newUser.confirmPassword && (
                                <p className="text-[10px] text-destructive mt-1.5 font-medium">Passwords do not match</p>
                            )}
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Role Authorization</label>
                            <div className="relative">
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                                >
                                    <option value="viewer">Viewer (Read Only)</option>
                                    <option value="moderator">Moderator (Manage Content)</option>
                                    <option value="admin">Administrator (Full Access)</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                    <MoreVertical className="w-4 h-4 rotate-90" />
                                </div>
                            </div>
                        </div>

                        {/* Admin Authorization (Conditional) */}
                        {(newUser.role === 'admin' || newUser.role === 'moderator') && (
                            <div className="p-3 bg-primary/5 rounded-md border border-primary/10 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5" /> Your Admin Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={newUser.adminPassword}
                                    onChange={(e) => setNewUser({ ...newUser, adminPassword: e.target.value })}
                                    placeholder="Confirm your identity..."
                                    className="w-full px-3 py-2 bg-background border border-primary/20 rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                                />
                                <p className="text-[10px] text-primary/80 mt-1.5">
                                    Required to create privileged accounts.
                                </p>
                            </div>
                        )}
                    </form>
                </Modal>

                {/* Delete User Confirmation Modal */}
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
                            {(userToDelete.role === 'admin' || userToDelete.role === 'moderator') && (
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
