'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import PasswordRequirements, { usePasswordValidation } from '@/components/PasswordRequirements';
import { User, Mail, Lock, Building2, UserPlus, ArrowLeft, ArrowRight, Check, AlertCircle, Calendar, Users, Activity, Settings, Briefcase, ChevronRight, Info, Eye, Truck, ShieldAlert, LucideIcon } from 'lucide-react';
import { organizationsApi, eventsApi, departmentsApi, servicesApi, usersApi, deviceModelsApi, rolesApi, Role } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { hasRole, ROLE_LEVELS } from '@/lib/roles';
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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

    // Fetch assignable roles from API (filtered by current user's permission level)
    useEffect(() => {
        rolesApi.getAssignable()
            .then(roles => {
                // Filter out SUPER_ADMIN from assignable roles (handled by is_super_admin flag)
                let filteredRoles = roles.filter(r => r.code !== 'SUPER_ADMIN');
                
                // If not SUPER_ADMIN, only show roles with lower privilege (higher level number)
                if (currentUser && !currentUser.is_super_admin) {
                    const currentUserRole = currentUser.roles?.[0]?.role || 'VIEWER';
                    const currentUserLevel = ROLE_LEVELS[currentUserRole] ?? 99;
                    
                    filteredRoles = filteredRoles.filter((role: Role) => {
                        const roleLevel = ROLE_LEVELS[role.code] ?? 99;
                        return roleLevel > currentUserLevel;
                    });
                }
                
                setAvailableRoles(filteredRoles);
            })
            .catch(err => {
                console.error('Failed to fetch roles:', err);
                setAvailableRoles([]);
            });
    }, [currentUser]);

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

    // Auto pre-select context fields based on current user's role hierarchy
    useEffect(() => {
        if (!currentUser || currentUser.is_super_admin) {
            return; // SUPER_ADMIN can manually select all contexts
        }

        const currentUserRole = currentUser.roles?.[0]?.role || 'VIEWER';
        const currentUserRoleAssignment = currentUser.roles?.[0];

        setFormData(prev => {
            const nextFormData = { ...prev };

            // Always use user's organization if not SUPER_ADMIN
            nextFormData.organization_id = currentUser.organization_id || '';

            switch (currentUserRole) {
                case 'ORG_ADMIN': {
                    // ORG_ADMIN: Auto-select their organization (cannot change)
                    // Can change: Event, Department, Service (all below)
                    break;
                }

                case 'EVENT_MANAGER': {
                    // EVENT_MANAGER: Auto-select their event (cannot change)
                    // Can change: Department, Service (all below)
                    // CANNOT see: Organization
                    if (currentUserRoleAssignment?.event_id) {
                        nextFormData.event_id = currentUserRoleAssignment.event_id;
                    }
                    break;
                }

                case 'DEPT_HEAD': {
                    // DEPT_HEAD: Auto-select their department (cannot change)
                    // Can change: Service (below)
                    // CANNOT see: Organization, Event
                    if (currentUserRoleAssignment?.dept_id) {
                        nextFormData.dept_id = currentUserRoleAssignment.dept_id;
                    }
                    break;
                }

                case 'SERVICE_SUPERVISOR': {
                    // SERVICE_SUPERVISOR: Auto-select everything (cannot change anything)
                    // CANNOT see: Organization, Event, Department
                    if (currentUserRoleAssignment?.event_id) {
                        nextFormData.event_id = currentUserRoleAssignment.event_id;
                    }
                    if (currentUserRoleAssignment?.dept_id) {
                        nextFormData.dept_id = currentUserRoleAssignment.dept_id;
                    }
                    if (currentUserRoleAssignment?.service_id) {
                        nextFormData.service_id = currentUserRoleAssignment.service_id;
                    }
                    break;
                }
            }

            return nextFormData;
        });
    }, [currentUser]);

    // Pre-select fields from query parameters (with authority validation)
    useEffect(() => {
        setFormData(prev => {
            const nextFormData = { ...prev };
            const currentUserRole = currentUser?.roles?.[0]?.role || 'VIEWER';
            const currentUserRoleAssignment = currentUser?.roles?.[0];
            
            // Organization: Only SUPER_ADMIN can select different orgs
            if (currentUser?.is_super_admin && preselectedOrgId) {
                nextFormData.organization_id = preselectedOrgId;
            }
            
            // Event: Only allow if authorized (SUPER_ADMIN, ORG_ADMIN, or EVENT_MANAGER with matching event)
            if (preselectedEventId && formData.organization_id) {
                if (currentUser?.is_super_admin || currentUserRole === 'ORG_ADMIN' || 
                    (currentUserRole === 'EVENT_MANAGER' && currentUserRoleAssignment?.event_id === preselectedEventId)) {
                    nextFormData.event_id = preselectedEventId;
                }
            }
            
            // Department: Only allow if authorized (SUPER_ADMIN, ORG_ADMIN, EVENT_MANAGER, or DEPT_HEAD with matching dept)
            if (preselectedDeptId && formData.organization_id) {
                if (currentUser?.is_super_admin || currentUserRole === 'ORG_ADMIN' || 
                    currentUserRole === 'EVENT_MANAGER' ||
                    (currentUserRole === 'DEPT_HEAD' && currentUserRoleAssignment?.dept_id === preselectedDeptId)) {
                    nextFormData.dept_id = preselectedDeptId;
                }
            }
            
            // Service: Only allow if authorized (SUPER_ADMIN, ORG_ADMIN, EVENT_MANAGER, DEPT_HEAD, or SERVICE_SUPERVISOR with matching service)
            const preselectedServiceId = searchParams.get('service') || searchParams.get('service_id');
            if (preselectedServiceId && formData.organization_id) {
                if (currentUser?.is_super_admin || currentUserRole === 'ORG_ADMIN' || 
                    currentUserRole === 'EVENT_MANAGER' || currentUserRole === 'DEPT_HEAD' ||
                    (currentUserRole === 'SERVICE_SUPERVISOR' && currentUserRoleAssignment?.service_id === preselectedServiceId)) {
                    nextFormData.service_id = preselectedServiceId;
                }
            }
            
            // Role
            if (preselectedRole) {
                nextFormData.role = preselectedRole;
            }
            
            return nextFormData;
        });

        // If role is pre-selected, move to next step
        if (preselectedRole) {
            setCurrentStep(1);
        }
    }, [preselectedOrgId, preselectedEventId, preselectedDeptId, preselectedRole, currentUser]);

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


    // --- Validation Functions ---

    const validateRoleStep = (): boolean => {
        const errors: Record<string, string> = {};
        
        if (!formData.role) {
            errors.role = 'Please select a role';
        }
        
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            toast.error('Validation Error', { description: errors.role || 'Please fill in all required fields' });
            return false;
        }
        return true;
    };

    const validateContextStep = (): boolean => {
        const errors: Record<string, string> = {};
        const currentUserRole = currentUser?.roles?.[0]?.role || 'VIEWER';
        
        // Validation based on role requirements
        if (!formData.organization_id && (currentUser?.is_super_admin || currentUserRole === 'ORG_ADMIN')) {
            errors.organization_id = 'Organization is required';
        }
        
        if (['EVENT_MANAGER', 'DEPT_HEAD', 'SERVICE_SUPERVISOR'].includes(formData.role) && !formData.event_id) {
            errors.event_id = 'Event is required for this role';
        }
        
        if (['DEPT_HEAD', 'SERVICE_SUPERVISOR'].includes(formData.role) && !formData.dept_id) {
            errors.dept_id = 'Department is required for this role';
        }
        
        if (formData.role === 'SERVICE_SUPERVISOR' && !formData.service_id) {
            errors.service_id = 'Service Unit is required for this role';
        }
        
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            toast.error('Validation Error', { description: Object.values(errors)[0] });
            return false;
        }
        return true;
    };

    const validateAccountStep = (): boolean => {
        const errors: Record<string, string> = {};
        
        // Full Name validation
        if (!formData.full_name.trim()) {
            errors.full_name = 'Full Name is required';
        } else if (formData.full_name.length > 30) {
            errors.full_name = 'Full Name must be less than 30 characters';
        }
        
        // Email validation
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (formData.email.length > 50) {
            errors.email = 'Email must be less than 50 characters';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }
        
        // Password validation
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (!isPasswordValid) {
            errors.password = 'Password does not meet requirements';
        }
        
        // Confirm Password validation
        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            toast.error('Validation Error', { description: Object.values(errors)[0] });
            return false;
        }
        return true;
    };

    // --- Validation Functions ---
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


    // --- Context Field Disable Logic & Visibility ---
    const getContextFieldState = () => {
        const currentUserRole = currentUser?.roles?.[0]?.role || 'VIEWER';
        
        return {
            // Organization
            organization: {
                hidden: !currentUser?.is_super_admin && currentUserRole !== 'ORG_ADMIN',
                disabled: !currentUser?.is_super_admin
            },
            
            // Event - hidden for DEPT_HEAD and below, disabled for EVENT_MANAGER
            event: {
                hidden: ['DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN', 'VIEWER'].includes(currentUserRole),
                disabled: currentUserRole === 'EVENT_MANAGER' && !!currentUser?.roles?.[0]?.event_id
            },
            
            // Department - hidden for SERVICE_SUPERVISOR and below, disabled for DEPT_HEAD
            department: {
                hidden: ['SERVICE_SUPERVISOR', 'TECHNICIAN', 'VIEWER'].includes(currentUserRole),
                disabled: currentUserRole === 'DEPT_HEAD' && !!currentUser?.roles?.[0]?.dept_id
            },
            
            // Service - only show for SERVICE_SUPERVISOR and TECHNICIAN, disabled if SERVICE_SUPERVISOR
            service: {
                hidden: !['SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role),
                disabled: currentUserRole === 'SERVICE_SUPERVISOR' && !!currentUser?.roles?.[0]?.service_id
            },
        };
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
                {fieldErrors.role && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {fieldErrors.role}
                    </div>
                )}

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
                                    onClick={() => {
                                        setFormData({ ...formData, role: role.code });
                                        if (fieldErrors.role) setFieldErrors({ ...fieldErrors, role: '' });
                                    }}
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

    const renderContextSelection = () => {
        const currentUserRole = currentUser?.roles?.[0]?.role || 'VIEWER';
        const fieldState = getContextFieldState();

        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <h2 className="header-section">Where will this user work?</h2>

                <div className="space-y-4 max-w-xl">
                    {/* Organization Selection - Only for Super Admins and ORG_ADMIN */}
                    {!fieldState.organization.hidden && (
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
                                            disabled={fieldState.organization.disabled}
                                        />
                                    </div>
                                    {/* <button
                                        onClick={() => router.push('/admin/organizations/new')}
                                        className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg mt-6 h-[42px]"
                                        title="Create New Organization"
                                    >
                                        +
                                    </button> */}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Event Selection - Hidden for DEPT_HEAD, SERVICE_SUPERVISOR, TECHNICIAN */}
                    {!fieldState.event.hidden && ['EVENT_MANAGER', 'DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role) && (
                        <div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                <RichSelect
                                        label="Event"
                                        value={formData.event_id}
                                        onChange={(val) => setFormData({ ...formData, event_id: val, dept_id: '', service_id: '' })}
                                        options={[
                                            { value: '', label: 'Select Event', icon: Calendar },
                                            ...events.map(e => ({ 
                                                value: e.id, 
                                                label: e.name, 
                                                image: e.logo_url || e.image_url || e.image || e.logo || undefined
                                            }))
                                        ]}
                                        icon={Calendar}
                                        disabled={fieldState.event.disabled}
                                    />
                                </div>
                                {/* <button
                                    onClick={() => router.push('/events/new')}
                                    className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg h-[42px]"
                                    title="Create New Event"
                                >
                                    +
                                </button> */}
                            </div>
                        </div>
                    )}

                    {/* Department Selection - Hidden for SERVICE_SUPERVISOR and below */}
                    {!fieldState.department.hidden && ['DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role) && (
                        <div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <RichSelect
                                        label="Department"
                                        value={formData.dept_id}
                                        onChange={(val) => setFormData({ ...formData, dept_id: val, service_id: '' })}
                                        options={[
                                            { value: '', label: 'Select Department', icon: Users },
                                            ...depts
                                                .filter(d => !formData.event_id || d.event_id === formData.event_id)
                                                .map(d => ({ value: d.id, label: d.name }))
                                        ]}
                                        icon={Users}
                                        disabled={fieldState.department.disabled}
                                    />
                                </div>
                                {/* <button className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg h-[42px]" title="Create New Department">+</button> */}
                            </div>
                        </div>
                    )}

                    {/* Service Selection - Only for SERVICE_SUPERVISOR and TECHNICIAN */}
                    {!fieldState.service.hidden && ['SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role) && (
                        <div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <RichSelect
                                        label="Service Unit"
                                        value={formData.service_id}
                                        onChange={(val) => setFormData({ ...formData, service_id: val })}
                                        options={[
                                            { value: '', label: 'Select Service Unit', icon: Activity },
                                            ...services
                                                .filter(s => !formData.dept_id || s.department_id === formData.dept_id)
                                                .map(s => ({ value: s.id, label: `${s.name} (${s.definition_name})` }))
                                        ]}
                                        icon={Activity}
                                        disabled={fieldState.service.disabled}
                                    />
                                </div>
                                {/* <button className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg h-[42px]" title="Create New Service">+</button> */}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        );
    };

    const renderAccountDetails = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 max-w-xl">
            <h2 className="header-section">Account Information</h2>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground/80">Full Name</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none w-4 h-4" />
                    <input
                        type="text"
                        className={`flex h-10 w-full rounded-lg border bg-background px-3 py-2 pl-9 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/50 ${fieldErrors.full_name ? 'border-destructive focus-visible:ring-destructive' : 'border-border focus-visible:ring-primary'}`}
                        placeholder="John Doe"
                        value={formData.full_name}
                        onChange={(e) => {
                            setFormData({ ...formData, full_name: e.target.value });
                            if (fieldErrors.full_name) setFieldErrors({ ...fieldErrors, full_name: '' });
                        }}
                    />
                </div>
                <div className="flex justify-between items-start">
                    
                    {fieldErrors.full_name && <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">{fieldErrors.full_name}</p>}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground/80">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none w-4 h-4" />
                    <input
                        type="email"
                        className={`flex h-10 w-full rounded-lg border bg-background px-3 py-2 pl-9 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/50 ${fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : 'border-border focus-visible:ring-primary'}`}
                        placeholder="john.doe@company.com"
                        value={formData.email}
                        onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                        }}
                    />
                </div>
                <div className="flex justify-between items-start">
                    
                    {fieldErrors.email && <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">{fieldErrors.email}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground/80">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none w-4 h-4" />
                        <input
                            type="password"
                            className={`flex h-10 w-full rounded-lg border bg-background px-3 py-2 pl-9 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/50 ${fieldErrors.password ? 'border-destructive focus-visible:ring-destructive' : 'border-border focus-visible:ring-primary'}`}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => {
                                setFormData({ ...formData, password: e.target.value });
                                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                            }}
                        />
                    </div>
                    {fieldErrors.password && <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">{fieldErrors.password}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground/80">Confirm Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none w-4 h-4" />
                        <input
                            type="password"
                            className={`flex h-10 w-full rounded-lg border bg-background px-3 py-2 pl-9 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/50 ${fieldErrors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : 'border-border focus-visible:ring-primary'}`}
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={(e) => {
                                setFormData({ ...formData, confirmPassword: e.target.value });
                                if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                            }}
                        />
                    </div>
                    {fieldErrors.confirmPassword && <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">{fieldErrors.confirmPassword}</p>}
                </div>
            </div>

            {/* Password Requirements */}
            <PasswordRequirements password={formData.password} />
        </div>
    );

    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            setFieldErrors({});

            // Send form data - password is sent to user via email
            await usersApi.create(formData);

            // Show success message
            toast.success('User created! They will receive login credentials via email.');

            router.push('/users');
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Failed to create user';
            toast.error('Error', { description: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = () => {
        setFieldErrors({});
        
        // Step-specific validation
        if (currentStep === 0) {
            if (!validateRoleStep()) return;
        } else if (currentStep === 1) {
            if (!validateContextStep()) return;
        } else if (currentStep === 2) {
            if (!validateAccountStep()) return;
        }

        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
        setFieldErrors({});
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
