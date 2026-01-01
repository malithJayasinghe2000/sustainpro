'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, List, Search, Filter, MoreVertical, Shield, Building, CheckCircle, XCircle, Users, ChevronDown, ChevronRight, Briefcase, UserCog, UserPlus, Factory } from 'lucide-react';
import { usersApi, organizationsApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { getRoleLabel, ROLES } from '@/lib/roles';
import { Organization } from '@/types/auth';
import toast from 'react-hot-toast';

export default function GlobalUsersPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [users, setUsers] = useState<any[]>([]);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        code: '',
        role: ROLES.TECHNICIAN as string,
        organization_id: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [usersData, orgsData] = await Promise.all([
                usersApi.getAll(),
                organizationsApi.getAll()
            ]);
            setUsers(Array.isArray(usersData) ? usersData : (usersData.data || []));
            setOrgs(orgsData);

            // Set default org if available
            if (orgsData.length > 0 && !newUser.organization_id) {
                setNewUser(prev => ({ ...prev, organization_id: orgsData[0].id }));
            }
        } catch (error) {
            console.error('Load data error:', error);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.organization_id || !newUser.email || !newUser.password || !newUser.role) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setIsSubmitting(true);
            await usersApi.create(newUser);
            toast.success('User created successfully');
            setShowAddModal(false);
            setNewUser({ ...newUser, email: '', password: '', code: '' }); // Reset form
            loadData(); // Refresh list
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter Logic: Exclude Super Admins, filter by Search
    const orgUsers = users.filter(u => !u.is_super_admin);
    const filteredUsers = orgUsers.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group Users by Org
    // We iterate orgs to show even empty orgs
    const usersByOrg: Record<string, any[]> = {};
    orgs.forEach(o => usersByOrg[o.id] = []); // Initialize

    filteredUsers.forEach(u => {
        if (usersByOrg[u.organization_id]) {
            usersByOrg[u.organization_id].push(u);
        } else if (u.organization_id) {
            // Handle users in orgs we might not have fetched or were deleted? 
            // Should not happen if data consistent.
        }
    });

    // Role Hierarchy for Sorting
    const ROLE_PRIORITY = [
        ROLES.ORG_ADMIN,
        ROLES.EVENT_MANAGER,
        ROLES.DEPT_HEAD,
        ROLES.SERVICE_SUPERVISOR,
        ROLES.TECHNICIAN,
        ROLES.VIEWER
    ];

    const sortUsersByRole = (usersList: any[]) => {
        return [...usersList].sort((a, b) => {
            const roleA = a.roles?.[0]?.role;
            const roleB = b.roles?.[0]?.role;
            return ROLE_PRIORITY.indexOf(roleA) - ROLE_PRIORITY.indexOf(roleB);
        });
    };

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Users className="w-6 h-6 text-primary" />
                            Global User Management
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Provision and manage users across all organizations
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-primary/20"
                        >
                            <UserPlus className="w-4 h-4" /> Add User
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search organization users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                </div>

                {/* Organization Cards */}
                {isLoading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-card rounded-xl border border-border" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {orgs.map(org => {
                            const orgUserList = usersByOrg[org.id] || [];
                            const sortedUsers = sortUsersByRole(orgUserList);

                            // Skip org if searching and no match in org users (optional, currently we show Empty org if search doesn't match users, maybe better to hide empty orgs during search?)
                            // If searchQuery is present and orgUserList is empty, hide?
                            if (searchQuery && orgUserList.length === 0) return null;

                            return (
                                <div key={org.id} className="bg-card w-full border border-border rounded-xl shadow-sm overflow-hidden">
                                    {/* Org Header */}
                                    <div className="bg-muted/30 px-6 py-4 border-b border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <Factory className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-foreground">{org.name}</h2>
                                                <p className="text-xs text-muted-foreground">{orgUserList.length} user{orgUserList.length !== 1 ? 's' : ''}</p>
                                            </div>
                                        </div>
                                        <button className="text-sm font-medium text-primary hover:underline">
                                            Manage Organization
                                        </button>
                                    </div>

                                    {/* User Grid */}
                                    {sortedUsers.length > 0 ? (
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {sortedUsers.map(user => {
                                                const role = user.roles?.[0]?.role;
                                                const isHighLevel = role === ROLES.ORG_ADMIN;

                                                return (
                                                    <div key={user.id} className={`bg-background border ${isHighLevel ? 'border-primary/40 bg-primary/5' : 'border-border'} rounded-lg p-4 flex flex-col gap-3 group relative hover:shadow-md transition-all`}>
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${isHighLevel ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                                                                    {user.email[0].toUpperCase()}
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-medium text-sm truncate w-36" title={user.email}>{user.email}</span>
                                                                    <span className="text-[10px] text-muted-foreground font-mono">{user.code || 'NO-CODE'}</span>
                                                                </div>
                                                            </div>
                                                            {user.is_active ?
                                                                <div className="w-2 h-2 bg-green-500 rounded-full" title="Active" /> :
                                                                <div className="w-2 h-2 bg-red-500 rounded-full" title="Inactive" />
                                                            }
                                                        </div>

                                                        <div className="pt-2 mt-auto border-t border-border/50 flex flex-col gap-1">
                                                            <span className={`text-xs font-semibold ${isHighLevel ? 'text-primary' : 'text-muted-foreground'}`}>
                                                                {getRoleLabel(role)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground text-sm font-light italic">
                                            No users assigned to this organization.
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Provision New User"
                size="md"
            >
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium">Organization</label>
                            <div className="relative">
                                <Factory className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                <select
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                                    value={newUser.organization_id}
                                    onChange={(e) => setNewUser({ ...newUser, organization_id: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select Organization</option>
                                    {orgs.map(org => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium">Email Address</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                                placeholder="user@company.com"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                                placeholder="Initial password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Employee Code</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                                placeholder="EMP-001 (Optional)"
                                value={newUser.code}
                                onChange={(e) => setNewUser({ ...newUser, code: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium">Role Assignment</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                <select
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    required
                                >
                                    {Object.values(ROLES).filter(r => r !== 'SUPER_ADMIN').map(role => (
                                        <option key={role} value={role}>{getRoleLabel(role)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                        <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium shadow-md transition-all flex items-center gap-2"
                        >
                            {isSubmitting ? 'Creating...' : <><UserPlus className="w-4 h-4" /> Create User</>}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
