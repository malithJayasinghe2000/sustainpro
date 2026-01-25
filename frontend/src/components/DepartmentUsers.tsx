'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { hasRole, ROLES, ROLE_LABELS, isAdmin } from '@/lib/roles';
import { Plus, Trash2, User as UserIcon, Search, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { useRouter } from 'next/navigation';
import PasswordRequirements, { usePasswordValidation } from '@/components/PasswordRequirements';

interface User {
    id: string;
    full_name: string;
    email: string;
    role_code?: string;
    role_name?: string;
    roles?: any[];
    [key: string]: any;
}

interface DepartmentUsersProps {
    deptId: string;
    eventId: string;
    user: any; // Current logged in user
    organizationId?: string;
}

export default function DepartmentUsers({ deptId, eventId, user, organizationId }: DepartmentUsersProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Modal Mode
    const [addMode, setAddMode] = useState<'create' | 'existing'>('existing');

    // Existing User Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedExistingUser, setSelectedExistingUser] = useState<User | null>(null);

    // Form state (New User)
    const [newUser, setNewUser] = useState({
        full_name: '',
        email: '',
        password: '',
    });
    const [selectedRole, setSelectedRole] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const router = useRouter();

    useEffect(() => {
        loadUsers();
    }, [deptId]);

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 2 && addMode === 'existing') {
                performLookup();
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, addMode]);

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const response = await usersApi.getAll({
                department_id: deptId,
                event_id: eventId
            });
            const userList = Array.isArray(response) ? response : (response.data || []);
            setUsers(userList);
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('Failed to load department users');
        } finally {
            setIsLoading(false);
        }
    };



    // Permission Logic
    const canAddUser = () => {
        if (!user) return false;
        if (user.is_super_admin) return true;
        const allowedRoles = [ROLES.EVENT_MANAGER, ROLES.DEPT_HEAD];
        return hasRole(user, allowedRoles);
    };

    const getAllowedRoles = () => {
        if (user.is_super_admin) return Object.values(ROLES);

        const myRoles = user.roles?.map((r: any) => r.role) || [];

        if (myRoles.includes(ROLES.SERVICE_SUPERVISOR) && !myRoles.includes(ROLES.DEPT_HEAD) && !myRoles.includes(ROLES.EVENT_MANAGER)) {
            return [ROLES.TECHNICIAN, ROLES.VIEWER];
        }

        if (myRoles.includes(ROLES.DEPT_HEAD) || myRoles.includes(ROLES.EVENT_MANAGER)) {
            return [ROLES.SERVICE_SUPERVISOR, ROLES.TECHNICIAN, ROLES.VIEWER];
        }

        return [];
    };

    // Validating password for new user
    const { isValid: isPasswordValid, checks } = usePasswordValidation(newUser.password);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) {
            toast.error('Please select a role');
            return;
        }

        if (!isPasswordValid) {
            toast.error('Password does not meet requirements');
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = {
                ...newUser,
                organization_id: organizationId,
                roles: [{
                    role: selectedRole,
                    organization_id: organizationId,
                    event_id: eventId,
                    department_id: deptId,
                }]
            };

            await usersApi.create(payload);
            toast.success('User created and assigned successfully');
            closeModal();
            loadUsers();
        } catch (error: any) {
            console.error('Failed to create user:', error);
            const msg = error.response?.data?.error || 'Failed to create user';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddExistingUser = async () => {
        if (!selectedExistingUser || !selectedRole) return;

        try {
            setIsSubmitting(true);
            // Use update to add role assignment
            await usersApi.update(selectedExistingUser.id, {
                role: selectedRole,
                organization_id: organizationId,
                event_id: eventId,
                department_id: deptId
            });

            toast.success('User added to department');
            closeModal();
            loadUsers();
        } catch (error: any) {
            console.error('Failed to add existing user:', error);
            const msg = error.response?.data?.error || 'Failed to add user';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setNewUser({ full_name: '', email: '', password: '' });
        setSelectedRole('');
        setSearchQuery('');
        setSearchResults([]);
        setSelectedExistingUser(null);
        setAddMode('existing');
        setFilterRole(''); // Reset filter role
    };

    // State for Existing User Filter
    const [filterRole, setFilterRole] = useState('');

    useEffect(() => {
        if (addMode === 'existing' && filterRole) {
            performLookup();
        } else if (addMode === 'existing' && !filterRole) {
            setSearchResults([]);
        }
    }, [filterRole, addMode]); // Re-run when filter role changes

    // Update performLookup to use filterRole
    const performLookup = async () => {
        try {
            setIsSearching(true);

            // Build params
            const params: any = {
                organization_id: organizationId,
                limit: 50 // Fetch more if we are filtering by role
            };

            if (searchQuery) {
                params.search = searchQuery;
            }

            if (filterRole) {
                params.role = filterRole;
            } else if (!searchQuery) {
                // If no search query AND no role filter, usually don't search. 
                // But user wants to see "all system exist user that role" when role selected.
                // So if filterRole is set, we search even without query.
                // If neither, return empty.
                setIsSearching(false);
                setSearchResults([]);
                return;
            }

            const response = await usersApi.getAll(params);

            const results = Array.isArray(response) ? response : (response.data || []);

            // Filter out users already in this department
            let filtered = results.filter((u: User) =>
                !users.some(existing => existing.id === u.id)
            );

            setSearchResults(filtered);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const allowedRoles = getAllowedRoles();

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading users...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg">Department Team</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage users assigned to this department
                    </p>
                </div>
                {canAddUser() && (
                    <button
                        onClick={() => {
                            if (isAdmin(user) || user.is_super_admin) {
                                const params = new URLSearchParams({
                                    organization_id: organizationId || '',
                                    event_id: eventId,
                                    department_id: deptId,
                                    return_url: window.location.pathname
                                });
                                router.push(`/users/new?${params.toString()}`);
                            } else {
                                setShowAddModal(true);
                            }
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Member
                    </button>
                )}
            </div>

            {users.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                    <UserIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No users found in this department.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((u) => (
                        <div key={u.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-all">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="font-semibold text-primary">
                                        {u.full_name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium truncate">{u.full_name || 'Unnamed User'}</h4>
                                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {u.roles?.filter((r: any) => r.dept_id === deptId).map((r: any, idx: number) => (
                                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                                                {ROLE_LABELS[r.role] || r.role}
                                            </span>
                                        ))}
                                        {(!u.roles?.some((r: any) => r.dept_id === deptId)) && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                                                Member (No Explicit Role)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add User Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={closeModal}
                title="Add Member to Department"
            >
                <div className="space-y-6">
                    {/* Tabs */}
                    <div className="flex bg-muted rounded-lg p-1">
                        <button
                            onClick={() => setAddMode('existing')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${addMode === 'existing'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Add Existing User
                        </button>
                        <button
                            onClick={() => setAddMode('create')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${addMode === 'create'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Create New User
                        </button>
                    </div>

                    {addMode === 'existing' ? (
                        <div className="space-y-4">
                            {!selectedExistingUser ? (
                                <div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-1">Select Role to Filter</label>
                                        <select
                                            value={filterRole}
                                            onChange={(e) => setFilterRole(e.target.value)}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                        >
                                            <option value="" disabled>-- Select Role --</option>
                                            {allowedRoles.map(role => (
                                                <option key={role} value={role}>
                                                    {ROLE_LABELS[role] || role}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {filterRole && (
                                        <>
                                            <label className="block text-sm font-medium mb-1">Search User (Optional)</label>
                                            <div className="relative mb-4">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background"
                                                    placeholder="Search by name or email..."
                                                />
                                            </div>

                                            <div className="mt-2 border border-border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                                {isSearching ? (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                                                ) : searchResults.length > 0 ? (
                                                    <div className="divide-y divide-border">
                                                        {searchResults.map(u => (
                                                            <button
                                                                key={u.id}
                                                                onClick={() => {
                                                                    setSelectedExistingUser(u);
                                                                    setSelectedRole(filterRole); // Auto-select the filtered role
                                                                }}
                                                                className="w-full flex items-center px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                                                    <span className="text-xs font-semibold text-primary">
                                                                        {u.full_name?.charAt(0) || u.email.charAt(0)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium">{u.full_name}</div>
                                                                    <div className="text-xs text-muted-foreground">{u.email}</div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                        No users found with role {ROLE_LABELS[filterRole] || filterRole}.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                    {!filterRole && (
                                        <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                                            Please select a role above to see available users.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                            <Check className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{selectedExistingUser.full_name}</div>
                                            <div className="text-sm text-muted-foreground">{selectedExistingUser.email}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedExistingUser(null)}
                                        className="p-2 hover:bg-muted rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {selectedExistingUser && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Assign Role</label>
                                    <select
                                        required
                                        value={selectedRole}
                                        onChange={e => setSelectedRole(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                    >
                                        <option value="">Select Role</option>
                                        {allowedRoles.map(role => (
                                            <option key={role} value={role}>
                                                {ROLE_LABELS[role] || role}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddExistingUser}
                                    disabled={!selectedExistingUser || !selectedRole || isSubmitting}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Adding...' : 'Add User'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.full_name}
                                    onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        required
                                        value={newUser.password}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background mb-2"
                                        placeholder="Note: Must meet security requirements"
                                    />
                                    <PasswordRequirements password={newUser.password} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select
                                    required
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                >
                                    <option value="">Select Role</option>
                                    {allowedRoles.map(role => (
                                        <option key={role} value={role}>
                                            {ROLE_LABELS[role] || role}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !isPasswordValid}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create & Add'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>
        </div>
    );
}
