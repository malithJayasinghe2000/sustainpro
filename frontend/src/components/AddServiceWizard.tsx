import { useState, useEffect, useCallback } from 'react';
import SetupWizard, { WikiStep } from '@/components/SetupWizard';
import { servicesApi, departmentsApi, usersApi, alertRulesApi, escalationPoliciesApi } from '@/lib/api';
import { toast } from 'sonner';
import { Layers, Check, Search, User, Mail, UserCog, CheckCircle2, Activity, Wrench, Settings, AlertTriangle, ArrowUp } from 'lucide-react';
import AlertRulesStep, { AlertRuleRow, ActionType } from '@/components/AlertRulesStep';
import EscalationPolicyStep, { EscalationLevel } from '@/components/EscalationPolicyStep';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import PasswordRequirements, { usePasswordValidation } from '@/components/PasswordRequirements';

interface ServiceTemplate {
    id: string;
    name: string;
    description: string;
    code: string;
    category: string;
    image_url?: string;
}

interface AddServiceWizardProps {
    isOpen: boolean;
    onClose: () => void;
    departmentId: string;
    departmentName: string;
    organizationId: string;
    eventId: string;
    onSuccess: (newService: any) => void;
    existingServices: any[]; // To check for duplicates
}

const STEPS: WikiStep[] = [
    { id: 'TEMPLATE', label: 'Select Service' },
    { id: 'SUPERVISOR', label: 'Service Supervisor' },
    { id: 'ALERT_RULES', label: 'Alert Rules' },
    { id: 'ESCALATION', label: 'Escalation Policy' },
    { id: 'REVIEW', label: 'Review & Create' }
];

