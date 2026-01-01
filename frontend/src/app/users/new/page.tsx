'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { User, Mail, Lock, Building2, UserPlus, ArrowLeft, ArrowRight, Check, AlertCircle, Calendar, Users, Activity, Settings, Briefcase, ChevronRight } from 'lucide-react';
import { organizationsApi, eventsApi, departmentsApi, servicesApi, usersApi, deviceModelsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Select } from '@/components/ui/Select';
import { hasRole } from '@/lib/roles';
import SetupWizard from '@/components/SetupWizard';

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

export default function NewUserPage() {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        role: '',
        organization_id: '',
        event_id: '',
        dept_id: '',
        service_id: '',
        email: '',
        full_name: '',
        password: '',
        confirmPassword: ''
    });

    // Reference Data
    const [orgs, setOrgs] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [depts, setDepts] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [serviceDefs, setServiceDefs] = useState<any[]>([]); // Catalog

    // --- Dynamic Fetching Handlers ---

    useEffect(() => {
        if (currentUser?.is_super_admin) {
            organizationsApi.getAll().then(setOrgs).catch(console.error);
        } else if (currentUser?.organization_id) {
            // Pre-select org for non-super admins
            setFormData(prev => ({ ...prev, organization_id: currentUser.organization_id }));
        }
    }, [currentUser]);

    // Fetch Events when Org selected
    useEffect(() => {
        if (formData.organization_id && ['EVENT_MANAGER', 'DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role)) {
            eventsApi.getByOrg(formData.organization_id).then(setEvents).catch(console.error);
        } else {
            setEvents([]);
        }
    }, [formData.organization_id, formData.role]);

    // Fetch Departments when Event selected
    useEffect(() => {
        if (formData.event_id && ['DEPT_HEAD', 'SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role)) {
            departmentsApi.getByEvent(formData.event_id).then(setDepts).catch(console.error);
        } else {
            setDepts([]);
        }
    }, [formData.event_id, formData.role]);

    // Fetch Services when Dept selected
    useEffect(() => {
        if (formData.dept_id && ['SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role)) {
            servicesApi.getByDept(formData.dept_id).then(setServices).catch(console.error);
        } else {
            setServices([]);
        }
    }, [formData.dept_id, formData.role]);


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
            const allowed = ['SERVICE_SUPERVISOR', 'TECHNICIAN'];
            return allowed.includes(roleToCheck);
        }

        return false;
    };


    // --- Steps Renderers ---

    const renderRoleSelection = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">What type of user are you creating?</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Org Admin */}
                {canCreateRole('ORG_ADMIN') && (
                    <button
                        onClick={() => setFormData({ ...formData, role: 'ORG_ADMIN' })}
                        className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${formData.role === 'ORG_ADMIN' ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/50'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${formData.role === 'ORG_ADMIN' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Building2 className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold">Organization Admin</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Full control over a specific organization, its settings, and all sub-resources.</p>
                    </button>
                )}

                {/* Event Manager */}
                {canCreateRole('EVENT_MANAGER') && (
                    <button
                        onClick={() => setFormData({ ...formData, role: 'EVENT_MANAGER' })}
                        className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${formData.role === 'EVENT_MANAGER' ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/50'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${formData.role === 'EVENT_MANAGER' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold">Event Manager</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Manages a specific event, its departments, and services.</p>
                    </button>
                )}

                {/* Dept Head */}
                {canCreateRole('DEPT_HEAD') && (
                    <button
                        onClick={() => setFormData({ ...formData, role: 'DEPT_HEAD' })}
                        className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${formData.role === 'DEPT_HEAD' ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/50'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${formData.role === 'DEPT_HEAD' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold">Department Head</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Oversees a specific department (e.g., Security, Sanitation) within an event.</p>
                    </button>
                )}

                {/* Service Supervisor */}
                {canCreateRole('SERVICE_SUPERVISOR') && (
                    <button
                        onClick={() => setFormData({ ...formData, role: 'SERVICE_SUPERVISOR' })}
                        className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${formData.role === 'SERVICE_SUPERVISOR' ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/50'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${formData.role === 'SERVICE_SUPERVISOR' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Activity className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold">Service Supervisor</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Manages specific service deployments (e.g., Water Monitors) and technicians.</p>
                    </button>
                )}

                {/* Technician */}
                {canCreateRole('TECHNICIAN') && (
                    <button
                        onClick={() => setFormData({ ...formData, role: 'TECHNICIAN' })}
                        className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${formData.role === 'TECHNICIAN' ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/50'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${formData.role === 'TECHNICIAN' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Settings className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold">Onsite Technician</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Ground-level access to manage devices and view local telemetry.</p>
                    </button>
                )}

                {/* Viewer */}
                {canCreateRole('VIEWER') && (
                    <button
                        onClick={() => setFormData({ ...formData, role: 'VIEWER' })}
                        className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${formData.role === 'VIEWER' ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/50'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${formData.role === 'VIEWER' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold">Viewer / Auditor</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Read-only access to dashboards and reports.</p>
                    </button>
                )}

            </div>
        </div>
    );

    const renderContextSelection = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Where will this user work?</h2>

            <div className="space-y-4 max-w-xl">
                {/* Org Selection (Only for Super Admins) */}
                {currentUser?.is_super_admin && (
                    <div>
                        <label className="label-compact">Organization</label>
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
                            <div className="flex gap-2">
                                <select
                                    className="input-compact"
                                    value={formData.organization_id}
                                    onChange={(e) => setFormData({ ...formData, organization_id: e.target.value, event_id: '', dept_id: '', service_id: '' })}
                                >
                                    <option value="">Select Organization</option>
                                    {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                                </select>
                                <button
                                    onClick={() => router.push('/admin/organizations/new')}
                                    className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg"
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
                        <label className="label-compact">Event</label>
                        <div className="flex gap-2">
                            <select
                                className="input-compact disabled:opacity-50"
                                value={formData.event_id}
                                disabled={!formData.organization_id}
                                onChange={(e) => setFormData({ ...formData, event_id: e.target.value, dept_id: '', service_id: '' })}
                            >
                                <option value="">Select Event</option>
                                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <button
                                onClick={() => router.push('/events/new')}
                                className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg"
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
                        <label className="label-compact">Department</label>
                        <div className="flex gap-2">
                            <select
                                className="w-full bg-background border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50"
                                value={formData.dept_id}
                                disabled={!formData.event_id}
                                onChange={(e) => setFormData({ ...formData, dept_id: e.target.value, service_id: '' })}
                            >
                                <option value="">Select Department</option>
                                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <button className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg" title="Create New Department">+</button>
                        </div>
                    </div>
                )}

                {/* Service Selection */}
                {['SERVICE_SUPERVISOR', 'TECHNICIAN'].includes(formData.role) && (
                    <div>
                        <label className="label-compact">Service Unit</label>
                        <div className="flex gap-2">
                            <select
                                className="w-full bg-background border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50"
                                value={formData.service_id}
                                disabled={!formData.dept_id}
                                onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                            >
                                <option value="">Select Service Unit</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.definition_name})</option>)}
                            </select>
                            <button className="px-3 py-2 bg-muted rounded-lg border border-border hover:bg-muted/80 text-lg" title="Create New Service">+</button>
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
                <label className="label-compact">Full Name</label>
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
                <label className="label-compact">Email Address</label>
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
                    <label className="label-compact">Password</label>
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
                    <label className="label-compact">Confirm Password</label>
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
        </div>
    );

    const handleSubmit = async () => {
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            setIsLoading(true);
            setError('');
            await usersApi.create(formData);

            // Redirect based on role? Or just standard users page?
            // "it showld be that current user link" -> Likely /users
            router.push(currentUser?.is_super_admin ? '/admin/users' : '/users');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create user');
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = () => {
        // Validation logic per step could go here
        if (currentStep === 0 && !formData.role) return setError("Please select a role");

        setError('');
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
        setError('');
    };

    return (
        <DashboardLayout>
            <SetupWizard
                title="Create New User"
                description="Configure access levels and assign operational contexts."
                breadcrumbs={[
                    { label: 'Back to Users', href: '/admin/users' },
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
                    <div className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-in slide-in-from-top-2 z-10">
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
