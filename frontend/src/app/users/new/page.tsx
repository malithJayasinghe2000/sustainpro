'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import PasswordRequirements, { usePasswordValidation } from '@/components/PasswordRequirements';
import { User, Mail, Lock, Building2, UserPlus, ArrowLeft, ArrowRight, Check, AlertCircle, Calendar, Users, Activity, Settings, Briefcase, ChevronRight, Info, Eye, Truck, ShieldAlert, LucideIcon } from 'lucide-react';
import { organizationsApi, eventsApi, departmentsApi, servicesApi, usersApi, deviceModelsApi, rolesApi, Role } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { hasRole } from '@/lib/roles';
import { RichSelect } from '@/components/ui/RichSelect';
import SetupWizard from '@/components/SetupWizard';
import { toast } from 'sonner';

// Icon mapping for dynamic role icons from database
const iconMap: Record<string, LucideIcon> = {
    Building2,
    Calendar,
    Users,
    Activity,
    Settings,
    Briefcase,
    Eye,
    Truck,
    ShieldAlert,
};

interface WizardStep {
    id: 'ROLE' | 'CONTEXT' | 'ACCOUNT' | 'REVIEW';
    label: string;
}

const STEPS: WizardStep[] = [
    { id: 'ROLE', label: 'Select Role' },
    { id: 'CONTEXT', label: 'Assign Context' },
    { id: 'ACCOUNT', label: 'Account Details' },
    { id: 'REVIEW', label: 'Review & Create' }
];

