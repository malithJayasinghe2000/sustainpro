'use client';
import LoadingSpinner from '@/components/LoadingSpinner';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { organizationsApi, usersApi, devicesApi, getImageUrl } from '@/lib/api';
import { Organization } from '@/types/auth';
import { getPrimaryColor } from '@/lib/theme-parser';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ImageUpload from '@/components/ImageUpload';
import {
    ArrowLeft,
    Building2,
    Users,
    Smartphone,
    Settings,
    MapPin,
    Globe,
    Mail,
    Phone,
    CreditCard,
    Shield,
    Activity,
    MoreVertical,
    Plus,
    Edit,
    CheckCircle,
    XCircle,
    Save,
    AlertTriangle,
    Palette
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrganizationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [org, setOrg] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'devices' | 'settings'>('overview');

    // Tab Data State
    const [users, setUsers] = useState<any[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
    const [isTabLoading, setIsTabLoading] = useState(false);

    // Settings Form State
    const [editForm, setEditForm] = useState<Partial<Organization>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    // Create User Modal State
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ email: '', full_name: '', password: '', role: 'ORG_ADMIN' });
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchOrgDetails(params.id as string);
        }
    }, [params.id]);

    // Fetch tab data when active tab changes
    useEffect(() => {
        if (!org?.id) return;

        const loadTabData = async () => {
            setIsTabLoading(true);
            try {
                if (activeTab === 'users') {
                    const allUsers = await usersApi.getAll();
                    const usersList = Array.isArray(allUsers) ? allUsers : (allUsers.data || []);
                    // Client-side filter for now
                    const orgUsers = usersList.filter((u: any) => u.organization_id === org.id);
                    setUsers(orgUsers);
                } else if (activeTab === 'devices') {
                    const allDevices = await devicesApi.getAll();
                    const devicesList = Array.isArray(allDevices) ? allDevices : (allDevices.data || []);
                    // Client-side filter for now
                    const orgDevices = devicesList.filter((d: any) => d.organization_id === org.id);
                    setDevices(orgDevices);
                }
            } catch (error) {
                console.error(`Failed to load ${activeTab} data:`, error);
            } finally {
                setIsTabLoading(false);
            }
        };

        if (activeTab === 'users' || activeTab === 'devices') {
            loadTabData();
        }
    }, [activeTab, org?.id]);

    const fetchOrgDetails = async (id: string) => {
        try {
            setIsLoading(true);
            const data = await organizationsApi.getOne(id);
            setOrg(data);
            setEditForm(data); // Initialize edit form
        } catch (error) {
            console.error('Failed to fetch org details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!org?.id) return;
        try {
            setIsSaving(true);
            await organizationsApi.update(org.id, editForm);
            // Refresh
            await fetchOrgDetails(org.id);
            await fetchOrgDetails(org.id);
            toast.success('Organization settings saved successfully.');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteOrganization = async () => {
        if (!org?.id) return;
        if (!deletePassword) {
            toast.warning('Please enter your password to confirm.');
            return;
        }

        try {
            setIsDeleting(true);
            await organizationsApi.delete(org.id, deletePassword);
            toast.success('Organization deleted successfully');
            router.push('/admin/organizations');
        } catch (error: any) {
            console.error('Failed to delete organization:', error);
            const msg = error.response?.data?.error || 'Failed to delete organization';
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateUser = async () => {
        if (!org?.id) return;
        if (!newUserForm.email || !newUserForm.password || !newUserForm.full_name) {
            toast.warning('Please fill in all required fields.');
            return;
        }

        try {
            setIsCreatingUser(true);
            await usersApi.create({
                email: newUserForm.email,
                password: newUserForm.password,
                full_name: newUserForm.full_name,
                organizationId: org.id,
                role: newUserForm.role
            });
            toast.success('User created! They will receive login credentials via email.');
            setShowCreateUserModal(false);
            setNewUserForm({ email: '', full_name: '', password: '', role: 'ORG_ADMIN' });

            // Refresh users list
            const allUsers = await usersApi.getAll();
            const usersList = Array.isArray(allUsers) ? allUsers : (allUsers.data || []);
            const orgUsers = usersList.filter((u: any) => u.organization_id === org.id);
            setUsers(orgUsers);
        } catch (error: any) {
            console.error('Failed to create user:', error);
            const msg = error.response?.data?.error || 'Failed to create user';
            toast.error(msg);
        } finally {
            setIsCreatingUser(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <LoadingSpinner className="" />
                </div>
            </DashboardLayout>
        );
    }

    if (!org) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
                    <h2 className="text-xl font-semibold">Organization Not Found</h2>
                    <Button onClick={() => router.push('/admin/organizations')}>
                        Return to List
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    // Get organization's primary color using the theme parser
    const orgPrimaryColor = getPrimaryColor(org?.theme_config);

    // Helper Components
    const StatCard = ({ label, value, icon: Icon, color }: any) => (
        <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between">
            <div>
                <p className="text-sm text-muted-foreground font-medium">{label}</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col gap-6">
                    {/* Breadcrumb / Back */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <button
                            onClick={() => router.push('/admin/organizations')}
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Organizations
                        </button>
                        <span>/</span>
                        <span className="text-foreground font-medium">{org.name}</span>
                    </div>

                    {/* Main Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                    {org.name}
                                    {/* 
                                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${org.subscription_status === 'ACTIVE'
                                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                                        }`}>
                                        {org.subscription_status || 'ACTIVE'}
                                    </span>
                                    */}
                                </h1>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground bg-card/50 p-1.5 rounded-lg border border-border/50 w-fit">
                                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{org.code}</span>
                                    <span>•</span>
                                    <span>{org.industry || 'No Industry'}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {org.city && org.country ? `${org.city}, ${org.country}` : 'Remote'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 self-start">
                            <Button variant="outline" onClick={() => setActiveTab('settings')}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Profile
                            </Button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
                        {[
                            { id: 'overview', label: 'Overview', icon: Activity },
                            { id: 'users', label: 'Users', icon: Users },
                            { id: 'devices', label: 'Devices', icon: Smartphone },
                            { id: 'settings', label: 'Settings', icon: Settings },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* OVERVIEW CONTENT */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Stats & Profile */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                                    <div className="absolute top-0 right-0 p-4 opacity-25 group-hover:opacity-40 transition-opacity">
                                        <Users className="w-16 h-16 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground z-10 relative">Total Users</p>
                                    <h3 className="text-3xl font-bold mt-2 text-foreground z-10 relative">{org.user_count || 0}</h3>
                                    <div className="mt-2 text-xs text-muted-foreground z-10 relative bg-muted/50 rounded px-2 py-1 w-fit">
                                        Limit: {(org.max_users || 0) > 100000 ? 'Unlimited' : org.max_users}
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                                    <div className="absolute top-0 right-0 p-4 opacity-25 group-hover:opacity-40 transition-opacity">
                                        <Smartphone className="w-16 h-16 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground z-10 relative">Total Devices</p>
                                    <h3 className="text-3xl font-bold mt-2 text-foreground z-10 relative">{org.device_count || 0}</h3>
                                    <div className="mt-2 text-xs text-muted-foreground z-10 relative bg-muted/50 rounded px-2 py-1 w-fit">
                                        Limit: {(org.max_devices || 0) > 100000 ? 'Unlimited' : org.max_devices}
                                    </div>
                                </div>
                            </div>

                            {/* Description/About */}
                            <div className="bg-card border border-border rounded-xl p-8 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent"></div>
                                <h3 className="font-bold mb-6 text-lg flex items-center gap-2 text-foreground">
                                    <Building2 className="w-5 h-5 text-primary" />
                                    About Organization
                                </h3>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
                                    {org.description || "No description provided for this organization."}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12 mt-8 pt-8 border-t border-border">
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Globe className="w-3.5 h-3.5 text-primary" /> Website
                                        </span>
                                        <a href={org.website || '#'} target="_blank" className="text-foreground hover:text-primary transition-colors flex items-center gap-2 w-fit font-medium text-sm group pl-5.5">
                                            {org.website || 'N/A'}
                                        </a>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 text-primary" /> Primary Email
                                        </span>
                                        <a href={`mailto:${org.contact_email}`} className="text-foreground hover:text-primary transition-colors flex items-center gap-2 w-fit text-sm pl-5.5">
                                            {org.contact_email}
                                        </a>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-primary" /> Phone
                                        </span>
                                        <span className="flex items-center gap-2 text-foreground text-sm pl-5.5">
                                            {org.phone || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-primary" /> Location
                                        </span>
                                        <span className="flex items-center gap-2 text-foreground text-sm pl-5.5">
                                            {org.address}, {org.city}, {org.country}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Billing & Contact Sidebar */}
                        <div className="h-full">
                            {/* Branding Preview */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm h-full">
                                <div
                                    className="h-24 relative"
                                    style={{
                                        background: `linear-gradient(to bottom right, ${orgPrimaryColor}, #000000)`
                                    }}
                                >
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                </div>
                                <div className="px-6 pb-6 -mt-10 relative">
                                    <div className="w-20 h-20 bg-white rounded-xl shadow-lg flex items-center justify-center p-2 mb-4 border border-border">
                                        {org.logo_url ? (
                                            <img src={getImageUrl(org.logo_url) || ''} className="w-full h-full object-contain" alt="Logo" />
                                        ) : (
                                            <span className="text-2xl font-bold text-gray-900">{org.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-lg">{org.name}</h3>
                                    <p className="text-xs text-muted-foreground mb-4">{org.code}</p>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                            <span className="text-muted-foreground">Industry</span>
                                            <span className="font-medium">{org.industry || '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                            <span className="text-muted-foreground">Timezone</span>
                                            <span className="font-medium">{org.timezone || 'UTC'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                            <span className="text-muted-foreground">Type</span>
                                            <span className="font-medium">{org.type}</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                            <span className="text-muted-foreground">Plan</span>
                                            <span className="font-medium">{org.plan_tier}</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                            <span className="text-muted-foreground">Created On</span>
                                            <span className="font-medium">
                                                {org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* USERS CONTENT */}
                {activeTab === 'users' && (
                    <div className="bg-card border border-border rounded-xl shadow-sm">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Organization Users
                            </h3>
                            <Button size="sm" onClick={() => router.push(`/users/new?org=${org.id}`)}>
                                <Plus className="w-4 h-4 mr-2" /> Add User
                            </Button>
                        </div>
                        {isTabLoading ? (
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
                                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {user.full_name?.charAt(0) || user.email.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-foreground">{user.full_name || 'Unnamed User'}</div>
                                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${user.is_super_admin
                                                        ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                                                        : user.role_name
                                                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                                            : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                                        }`}>
                                                        {user.is_super_admin
                                                            ? 'Super Admin'
                                                            : user.role_name || 'No Role'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${user.is_active
                                                        ? 'bg-green-500/5 text-green-600 border-green-500/20'
                                                        : 'bg-gray-500/5 text-gray-500 border-gray-500/20'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No users found for this organization.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* DEVICES CONTENT */}
                {activeTab === 'devices' && (
                    <div className="bg-card border border-border rounded-xl shadow-sm">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Smartphone className="w-5 h-5 text-primary" />
                                Connected Devices
                            </h3>
                            <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" /> Add Device
                            </Button>
                        </div>
                        {isTabLoading ? (
                            <div className="p-10 flex justify-center">
                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : devices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Device Name</th>
                                            <th className="px-6 py-4 font-medium">Type</th>
                                            <th className="px-6 py-4 font-medium">Status</th>
                                            <th className="px-6 py-4 font-medium">Last Seen</th>
                                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {devices.map((device) => (
                                            <tr key={device.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-foreground">{device.name}</div>
                                                    <div className="text-xs font-mono text-muted-foreground">{device.device_code}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{device.type}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${device.status === 'ONLINE'
                                                        ? 'bg-green-500/5 text-green-600 border-green-500/20'
                                                        : 'bg-red-500/5 text-red-600 border-red-500/20'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        {device.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground">
                                <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No devices provisioned for this organization.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* SETTINGS CONTENT */}
                {activeTab === 'settings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card border border-border rounded-xl shadow-sm">
                                <div className="p-6 border-b border-border">
                                    <h3 className="font-semibold text-lg">General Settings</h3>
                                    <p className="text-sm text-muted-foreground">Update organization identity and profiles.</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Organization Name"
                                            value={editForm.name || ''}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        />
                                        <Input
                                            label="Slug"
                                            value={editForm.slug || ''}
                                            disabled
                                            className="bg-muted/50"
                                        />
                                        <div className="md:col-span-2">
                                            <Input
                                                label="Description"
                                                value={editForm.description || ''}
                                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            />
                                        </div>
                                        <Input
                                            label="Industry"
                                            value={editForm.industry || ''}
                                            onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                                        />
                                        <Input
                                            label="Website"
                                            value={editForm.website || ''}
                                            onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Branding Section */}
                            <div className="bg-card border border-border rounded-xl shadow-sm">
                                <div className="p-6 border-b border-border">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Palette className="w-5 h-5 text-primary" />
                                        Branding
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Customize logo and brand colors.</p>
                                </div>
                                <div className="p-6 space-y-6">
                                    {/* Logo Upload */}
                                    <div>
                                        <ImageUpload
                                            label="Organization Logo"
                                            value={editForm.logo_url}
                                            onChange={(url: string) => setEditForm({ ...editForm, logo_url: url })}
                                            placeholder="Upload organization logo"
                                            folder="organizations"
                                        />
                                    </div>

                                    {/* Theme Color Picker */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Brand Color</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="color"
                                                value={getPrimaryColor(editForm.theme_config)}
                                                onChange={(e) => setEditForm({
                                                    ...editForm,
                                                    theme_config: { primary: e.target.value }
                                                })}
                                                className="w-14 h-14 rounded-lg cursor-pointer border border-input overflow-hidden p-1 bg-background"
                                            />
                                            <div className="flex-1">
                                                <Input
                                                    value={getPrimaryColor(editForm.theme_config)}
                                                    onChange={(e) => setEditForm({
                                                        ...editForm,
                                                        theme_config: { primary: e.target.value }
                                                    })}
                                                    placeholder="#0d9488"
                                                    className="font-mono uppercase"
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    This color will be used for the dashboard theme when organization users log in.
                                                </p>
                                            </div>
                                            <div
                                                className="w-14 h-14 rounded-lg border border-input shadow-inner"
                                                style={{ backgroundColor: getPrimaryColor(editForm.theme_config) }}
                                                title="Color Preview"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-xl shadow-sm">
                                <div className="p-6 border-b border-border">
                                    <h3 className="font-semibold text-lg">Contact & Location</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Primary Email"
                                            value={editForm.contact_email || ''}
                                            onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                                        />
                                        <Input
                                            label="Phone"
                                            value={editForm.phone || ''}
                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        />
                                        <div className="md:col-span-2">
                                            <Input
                                                label="Address"
                                                value={editForm.address || ''}
                                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                            />
                                        </div>
                                        <Input
                                            label="City"
                                            value={editForm.city || ''}
                                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                        />
                                        <Input
                                            label="Country"
                                            value={editForm.country || ''}
                                            onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setEditForm(org)}>Reset Changes</Button>
                                <Button onClick={handleSaveSettings} isLoading={isSaving}>
                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
                                <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                                    <Activity className="w-5 h-5" /> Danger Zone
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Irreversible actions. Tread carefully.
                                </p>
                                <Button variant="destructive" className="w-full" onClick={() => setShowDeleteModal(true)}>
                                    Delete Organization
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-card w-full max-w-md rounded-xl border border-destructive/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-3 text-destructive">
                                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-lg">Delete Organization?</h3>
                                </div>

                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Are you sure you want to delete <span className="font-semibold text-foreground">{org.name}</span>?
                                    <br /><br />
                                    <span className="text-destructive font-medium">Warning: All accounts, devices, events, and reports will be deleted.</span>
                                    <br />
                                    This action is irreversible.
                                </p>

                                <div className="pt-2">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">
                                        Confirm with your Password
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Enter your admin password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setDeletePassword('');
                                        }}
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={handleDeleteOrganization}
                                        isLoading={isDeleting}
                                    >
                                        Delete Forever
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
