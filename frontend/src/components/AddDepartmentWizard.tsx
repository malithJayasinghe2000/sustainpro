import { useState, useEffect, useCallback } from 'react';
import SetupWizard, { WikiStep } from '@/components/SetupWizard';
import { departmentTemplatesApi, departmentsApi, usersApi } from '@/lib/api';
import { toast } from 'sonner';
import { Layers, Check, Search, MapPin, User, Mail, UserCog, CheckCircle2 } from 'lucide-react';
import GoogleMap from '@/components/GoogleMap';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import PasswordRequirements, { usePasswordValidation } from '@/components/PasswordRequirements';

interface DepartmentTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
}

interface AddDepartmentWizardProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    organizationId: string; // Needed for fetching templates and creating user
    eventCoordinates: { lat: number; lng: number };
    onSuccess: (newDept: any) => void;
    existingDepartments: any[]; // To check for duplicates
}

const STEPS: WikiStep[] = [
    { id: 'TEMPLATE', label: 'Select Template' },
    { id: 'ZONE', label: 'Define Zone' },
    { id: 'HEAD', label: 'Department Head' },
    { id: 'REVIEW', label: 'Review & Create' }
];

// Icon mapping (simplified for this component)
const ICON_MAP: Record<string, any> = {
    Layers,
    // Add others if needed or import from constants
};