function NewUserPageContent() {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!currentUser) return;
        const canCreate = currentUser.is_super_admin || currentUser.permissions?.includes('users.manage');
        if (!canCreate) {
            toast.error('Access Denied', { description: 'You do not have permission to create users.' });
            router.push('/users');
        }
    }, [currentUser, router]);

    // Form State (password is REQUIRED - will be sent to user via email)
    const [formData, setFormData] = useState({
        role: '',
        organization_id: '',
        event_id: '',
        dept_id: '',
        service_id: '',
        email: '',
        full_name: '',
        password: '', // REQUIRED - admin sets password, sent to user via email
        confirmPassword: ''
    });

    // Validating password against policies
    const { isValid: isPasswordValid } = usePasswordValidation(formData.password);

    // Reference Data
    const [orgs, setOrgs] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [depts, setDepts] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [serviceDefs, setServiceDefs] = useState<any[]>([]); // Catalog
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

    // --- Dynamic Fetching Handlers ---

    // Fetch assignable roles from API
    useEffect(() => {
        rolesApi.getAssignable()
            .then(roles => {
                // Filter out SUPER_ADMIN from assignable roles (handled by is_super_admin flag)
                setAvailableRoles(roles.filter(r => r.code !== 'SUPER_ADMIN'));
            })
            .catch(err => {
                console.error('Failed to fetch roles:', err);
                setAvailableRoles([]);
            });
    }, []);

    // Get query parameters for pre-selection
    const searchParams = useSearchParams();
    const preselectedOrgId = searchParams.get('org') || searchParams.get('organization_id');
    const preselectedEventId = searchParams.get('event') || searchParams.get('event_id');
    const preselectedDeptId = searchParams.get('dept') || searchParams.get('department_id');
    const preselectedRole = searchParams.get('role');

    useEffect(() => {
        if (currentUser?.is_super_admin) {
            organizationsApi.getAll({ limit: 1000 }).then(res => setOrgs(res.data)).catch(console.error);
        } else if (currentUser?.organization_id) {
            // Pre-select org for non-super admins
            setFormData(prev => ({ ...prev, organization_id: currentUser.organization_id }));
        }
    }, [currentUser]);

    // Pre-select fields from query parameters
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            organization_id: preselectedOrgId || prev.organization_id,
            event_id: preselectedEventId || prev.event_id,
            dept_id: preselectedDeptId || prev.dept_id,
            role: preselectedRole || prev.role
        }));

        // If role is pre-selected, move to next step
        if (preselectedRole) {
            setCurrentStep(1);
        }
    }, [preselectedOrgId, preselectedEventId, preselectedDeptId, preselectedRole]);

    // Fetch events when organization is selected
    useEffect(() => {
        if (formData.organization_id) {
            setIsLoading(true);
            // Try to get structure first, fallback to individual APIs
            organizationsApi.getStructure(formData.organization_id)
                .then(data => {
                    if (data) {
                        setEvents(data.events || []);
                        setDepts(data.departments || []);
                        setServices(data.services || []);
                    }
                })
                .catch(async (err) => {
                    console.warn('Structure API failed, using fallback:', err);
                    // Fallback: fetch events directly
                    try {
                        const orgEvents = await eventsApi.getByOrg(formData.organization_id);
                        setEvents(Array.isArray(orgEvents) ? orgEvents : []);
                    } catch (e) {
                        console.warn('Failed to fetch events:', e);
                        setEvents([]);
                    }
                    setDepts([]);
                    setServices([]);
                })
                .finally(() => setIsLoading(false));
        } else {
            setEvents([]);
            setDepts([]);
            setServices([]);
        }
    }, [formData.organization_id]);


    // --- Role Visibility Logic ---
    const canCreateRole = (roleToCheck: string) => {
        if (currentUser?.is_super_admin) return true;

        // Org Admins cannot create Super Admins or other Org Admins (typically)
        // But user asked to "limit adding role based on current user role"
        // Let's assume strict hierarchy:
        if (hasRole(currentUser, 'ORG_ADMIN')) {
            // Can create anything EXCEPT Super Admin
            // Can they create another Org Admin? Usually yes for peers, but maybe safer to restrict?
            // "limit addng role" implies restriction.
            // Let's allow downstream roles:
            const allowed = ['EVENT_MANAGER', 'DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN', 'VIEWER'];
            return allowed.includes(roleToCheck);
        }

        // Event Manager
        if (hasRole(currentUser, 'EVENT_MANAGER')) {
            const allowed = ['DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN', 'VIEWER'];
            return allowed.includes(roleToCheck);
        }

        // Dept Head
        if (hasRole(currentUser, 'DEPT_HEAD')) {
            const allowed = ['SERVICE_SUPERVISOR', 'TECHNICIAN', 'VIEWER'];
            return allowed.includes(roleToCheck);
        }

        return false;
    };


    // --- Steps Renderers ---

    const renderRoleSelection = () => {
        // Get icon component from icon name
        const getIcon = (iconName: string | null) => {
            if (!iconName) return Users;
            return iconMap[iconName] || Users;
        };

        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <h2 className="header-section">What type of user are you creating?</h2>

                {availableRoles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>Loading roles...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableRoles.map((role) => {
                            const IconComponent = getIcon(role.icon);
                            const isSelected = formData.role === role.code;

                            return (
                                <button
                                    key={role.code}
                                    onClick={() => setFormData({ ...formData, role: role.code })}
                                    className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${isSelected
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-border bg-card hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div
                                            className={`p-2 rounded-lg ${isSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                                }`}
                                            style={isSelected && role.color ? { backgroundColor: role.color } : undefined}
                                        >
                                            <IconComponent className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold">{role.name}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{role.description}</p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderContextSelection = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Where will this user work?</h2>

            <div className="space-y-4 max-w-xl">
                {/* Org Selection (Only for Super Admins) */}
                {currentUser?.is_super_admin && (
                    <div>

                        {orgs.length === 0 ? (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-yellow-600">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-medium">No Organizations Found</span>
                                </div>
                                <p className="text-sm text-yellow-600/80">
                                    You need to create an organization before you can add users.
                                </p>
                                <button
                                    onClick={() => router.push('/admin/organizations/new')}
                                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors w-fit flex items-center gap-2"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Create Organization
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2 w-full">
                                <div className="flex-1">
                                    <RichSelect
                                        label="Organization"
                                        value={formData.organization_id}
                                        onChange={(val) => setFormData({ ...formData, organization_id: val, event_id: '', dept_id: '', service_id: '' })}
                                        options={[
                                            { value: '', label: 'Select Organization', icon: Building2 },
                                            ...orgs.map(org => ({ value: org.id, label: org.name, image: org.logo_url }))
                                        ]}
                                        icon={Building2}
                                    />
                                </div>
                                <button
                                    onClick={() => router.push('/admin/organizations/new')}
                                    className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg mt-6 h-[42px]"
                                    title="Create New Organization"
                                >
                                    +
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Event Selection */}
                {['EVENT_MANAGER', 'DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role) && (
                    <div>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <RichSelect
                                    value={formData.event_id}
                                    onChange={(val) => setFormData({ ...formData, event_id: val, dept_id: '', service_id: '' })}
                                    options={[
                                        { value: '', label: 'Select Event', icon: Calendar },
                                        ...events.map(e => ({ value: e.id, label: e.name, image: e.image_url }))
                                    ]}
                                    icon={Calendar}
                                // disabled={!formData.organization_id} // RichSelect needs disabled prop support if we want to disable it. 
                                // For now, if no org, events list is empty, so it acts disabled effectively or just empty.
                                />
                            </div>
                            <button
                                onClick={() => router.push('/events/new')}
                                className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg h-[42px]"
                                title="Create New Event"
                            >
                                +
                            </button>
                        </div>
                    </div>
                )}

                {/* Department Selection */}
                {['DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role) && (
                    <div>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <RichSelect
                                    value={formData.dept_id}
                                    onChange={(val) => setFormData({ ...formData, dept_id: val, service_id: '' })}
                                    options={[
                                        { value: '', label: 'Select Department', icon: Users },
                                        ...depts
                                            .filter(d => !formData.event_id || d.event_id === formData.event_id)
                                            .map(d => ({ value: d.id, label: d.name }))
                                    ]}
                                    icon={Users}
                                />
                            </div>
                            <button className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg h-[42px]" title="Create New Department">+</button>
                        </div>
                    </div>
                )}

                {/* Service Selection */}
                {['SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role) && (
                    <div>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <RichSelect
                                    value={formData.service_id}
                                    onChange={(val) => setFormData({ ...formData, service_id: val })}
                                    options={[
                                        { value: '', label: 'Select Service Unit', icon: Activity },
                                        ...services
                                            .filter(s => !formData.dept_id || s.department_id === formData.dept_id)
                                            .map(s => ({ value: s.id, label: `${s.name} (${s.definition_name})` }))
                                    ]}
                                    icon={Activity}
                                />
                            </div>
                            <button className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg h-[42px]" title="Create New Service">+</button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );

    const renderAccountDetails = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 max-w-xl">
            <h2 className="header-section">Account Information</h2>

            <div>
                <label className="label-compact">Full Name *</label>
                <div className="relative">
                    <User className="icon-input" />
                    <input
                        type="text"
                        className="input-compactWithIcon"
                        placeholder="John Doe"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <label className="label-compact">Email Address *</label>
                <div className="relative">
                    <Mail className="icon-input" />
                    <input
                        type="email"
                        className="input-compactWithIcon"
                        placeholder="john.doe@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-compact">Password *</label>
                    <div className="relative">
                        <Lock className="icon-input" />
                        <input
                            type="password"
                            className="input-compactWithIcon"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                    <label className="label-compact">Confirm Password *</label>
                    <div className="relative">
                        <Lock className="icon-input" />
                        <input
                            type="password"
                            className="input-compactWithIcon"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Password Requirements */}
            <PasswordRequirements password={formData.password} />
        </div>
    );

    const handleSubmit = async () => {
        // Password is REQUIRED
        if (!formData.password || formData.password.trim() === '') {
            setError("Password is required. This password will be sent to the user via email.");
            return;
        }

        if (!isPasswordValid) {
            setError("Password does not meet requirements.");
            return;
        }

        // Password must match confirmation
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            // Send form data - password is sent to user via email
            await usersApi.create(formData);

            // Show success message
            toast.success('User created! They will receive login credentials via email.');

            router.push('/users');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create user');
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = () => {
        const errors: string[] = [];

        if (currentStep === 0) {
            if (!formData.role) {
                setError("Please select a role");
                return;
            }
        }

        if (currentStep === 1) {
            // Validate context based on role
            const role = formData.role;
            
            // Super admins always need an organization selected
            if (currentUser?.is_super_admin && !formData.organization_id) {
                setError("Please select an organization");
                return;
            }

            // Roles that require event selection
            if (['EVENT_MANAGER', 'DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(role) && !formData.event_id) {
                setError("Please select an event");
                return;
            }

            // Roles that require department selection
            if (['DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(role) && !formData.dept_id) {
                setError("Please select a department");
                return;
            }

            // Roles that require service selection
            if (['SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(role) && !formData.service_id) {
                setError("Please select a service");
                return;
            }
        }

        if (currentStep === 2) {
            // Validate account details
            if (!formData.full_name?.trim()) {
                setError("Full name is required");
                return;
            }

            if (!formData.email?.trim()) {
                setError("Email address is required");
                return;
            }

            // Email format validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                setError("Please enter a valid email address");
                return;
            }

            if (!formData.password) {
                setError("Password is required");
                return;
            }

            if (!isPasswordValid) {
                setError("Password does not meet requirements");
                return;
            }

            if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match");
                return;
            }
        }

        setError('');
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
        setError('');
    };

    // Get the organization name for breadcrumbs
    const selectedOrg = orgs.find(o => o.id === formData.organization_id);

    return (
        <DashboardLayout>
            <SetupWizard
                title="Create New User"
                description="Configure access levels and assign operational contexts."
                breadcrumbs={preselectedOrgId ? [
                    { label: 'Organizations', href: '/admin/organizations' },
                    { label: selectedOrg?.name || 'Organization', href: `/admin/organizations/${preselectedOrgId}` },
                    { label: 'Create User', href: '#' }
                ] : [
                    { label: 'Back to Users', href: '/users' },
                    { label: 'Create User', href: '#' }
                ]}
                steps={STEPS}
                currentStep={currentStep}
                onNext={currentStep === STEPS.length - 1 ? handleSubmit : nextStep}
                onBack={prevStep}
                nextLabel={currentStep === STEPS.length - 1 ? 'Create User' : 'Next Step'}
                backLabel="Back"
                isLastStep={currentStep === STEPS.length - 1}
                isLoading={isLoading}
            >
                {/* Error Banner */}
                {error && (
                    <div className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-in slide-in-from-top-2 z-10">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {currentStep === 0 && renderRoleSelection()}
                {currentStep === 1 && renderContextSelection()}
                {currentStep === 2 && renderAccountDetails()}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <h2 className="header-section">Review Details</h2>
                        <div className="bg-muted/30 rounded-lg p-6 space-y-4 border border-border">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-muted-foreground block">Role</span>
                                    <span className="font-medium">{formData.role.replace('_', ' ')}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground block">Full Name</span>
                                    <span className="font-medium">{formData.full_name}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground block">Email</span>
                                    <span className="font-medium">{formData.email}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground block">Organization</span>
                                    <span className="font-medium">
                                        {orgs.find(o => o.id === formData.organization_id)?.name || 'N/A'}
                                    </span>
                                </div>
                                {/* Deep Context Display */}
                                {formData.event_id && (
                                    <div>
                                        <span className="text-sm text-muted-foreground block">Event</span>
                                        <span className="font-medium">{events.find(e => e.id === formData.event_id)?.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </SetupWizard>
        </DashboardLayout>
    );
}

export default function NewUserPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewUserPageContent />
        </Suspense>
    );
}