export default function AddServiceWizard({
    isOpen,
    onClose,
    departmentId,
    departmentName,
    organizationId,
    eventId,
    onSuccess,
    existingServices
}: AddServiceWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Template Data
    const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(null);

    // Step 2: Supervisor User Data
    const [userData, setUserData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [createSupervisor, setCreateSupervisor] = useState(false);

    // Step 3: Alert Rules Data
    const [alertRules, setAlertRules] = useState<AlertRuleRow[]>([]);

    // Step 4: Escalation Policies Data
    const [escalationPolicies, setEscalationPolicies] = useState<EscalationLevel[]>([]);

    const { isValid: isPasswordValid } = usePasswordValidation(userData.password);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});


    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
            setCreateSupervisor(true); // Default to creating a supervisor account
        } else {
            // Reset state on close
            setCurrentStep(0);
            setSelectedTemplate(null);
            setCreateSupervisor(false);
            setUserData({ full_name: '', email: '', password: '', confirmPassword: '' });
            setFieldErrors({});
            setAlertRules([]);
            setEscalationPolicies([]);
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        try {
            const data = await servicesApi.getAll();
            // Handle both array and { data: [...] } response format
            const templatesArray = Array.isArray(data) ? data : (data?.data || []);
            setTemplates(templatesArray);
        } catch (error) {
            console.error('Error fetching service templates:', error);
            toast.error('Failed to load service templates');
        }
    };

    const handleNext = () => {
        const errors: Record<string, string> = {};

        if (currentStep === 0) {
            if (!selectedTemplate) {
                toast.error("Please select a service template");
                return;
            }
            // Check duplicates
            const alreadyExists = existingServices.some(
                svc => svc.service_template_id === selectedTemplate.id || svc.service_id === selectedTemplate.id
            );
            if (alreadyExists) {
                toast.error('This service has already been added to this department');
                return;
            }
        }

        if (currentStep === 1 && createSupervisor) {
            if (!userData.full_name) errors.full_name = "Full name is required";
            if(userData.full_name.length > 20) errors.full_name = "Full name cannot exceed 20 characters";
            if (!userData.email) {
                errors.email = "Email is required";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
                errors.email = "Invalid email format";
            }
            if(userData.email.length> 50) errors.email = "Email cannot exceed 50 characters";
            if (!userData.password) errors.password = "Password is required";
            if (!isPasswordValid) errors.password = "Password does not meet requirements";
            if (userData.password !== userData.confirmPassword) {
                errors.confirmPassword = "Passwords do not match";
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    };

    const handleCreate = async () => {
        if (!selectedTemplate) return;

        try {
            setIsLoading(true);

            // 1. Add Service to Department first
            const servicePayload: any = {
                service_template_id: selectedTemplate.id,
                config: {},
            };

            console.log('[Service Wizard] Adding service to department:', servicePayload);
            const newServiceResponse = await departmentsApi.addService(departmentId, selectedTemplate.id, servicePayload);
            const newService = newServiceResponse.data; // Extract the service data

            let supervisorUserId: string | null = null;

            // 2. Create Supervisor User if requested (now that we have service_id)
            if (createSupervisor && userData.email) {
                try {
                    const userPayload = {
                        email: userData.email,
                        password: userData.password,
                        full_name: userData.full_name,
                        organization_id: organizationId,
                        role: 'SERVICE_SUPERVISOR',
                        event_id: eventId,
                        department_id: departmentId,
                        service_id: newService.id, // Now we have the service ID
                    };

                    console.log('[Service Wizard] Creating supervisor user with service_id:', userPayload);
                    const newUserResp = await usersApi.create(userPayload);

                    if (newUserResp?.success && newUserResp?.data?.id) {
                        supervisorUserId = newUserResp.data.id;

                        // 3. Update the service with the assigned supervisor
                        try {
                            await departmentsApi.updateService(departmentId, newService.id, {
                                assigned_supervisor_id: supervisorUserId || undefined
                            });
                            console.log('[Service Wizard] Service updated with supervisor');
                        } catch (updateError) {
                            console.error('Failed to update service with supervisor:', updateError);
                        }

                        toast.success("Service Supervisor account created and credentials sent.");
                    }
                } catch (userError: any) {
                    console.error("Supervisor user creation failed:", userError);
                    toast.error(`Service created, but supervisor account failed: ${userError.message}`);
                }
            }

            // 3. Create Alert Rules if any configured
            if (alertRules.length > 0) {
                try {
                    const rulesToCreate = alertRules
                        .filter(rule => rule.metric && rule.threshold) // Only valid rules
                        .map(rule => ({
                            organization_id: organizationId,
                            name: rule.name || `${rule.metric} Alert`,
                            description: rule.description || `Alert when ${rule.metric} ${rule.operator} ${rule.threshold}`,
                            condition: {
                                metric: rule.metric,
                                operator: rule.operator,
                                threshold: isNaN(Number(rule.threshold)) ? rule.threshold : Number(rule.threshold),
                                aggregation: rule.aggregation && rule.aggregation !== 'none' ? rule.aggregation : undefined,
                                time_window: rule.timeWindow || undefined,
                            },
                            severity: rule.severity,
                            is_active: true,
                            service_id: newService.id,
                            event_id: eventId,
                            cooldown_seconds: rule.cooldownSeconds || 300,
                            actions: rule.actions && rule.actions.length > 0
                                ? rule.actions.map((a: ActionType) => ({ type: a as 'alert' | 'email' | 'webhook' | 'escalate' | 'notification', config: {} }))
                                : [{ type: 'alert' as const, config: {} }],
                        }));

                    if (rulesToCreate.length > 0) {
                        await alertRulesApi.createBulk(rulesToCreate);
                        console.log('[Service Wizard] Alert rules created:', rulesToCreate.length);
                        toast.success(`${rulesToCreate.length} alert rule(s) configured.`);
                    }
                } catch (rulesError: any) {
                    console.error('Failed to create alert rules:', rulesError);
                    toast.error('Service created, but some alert rules failed to save.');
                }
            }

            // 4. Create Escalation Policies if any configured
            if (escalationPolicies.length > 0) {
                try {
                    const policiesToCreate = escalationPolicies
                        .filter(policy => policy.autoAssignTo) // Only policies with assigned user
                        .map(policy => ({
                            organization_id: organizationId,
                            event_id: eventId,
                            service_id: newService.id,
                            name: `Level ${policy.level} Escalation`,
                            escalation_level: policy.level,
                            escalation_delay_minutes: policy.delayMinutes,
                            auto_assign_to: policy.autoAssignTo,
                            notify_method: policy.notifyMethod,
                            is_active: true,
                        }));

                    if (policiesToCreate.length > 0) {
                        await escalationPoliciesApi.createBulk(policiesToCreate);
                        console.log('[Service Wizard] Escalation policies created:', policiesToCreate.length);
                        toast.success(`${policiesToCreate.length} escalation level(s) configured.`);
                    }
                } catch (escError: any) {
                    console.error('Failed to create escalation policies:', escError);
                    toast.error('Service created, but escalation policies failed to save.');
                }
            }

            toast.success(`${selectedTemplate.name} added to ${departmentName} successfully`);
            onSuccess(newService);
            onClose();

        } catch (error: any) {
            console.error('Add service error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to add service';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Render Steps
    const renderTemplateStep = () => {
        const filteredTemplates = templates.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Filter out already assigned services
        const assignedServiceIds = existingServices.map(s => s.service_template_id || s.service_id || s.id);
        const availableTemplates = filteredTemplates.filter(t => !assignedServiceIds.includes(t.id));

        return (
            <div className="space-y-4 h-full flex flex-col">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search services..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="space-y-3">
                    {templates.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">Loading service templates...</div>
                    ) : availableTemplates.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>All available services have been assigned!</p>
                        </div>
                    ) : (
                        availableTemplates.map((template) => {
                            const isSelected = selectedTemplate?.id === template.id;
                            return (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all group text-left ${isSelected
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'border-border bg-card hover:bg-muted/50 hover:border-primary/30'
                                        }`}
                                >
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform bg-primary/10"
                                    >
                                        <Layers className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold text-foreground">
                                                {template.name}
                                            </h3>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                {template.category}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {template.description || 'No description provided'}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <div className="self-center">
                                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    const renderSupervisorStep = () => (
        <div className="space-y-6">
            <div className="flex bg-muted/50 p-1 rounded-lg w-fit mb-6">
                <button
                    type="button"
                    onClick={() => setCreateSupervisor(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${createSupervisor ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Create Service Supervisor
                </button>
                <button
                    type="button"
                    onClick={() => setCreateSupervisor(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${!createSupervisor ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Skip (Add Later)
                </button>
            </div>

            {createSupervisor && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                    <div className="space-y-4">
                        <Input
                            label="Full Name"
                            placeholder="e.g. John Doe"
                            value={userData.full_name}
                            onChange={(e) => { setUserData({ ...userData, full_name: e.target.value }); setFieldErrors(prev => ({ ...prev, full_name: '' })); }}
                            error={fieldErrors.full_name}
                            icon={User}
                        />
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="supervisor@example.com"
                            value={userData.email}
                            onChange={(e) => { setUserData({ ...userData, email: e.target.value }); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                            error={fieldErrors.email}
                            icon={Mail}
                        />
                        <PasswordInput
                            label="Password"
                            value={userData.password}
                            onChange={(value) => {
                                setUserData({ ...userData, password: value });
                                setFieldErrors(prev => ({ ...prev, password: '', confirmPassword: '' }));
                            }}
                            error={fieldErrors.password}
                        />
                        <PasswordInput
                            label="Confirm Password"
                            value={userData.confirmPassword}
                            onChange={(value) => {
                                setUserData({ ...userData, confirmPassword: value });
                                setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                            }}
                            error={fieldErrors.confirmPassword}
                            confirmValue={userData.password}
                        />
                        <PasswordRequirements password={userData.password} />
                    </div>

                    <div className="h-full p-6 rounded-xl border border-border bg-muted/5 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                <Activity className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-foreground">Service Supervisor</h3>
                                <p className="text-xs text-muted-foreground">Service Management Role</p>
                            </div>
                        </div>
                        <div className="space-y-3 pl-1">
                            <div className="flex items-start gap-3 group">
                                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">Device Management</p>
                                    <p className="text-xs text-muted-foreground">Add, configure, and monitor devices</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 group">
                                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">Alert Management</p>
                                    <p className="text-xs text-muted-foreground">Create and manage alert rules</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 group">
                                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">Technician Oversight</p>
                                    <p className="text-xs text-muted-foreground">Manage technicians and assign tasks</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 group">
                                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">Service Configuration</p>
                                    <p className="text-xs text-muted-foreground">Configure service parameters and settings</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!createSupervisor && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
                    <Activity className="w-12 h-12 mb-4 opacity-20" />
                    <p>No Service Supervisor will be created.</p>
                    <p className="text-sm">You can assign one later from the Service settings.</p>
                </div>
            )}
        </div>
    );

    const renderAlertRulesStep = () => (
        <AlertRulesStep
            serviceTemplateId={selectedTemplate?.id || ''}
            rules={alertRules}
            onRulesChange={setAlertRules}
        />
    );

    const renderEscalationStep = () => (
        <EscalationPolicyStep
            organizationId={organizationId}
            departmentId={departmentId}
            eventId={eventId}
            policies={escalationPolicies}
            onPoliciesChange={setEscalationPolicies}
        />
    );

    const renderReviewStep = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Service Config</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Service</span>
                            <span className="font-medium">{selectedTemplate?.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Category</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{selectedTemplate?.category}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Department</span>
                            <span className="font-medium">{departmentName}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Supervisor Account</h4>
                    {createSupervisor ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Name</span>
                                <span className="font-medium">{userData.full_name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Email</span>
                                <span className="font-medium">{userData.email}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Role</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">Service Supervisor</span>
                            </div>
                            <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Account will be created & credentials emailed
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground italic">No supervisor account configured</div>
                    )}
                </div>
            </div>

            {/* Alert Rules Summary */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Alert Rules
                </h4>
                {alertRules.length > 0 ? (
                    <div className="space-y-2">
                        {alertRules.map((rule, index) => (
                            <div key={rule.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                                    <span className="text-sm">{rule.name || 'Unnamed Rule'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                        {rule.metric || 'Metric'} {rule.operator} {rule.threshold || 'Value'}
                                    </code>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${rule.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-600' :
                                        rule.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-600' :
                                            rule.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-600' :
                                                'bg-blue-500/10 text-blue-600'
                                        }`}>
                                        {rule.severity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground italic">No alert rules configured</div>
                )}
            </div>

            {/* Escalation Policies Summary */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <ArrowUp className="w-4 h-4" />
                    Escalation Policy
                </h4>
                {escalationPolicies.length > 0 ? (
                    <div className="space-y-2">
                        {escalationPolicies.map((policy) => (
                            <div key={policy.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary flex items-center justify-center text-xs font-bold text-primary">
                                        {policy.level}
                                    </span>
                                    <span className="text-sm">Level {policy.level}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Escalate after {policy.delayMinutes} min</span>
                                    <span className="px-2 py-0.5 bg-muted rounded">{policy.notifyMethod}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground italic">No escalation policy configured</div>
                )}
            </div>

            {selectedTemplate?.description && (
                <div className="bg-muted/30 border border-border rounded-xl p-6">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Service Description</h4>
                    <p className="text-sm text-foreground">{selectedTemplate.description}</p>
                </div>
            )}
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl bg-background">
                <SetupWizard
                    title="Add Service"
                    description={`Add a new service to ${departmentName}`}
                    breadcrumbs={[]}
                    steps={STEPS}
                    currentStep={currentStep}
                    onNext={currentStep === STEPS.length - 1 ? handleCreate : handleNext}
                    onBack={currentStep > 0 ? () => setCurrentStep(prev => prev - 1) : undefined}
                    onCancel={onClose}
                    isLastStep={currentStep === STEPS.length - 1}
                    isLoading={isLoading}
                    hideSidebar={false}
                    className="!p-6 !max-w-none"
                >
                    {currentStep === 0 && renderTemplateStep()}
                    {currentStep === 1 && renderSupervisorStep()}
                    {currentStep === 2 && renderAlertRulesStep()}
                    {currentStep === 3 && renderEscalationStep()}
                    {currentStep === 4 && renderReviewStep()}
                </SetupWizard>
            </div>
        </div>
    );
}
