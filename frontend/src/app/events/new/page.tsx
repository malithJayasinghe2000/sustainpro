'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Calendar, Building2, MapPin, Check, AlertCircle,
    Save, Image as ImageIcon, ShieldCheck, Crown, Zap, Thermometer, Ticket,
    User, Mail, Lock, UserPlus, X, CheckCircle2, UserCog, Globe,
    Trophy, Music, Mic2, Briefcase, PartyPopper, Snowflake, Sun, Tent, Layers
} from 'lucide-react';
import { organizationsApi, eventsApi, uploadApi, usersApi, getImageUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import SetupWizard from '@/components/SetupWizard';
import { Input } from '@/components/ui/Input';
import { RichSelect } from '@/components/ui/RichSelect';
import { Textarea } from '@/components/ui/Textarea';
import { PasswordInput } from '@/components/ui/PasswordInput';
import PasswordRequirements, { usePasswordValidation } from '@/components/PasswordRequirements';
import { toast } from 'sonner';
import GoogleMap from '@/components/GoogleMap';

interface WizardStep {
    id: 'OVERVIEW' | 'LOCATION' | 'MANAGER' | 'REVIEW';
    label: string;
}

const STEPS: WizardStep[] = [
    { id: 'OVERVIEW', label: 'Event Overview' },
    { id: 'LOCATION', label: 'Location & Logistics' },
    { id: 'MANAGER', label: 'Event Manager' },
    { id: 'REVIEW', label: 'Review & Create' }
];

export default function NewEventPage() {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [orgs, setOrgs] = useState<any[]>([]);

    // Event Form Data
    const [formData, setFormData] = useState({
        organization_id: '',
        name: '',
        description: '',
        event_type: 'MEGA_SPORTING',
        location: '',
        coordinates: { lat: 0, lng: 0 },
        start_date: '',
        end_date: '',
        status: 'PLANNING',
        image_url: '',
        // Hidden / Optional fields (kept for schema compatibility)
        climate_control: 'OUTDOOR_OPEN',
        power_requirement: ''
    });

    // Manager Form Data
    const [createManager, setCreateManager] = useState(true); // Toggle logic: true = New, false = Existing
    const [existingManagerId, setExistingManagerId] = useState(''); // Selected existing manager
    const [managerCandidates, setManagerCandidates] = useState<any[]>([]); // List of potential managers
    const [searchTerm, setSearchTerm] = useState(''); // Local search filter

    useEffect(() => {
        // Fetch candidate managers when organization is selected or on mount
        if (formData.organization_id) {
            usersApi.getManagerCandidates(formData.organization_id).then((response) => {
                if (response.success) {
                    setManagerCandidates(response.data);
                }
            }).catch(err => console.error("Failed to fetch manager candidates", err));
        } else {
            // Clear if no org selected
            setManagerCandidates([]);
        }
    }, [formData.organization_id]);

    const [managerData, setManagerData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // Validating password against policies
    const { isValid: isPasswordValid } = usePasswordValidation(managerData.password);

    // Image Upload State
    const [imagePreview, setImagePreview] = useState<string>('');

    // Permission Check - Use permissions only (assigned to roles in RBAC)
    useEffect(() => {
        if (!currentUser) return;

        const canCreate = currentUser.is_super_admin || currentUser.permissions?.includes('events.create');

        if (!canCreate) {
            toast.error('Access Denied', { description: 'You do not have permission to create events.' });
            router.push('/events');
        }
    }, [currentUser, router]);

    useEffect(() => {
        if (currentUser?.is_super_admin) {
            organizationsApi.getAll({ limit: 1000 }).then(res => setOrgs(res.data)).catch(console.error);
        } else if (currentUser?.organization_id) {
            setFormData(prev => ({ ...prev, organization_id: currentUser.organization_id }));
        }
    }, [currentUser]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setFieldErrors(prev => ({ ...prev, image_url: 'File size must be less than 5MB' }));
                return;
            }

            try {
                // Determine if we want to upload immediately or wait on submit.
                // Organization page waits. For simplicity here let's upload immediately to get the URL
                // reusing current logic but handling existing preview state better.
                const res = await uploadApi.uploadImage(file);
                setFormData(prev => ({ ...prev, image_url: res.url }));
                setImagePreview(res.url); // Use the URL itself for preview
                setFieldErrors(prev => ({ ...prev, image_url: '' }));
            } catch (err) {
                setFieldErrors(prev => ({ ...prev, image_url: 'Failed to upload image' }));
            }
        }
    };

    const handleLocationSelect = (lat: number, lng: number, locationName?: string) => {
        setFormData(prev => ({
            ...prev,
            coordinates: { lat, lng },
            location: locationName || prev.location
        }));
    };

    const nextStep = () => {
        // Validation
        const errors: Record<string, string> = {};

        if (currentStep === 0) {
            if (!formData.name?.trim()) errors.name = "Event Name is required";
            if (!formData.organization_id) errors.organization_id = "Organization is required";
            if (!formData.start_date) errors.start_date = "Start date is required";
            if (!formData.end_date) errors.end_date = "End date is required";

            // Date Logic Check
            if (formData.start_date && formData.end_date) {
                const start = new Date(formData.start_date);
                const end = new Date(formData.end_date);
                if (end < start) {
                    errors.end_date = "End date cannot be before start date";
                }
                // Check that start date is not in the past
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                if (start < now) {
                    errors.start_date = "Start date cannot be in the past";
                }
            }
        }

        // Step 1 (Location) - Location is optional but validate coordinates if location is entered
        if (currentStep === 1) {
            // Location is optional, no strict validation needed
            // If you want to require location, uncomment below:
            // if (!formData.location?.trim()) errors.location = "Location is required";
        }

        if (currentStep === 2) {
            if (createManager) {
                // Creating new manager - validate all fields
                if (!managerData.full_name?.trim()) errors.full_name = "Full name is required";
                if (!managerData.email?.trim()) {
                    errors.email = "Email is required";
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerData.email)) {
                    errors.email = "Invalid email format";
                }
                if (!managerData.password) errors.password = "Password is required";
                else if (!isPasswordValid) errors.password = "Password does not meet requirements";
                if (managerData.password && managerData.password !== managerData.confirmPassword) {
                    errors.confirmPassword = "Passwords do not match";
                }
            } else {
                // Selecting existing manager - validate selection
                if (!existingManagerId) {
                    errors.existingManager = "Please select an existing manager";
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            // Show toast for better visibility
            const firstError = Object.values(errors)[0];
            toast.error('Validation Error', { description: firstError });
            return;
        }

        setFieldErrors({});
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
        setFieldErrors({});
    };

    const handleSubmit = async () => {
        let createdEventId: string | null = null;
        
        try {
            setIsLoading(true);
            setFieldErrors({});

            // 1. Prepare Event Payload
            const eventPayload: any = {
                ...formData,
                start_date: new Date(formData.start_date).toISOString(),
                end_date: new Date(formData.end_date).toISOString(),
            };

            // If selecting existing manager, attach ID
            if (!createManager && existingManagerId) {
                eventPayload.managed_by_id = existingManagerId;
            }

            // 2. Create Event
            const createdEvent = await eventsApi.create(eventPayload);
            createdEventId = createdEvent?.id;

            // console.log('[Event Create] Created event:', createdEvent);
            // console.log('[Event Create] New Event ID:', createdEventId);

            // 3. Create NEW Manager (only if requested)
            if (createManager && managerData.email) {
                try {
                    const managerPayload = {
                        email: managerData.email,
                        password: managerData.password,
                        full_name: managerData.full_name,
                        organization_id: formData.organization_id,
                        role: 'EVENT_MANAGER',
                        event_id: createdEventId // Link to the new event
                    };
                    //console.log('[Event Create] Creating manager with payload:', managerPayload);

                    await usersApi.create(managerPayload);
                } catch (userError: any) {
                    console.error("User creation failed:", userError);
                    
                    // ROLLBACK: Delete the created event since manager creation failed
                    if (createdEventId) {
                        try {
                            await eventsApi.delete(createdEventId);
                            console.log('[Event Create] Rolled back event creation due to manager failure');
                        } catch (deleteError) {
                            console.error('[Event Create] Failed to rollback event:', deleteError);
                        }
                    }
                    
                    const errorMsg = `Manager creation failed: ${userError.response?.data?.error || userError.message}. Event creation was cancelled.`;
                    setFieldErrors(prev => ({
                        ...prev,
                        submit: errorMsg
                    }));
                    toast.error('Creation Failed', { description: errorMsg });
                    setIsLoading(false);
                    return; // Stop here, don't redirect
                }
            }

            // Success
            toast.success('Event Created', {
                description: `${formData.name} has been created successfully.${createManager ? ' Manager credentials have been sent via email.' : ''}`
            });
            router.push('/events');
        } catch (error: any) {
            console.error('Submit Error:', error);
            const errorMsg = error.response?.data?.error || 'Failed to create event';
            setFieldErrors(prev => ({
                ...prev,
                submit: errorMsg
            }));
            toast.error('Event Creation Failed', { description: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };


    const renderOverview = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Event Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {currentUser?.is_super_admin && (
                        <RichSelect
                            label="Organization *"
                            value={formData.organization_id}
                            onChange={val => { setFormData({ ...formData, organization_id: val }); setFieldErrors(prev => ({ ...prev, organization_id: '' })); }}
                            options={[
                                { value: '', label: 'Select Organization', icon: Building2 },
                                ...orgs.map(org => ({ value: org.id, label: org.name, image: getImageUrl(org.logo_url) || undefined }))
                            ]}
                            error={fieldErrors.organization_id}
                            icon={Building2}
                        />
                    )}
                    <Input
                        label="Official Event Name *"
                        placeholder="e.g. Formula 1 Abu Dhabi Grand Prix 2025"
                        value={formData.name}
                        onChange={e => { setFormData({ ...formData, name: e.target.value }); setFieldErrors(prev => ({ ...prev, name: '' })); }}
                        error={fieldErrors.name}
                    />

                    <RichSelect
                        label="Mega-Event Category"
                        value={formData.event_type}
                        onChange={val => setFormData({ ...formData, event_type: val })}
                        options={[
                            { value: 'MEGA_SPORTING', label: 'Mega-Sporting Event', icon: Trophy },
                            { value: 'CULTURAL_FESTIVAL', label: 'Cultural & Heritage Festival', icon: Globe },
                            { value: 'CONCERT', label: 'Live Entertainment / Concert', icon: Music },
                            { value: 'MICE', label: 'MICE & Trade Show', icon: Briefcase },
                            { value: 'ROYAL_SUMMIT', label: 'Royal / Sovereign Event', icon: Crown },
                            { value: 'SEASONAL_FESTIVAL', label: 'Seasonal Festival', icon: PartyPopper }
                        ]}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="datetime-local"
                            label="Start Date *"
                            value={formData.start_date}
                            onChange={e => { setFormData({ ...formData, start_date: e.target.value }); setFieldErrors(prev => ({ ...prev, start_date: '' })); }}
                            error={fieldErrors.start_date}
                            icon={Calendar}
                        />

                        <Input
                            type="datetime-local"
                            label="End Date *"
                            value={formData.end_date}
                            min={formData.start_date} // UI Constraint: Cannot select date before start
                            onChange={e => { setFormData({ ...formData, end_date: e.target.value }); setFieldErrors(prev => ({ ...prev, end_date: '' })); }}
                            error={fieldErrors.end_date}
                            icon={Calendar}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="label-compact">Event Banner</label>
                    <div className="h-full min-h-[160px]">
                        {formData.image_url ? (
                            <div className="relative w-full h-full min-h-[160px] rounded-lg border border-border overflow-hidden bg-muted/10 flex items-center justify-center group">
                                <img src={getImageUrl(formData.image_url) || ''} alt="Banner Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, image_url: '' }));
                                            setImagePreview('');
                                        }}
                                        className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-600 flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-full min-h-[160px] border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors gap-3 p-6">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">Click to Upload Banner</p>
                                    <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG (max. 5MB)</p>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>
                </div>
            </div>

            <Textarea
                label="Executive Summary"
                placeholder="Description for stakeholder reports..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="resize-none min-h-[100px]"
            />
        </div>
    );

    const renderLocation = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Location & Logistics</h2>

            <div className="rounded-xl overflow-hidden border border-border h-[400px]">
                <GoogleMap
                    key={`location-map-${currentStep}`}
                    lat={formData.coordinates?.lat}
                    lng={formData.coordinates?.lng}
                    onLocationSelect={handleLocationSelect}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Input
                        label="Main Venue Location"
                        placeholder="Select location from map above"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                        icon={MapPin}
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        Auto-filled when you search, click, or drag the marker on the map
                    </p>
                </div>
                <RichSelect
                    label="Climate Control"
                    value={formData.climate_control}
                    onChange={val => setFormData({ ...formData, climate_control: val })}
                    options={[
                        { value: 'INDOOR', label: 'Indoors (AC)', icon: Snowflake },
                        { value: 'OUTDOOR_OPEN', label: 'Outdoors - Open Air', icon: Sun },
                        { value: 'OUTDOOR_TENT', label: 'Outdoors - AC Tent', icon: Tent },
                        { value: 'HYBRID', label: 'Hybrid', icon: Layers }
                    ]}
                />
            </div>
        </div>
    );

    const renderManager = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="header-section">Event Manager Setup</h2>
                <p className="text-sm text-muted-foreground">Assign a dedicated manager for this event.</p>
            </div>



            {/* Manager Selection Toggle */}
            <div className="flex bg-muted/50 p-1 rounded-lg w-fit mb-6">
                <button
                    type="button"
                    onClick={() => setCreateManager(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${createManager ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Create New Manager
                </button>
                <button
                    type="button"
                    onClick={() => setCreateManager(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${!createManager ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Select Existing
                </button>
            </div>

            {/* Candidate Dropdown for Existing Manager */}
            {!createManager && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
                    <div className="lg:col-span-4 space-y-4">
                        <div className="relative">
                            <Input
                                label="Search Managers"
                                placeholder="Search by name, email or status..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {fieldErrors.existingManager && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {fieldErrors.existingManager}
                            </div>
                        )}

                        <div className="bg-card dark:bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {managerCandidates
                                        .filter(m =>
                                            m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (m.is_active ? 'active' : 'inactive').includes(searchTerm.toLowerCase())
                                        )
                                        .map((m) => (
                                            <tr key={m.id} className={`hover:bg-muted/30 transition-colors ${existingManagerId === m.id ? 'bg-primary/5' : ''}`}>
                                                <td className="p-3">
                                                    <div className="font-medium text-foreground">{m.full_name}</div>
                                                    <div className="text-xs text-muted-foreground">{m.email}</div>
                                                </td>
                                                <td className="p-3">
                                                    {m.is_active ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            Active ({m.active_event_count})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setExistingManagerId(m.id); setFieldErrors(prev => ({ ...prev, existingManager: '' })); }}
                                                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${existingManagerId === m.id
                                                            ? 'bg-primary text-primary-foreground border-primary'
                                                            : 'bg-background hover:bg-muted border-border text-foreground'
                                                            }`}
                                                    >
                                                        {existingManagerId === m.id ? 'Selected' : 'Select'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    {managerCandidates.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-6 text-center text-muted-foreground">
                                                No existing managers found in this organization.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {createManager && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-300">
                    <div className="lg:col-span-3 space-y-5">
                        <Input
                            label="Manager Full Name *"
                            placeholder="e.g. Sarah Connor"
                            value={managerData.full_name}
                            onChange={e => { setManagerData({ ...managerData, full_name: e.target.value }); setFieldErrors(prev => ({ ...prev, full_name: '' })); }}
                            error={fieldErrors.full_name}
                            icon={User}
                        />
                        <Input
                            label="Email Address *"
                            type="email"
                            placeholder="sarah@event-org.com"
                            value={managerData.email}
                            onChange={e => { setManagerData({ ...managerData, email: e.target.value }); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                            error={fieldErrors.email}
                            icon={Mail}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PasswordInput
                                label="Password *"
                                value={managerData.password}
                                onChange={(value) => {
                                    setManagerData({ ...managerData, password: value });
                                    setFieldErrors(prev => ({ ...prev, password: '', confirmPassword: '' }));
                                }}
                                error={fieldErrors.password}
                            />
                            <PasswordInput
                                label="Confirm Password"
                                value={managerData.confirmPassword}
                                onChange={(value) => {
                                    setManagerData({ ...managerData, confirmPassword: value });
                                    setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                                }}
                                error={fieldErrors.confirmPassword}
                                confirmValue={managerData.password}
                            />
                        </div>
                        {/* Password Requirements */}
                        <PasswordRequirements password={managerData.password} />
                    </div>
                    {/* Right Column - 40% - Role Card */}
                    <div className="lg:col-span-2">
                        <div className="h-full p-6 rounded-xl border border-border bg-muted/5 space-y-6 !shadow-none">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <UserCog className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-foreground">Event Manager</h3>
                                    <p className="text-xs text-muted-foreground">Operational Lead</p>
                                </div>
                            </div>
                            <div className="space-y-3 pl-1">
                                <div className="flex items-start gap-3 group">
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium text-foreground">Event Operations</p>
                                        <p className="text-xs text-muted-foreground">Manage logistics, schedule, and assets</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 group">
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium text-foreground">Staff Coordination</p>
                                        <p className="text-xs text-muted-foreground">Oversee department heads and teams</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderReview = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Review & Launch</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Left Column: Event Summary */}
                <div className="flex">
                    <div className="card-compact !shadow-none border-border/60 w-full">
                        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Event Profile
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                                <div className="space-y-1 col-span-2">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Event Name</span>
                                    <p className="font-medium text-foreground">{formData.name || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Type</span>
                                    <p className="font-medium text-foreground">{formData.event_type.replace('_', ' ')}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Location</span>
                                    <p className="font-medium text-foreground truncate" title={formData.location}>{formData.location || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-border/50">
                                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" /> Schedule
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Start</span>
                                        <span className="font-medium">{formData.start_date ? new Date(formData.start_date).toLocaleString() : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">End</span>
                                        <span className="font-medium">{formData.end_date ? new Date(formData.end_date).toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Manager Access */}
                <div className="flex">
                    <div className="card-compact !shadow-none border-border/60 w-full flex flex-col">
                        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                            <UserCog className="w-4 h-4" /> Manager Access
                        </h3>
                        <div className="flex-1 space-y-6 flex flex-col justify-between">
                            {createManager ? (
                                <>
                                    <div className="space-y-6">
                                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{managerData.full_name || 'Event Manager'}</p>
                                                <p className="text-[11px] text-muted-foreground font-medium">Primary Event Lead</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 px-1">
                                            <div className="space-y-1">
                                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Login Email</span>
                                                <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/50 text-sm">
                                                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span className="font-medium text-foreground">{managerData.email || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-border/50">
                                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-semibold bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Security credentials configured
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                        <UserPlus className="w-6 h-6 opacity-50" />
                                    </div>
                                    <p>No Manager Account will be created.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {fieldErrors.submit && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {fieldErrors.submit}
                </div>
            )}
        </div>
    );

    return (
        <DashboardLayout>
            <SetupWizard
                title="Create Mega Event"
                description="Setup high-security, permitted events (F1, Festivals, Royal Summits)."
                breadcrumbs={[
                    { label: 'Back to Events', href: '/events' },
                    { label: 'Create Event', href: '#' }
                ]}
                steps={STEPS}
                currentStep={currentStep}
                onNext={currentStep === STEPS.length - 1 ? handleSubmit : nextStep}
                onBack={prevStep}
                nextLabel={currentStep === STEPS.length - 1 ? 'Launch Event' : 'Next Step'}
                backLabel="Back"
                isLastStep={currentStep === STEPS.length - 1}
                isLoading={isLoading}
            >
                {currentStep === 0 && renderOverview()}
                {currentStep === 1 && renderLocation()}
                {currentStep === 2 && renderManager()}
                {currentStep === 3 && renderReview()}
            </SetupWizard>
        </DashboardLayout>
    );
}