export default function AddDepartmentWizard({
    isOpen,
    onClose,
    eventId,
    organizationId,
    eventCoordinates,
    onSuccess,
    existingDepartments
}: AddDepartmentWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Template Data
    const [templates, setTemplates] = useState<DepartmentTemplate[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<DepartmentTemplate | null>(null);

    // Step 2: Zone Data
    const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
    const [locationName, setLocationName] = useState('');

    // Step 3: User Data
    const [userData, setUserData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [createHead, setCreateHead] = useState(false); // Default to not creating initially? Or maybe optional.
    // User requested "3rd Step add department Head Accout", implying it's a key part. Let's make it active by default or toggleable.

    const { isValid: isPasswordValid } = usePasswordValidation(userData.password);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
            // Initialize polygon with a default box around event location
            const lat = eventCoordinates?.lat || 25.2048;
            const lng = eventCoordinates?.lng || 55.2708;
            setPolygonPoints([
                [lat + 0.002, lng - 0.002],
                [lat + 0.002, lng + 0.002],
                [lat - 0.002, lng + 0.002],
                [lat - 0.002, lng - 0.002]
            ]);
            setCreateHead(true); // Default to creating a head account
        } else {
            // Reset state on close
            setCurrentStep(0);
            setSelectedTemplate(null);
            setCreateHead(false);
            setUserData({ full_name: '', email: '', password: '', confirmPassword: '' });
            setFieldErrors({});
        }
    }, [isOpen, eventCoordinates]);

    const fetchTemplates = async () => {
        try {
            const data = await departmentTemplatesApi.getAll(organizationId);
            setTemplates(data);
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error('Failed to load templates');
        }
    };

    const handleNext = () => {
        const errors: Record<string, string> = {};

        if (currentStep === 0) {
            if (!selectedTemplate) {
                toast.error("Please select a department template");
                return;
            }
            // Check duplicates
            const alreadyExists = existingDepartments.some(
                dept => dept.template_origin_id === selectedTemplate.id
            );
            if (alreadyExists) {
                toast.error('This department has already been added to this event');
                return;
            }
        }

        if (currentStep === 1) {
            if (polygonPoints.length < 3) {
                toast.error("Please define a valid area on the map");
                return;
            }
            if (!locationName.trim()) {
                toast.error("Please enter a location name");
                return;
            }
        }

        if (currentStep === 2 && createHead) { // Step 3: User
            if (!userData.full_name) errors.full_name = "Full name is required";
            if (!userData.email) {
                errors.email = "Email is required";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
                errors.email = "Invalid email format";
            }
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

        let createdDeptId: string | null = null;

        try {
            setIsLoading(true);

            // 1. Create Department
            const deptData = {
                event_id: eventId,
                name: selectedTemplate.name,
                location_name: locationName,
                description: selectedTemplate.description,
                icon: selectedTemplate.icon,
                color: selectedTemplate.color,
                template_origin_id: selectedTemplate.id,
                coordinates: { points: polygonPoints }
            };

            const newDept = await departmentsApi.create(deptData);
            createdDeptId = newDept.id;
            console.log('[Department Wizard] Created department:', newDept);

            // 2. Create User (Department Head) if requested
            if (createHead && userData.email) {
                try {
                    const userPayload = {
                        email: userData.email,
                        password: userData.password,
                        full_name: userData.full_name,
                        organization_id: organizationId,
                        role: 'DEPT_HEAD', // Matches backend role code in sps_roles table
                        department_id: newDept.id, // Explicit linking if API supports it
                    };

                    console.log('[Department Wizard] Creating head user:', userPayload);
                    const newUserResp = await usersApi.create(userPayload);

                    if (newUserResp?.success && newUserResp?.data?.id) {
                        try {
                            await departmentsApi.update(newDept.id, { head_user_id: newUserResp.data.id });
                        } catch (err) {
                            console.error('Failed to link head user to dept', err);
                        }
                    }

                    toast.success("Department Head account created and credentials sent.");
                } catch (userError: any) {
                    console.error("User creation failed:", userError);
                    
                    // ROLLBACK: Delete the created department since user creation failed
                    if (createdDeptId) {
                        try {
                            await departmentsApi.delete(createdDeptId);
                            console.log('[Department Wizard] Rolled back department creation due to user failure');
                        } catch (deleteError) {
                            console.error('[Department Wizard] Failed to rollback department:', deleteError);
                        }
                    }
                    
                    toast.error(`Department Head creation failed: ${userError.response?.data?.error || userError.message}. Department creation was cancelled.`);
                    setIsLoading(false);
                    return; // Stop here, don't call onSuccess
                }
            }

            toast.success(`${newDept.name} added successfully`);
            onSuccess(newDept);
            onClose();

        } catch (error: any) {
            console.error('Add department error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to add department';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Render Steps
    const renderTemplateStep = () => {
        const filteredTemplates = templates.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="space-y-4 h-full flex flex-col">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px]">
                    {templates.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
                    ) : (
                        filteredTemplates.map((template) => {
                            const Icon = ICON_MAP[template.icon] || Layers;
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
                                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform"
                                        style={{
                                            backgroundColor: `${template.color || '#3B82F6'}15`,
                                            color: template.color || '#3B82F6'
                                        }}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold text-foreground">
                                                {template.name}
                                            </h3>
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

    const renderZoneStep = () => (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex-1 min-h-[400px] relative border border-border rounded-xl overflow-hidden">
                <GoogleMap
                    lat={eventCoordinates?.lat || 25.2048}
                    lng={eventCoordinates?.lng || 55.2708}
                    drawingMode={true}
                    initialPolygonPoints={polygonPoints}
                    onPolygonChange={setPolygonPoints}
                />
            </div>
            <div>
                <Input
                    label="Zone / Location Name"
                    placeholder="e.g. North Wing, Main Hall"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                    {polygonPoints.length} boundary points selected
                </p>
            </div>
        </div>
    );

    const renderHeadStep = () => (
        <div className="space-y-6">
            <div className="flex bg-muted/50 p-1 rounded-lg w-fit mb-6">
                <button
                    type="button"
                    onClick={() => setCreateHead(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${createHead ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Create Department Head
                </button>
                <button
                    type="button"
                    onClick={() => setCreateHead(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${!createHead ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Skip (Add Later)
                </button>
            </div>

            {createHead && (
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
                            placeholder="john@example.com"
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
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                <UserCog className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-foreground">Department Head</h3>
                                <p className="text-xs text-muted-foreground">Department Lead Role</p>
                            </div>
                        </div>
                        <div className="space-y-3 pl-1">
                            <div className="flex items-start gap-3 group">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">Staff Management</p>
                                    <p className="text-xs text-muted-foreground">Manage shift schedules and assignments</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 group">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">Service Oversight</p>
                                    <p className="text-xs text-muted-foreground">Monitor department services and assets</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!createHead && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
                    <UserCog className="w-12 h-12 mb-4 opacity-20" />
                    <p>No Department Head will be created.</p>
                    <p className="text-sm">You can assign one later from the Team settings.</p>
                </div>
            )}
        </div>
    );

    const renderReviewStep = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Department Config</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Type</span>
                            <span className="font-medium">{selectedTemplate?.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Location Name</span>
                            <span className="font-medium">{locationName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Zone Points</span>
                            <span className="font-medium">{polygonPoints.length} vertices defined</span>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account Config</h4>
                    {createHead ? (
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Head Name</span>
                                <span className="font-medium">{userData.full_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Email</span>
                                <span className="font-medium">{userData.email}</span>
                            </div>
                            <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Account will be created & email sent
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground italic">No head account configured</div>
                    )}
                </div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl bg-background">
                <SetupWizard
                    title="Add Department"
                    description={`Add a new ${selectedTemplate?.name || 'department'} zone to the event.`}
                    breadcrumbs={[]}
                    steps={STEPS}
                    currentStep={currentStep}
                    onNext={currentStep === STEPS.length - 1 ? handleCreate : handleNext}
                    onBack={currentStep > 0 ? () => setCurrentStep(prev => prev - 1) : undefined}
                    onCancel={onClose}
                    isLastStep={currentStep === STEPS.length - 1}
                    isLoading={isLoading}
                    hideSidebar={false} // Show sidebar for step context
                    className="p-6! max-w-none!" // Override container styles
                >
                    {currentStep === 0 && renderTemplateStep()}
                    {currentStep === 1 && renderZoneStep()}
                    {currentStep === 2 && renderHeadStep()}
                    {currentStep === 3 && renderReviewStep()}
                </SetupWizard>
            </div>
        </div>
    );
}
