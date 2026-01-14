'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Building2, Globe, MapPin, Phone, Mail, Upload, Loader2, X, User, UserCog, CheckCircle2, Clock, Briefcase, Shield } from 'lucide-react';
import { organizationsApi, uploadApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { RichSelect } from '@/components/ui/RichSelect';
import { Textarea } from '@/components/ui/Textarea';
import SetupWizard from '@/components/SetupWizard';
import { PasswordInput, PasswordStrength } from '@/components/ui/PasswordInput';
import { getTimezones } from '@/lib/timezones';
import { useSettings } from '@/contexts/SettingsContext';

interface WizardStep {
    id: 'PROFILE' | 'BRANDING' | 'LOCATION' | 'ADMIN' | 'REVIEW';
    label: string;
}

const STEPS: WizardStep[] = [
    { id: 'PROFILE', label: 'Organization Profile' },
    { id: 'BRANDING', label: 'Regional & Branding' },
    { id: 'LOCATION', label: 'Contact Details' },
    { id: 'ADMIN', label: 'Organization Admin Setup' },
    { id: 'REVIEW', label: 'Review & Create' }
];

export default function NewOrganizationPage() {
    const router = useRouter();
    const { settings } = useSettings();
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Get all timezones with icons
    const timezoneOptions = useMemo(() => {
        return getTimezones().map(tz => ({
            value: tz.value,
            label: tz.label,
            icon: Globe
        }));
    }, []);

    // Image upload state (deferred until final submit)
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');

    // Default timezone from system settings
    const defaultTimezone = settings?.default_timezone || 'UTC';

    // New Org Form State
    const [newOrg, setNewOrg] = useState({
        name: '',
        slug: '',
        contact_email: '',
        type: 'CLIENT',
        description: '',
        industry: '',
        website: '',
        address: '',
        city: '',
        country: '',
        phone: '',
        vat_id: '',
        billing_email: '',
        // logo_url removed - will be set after upload on submit
        timezone: defaultTimezone,
        theme_color: '#0d9488',
        admin_password: '',
        admin_password_confirm: '',
        admin_full_name: ''
    });

    // Update timezone when settings load
    useEffect(() => {
        if (settings?.default_timezone && newOrg.timezone === 'UTC') {
            setNewOrg(prev => ({ ...prev, timezone: settings.default_timezone }));
        }
    }, [settings?.default_timezone]);

    // Cleanup preview URL on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (logoPreview) {
                URL.revokeObjectURL(logoPreview);
            }
        };
    }, [logoPreview]);

    const nextStep = () => {
        const errors: Record<string, string> = {};

        if (currentStep === 0) {
            if (!newOrg.name) errors.name = "Organization name is required";
        }

        if (currentStep === 3) { // Organization Admin Setup
            if (!newOrg.admin_full_name.trim()) errors.admin_full_name = 'Admin full name is required';
            if (!newOrg.contact_email.trim()) errors.contact_email = 'Admin email is required';
            if (!newOrg.admin_password) errors.admin_password = 'Password is required';
            if (newOrg.admin_password.length < 8) errors.admin_password = 'Password must be at least 8 characters';
            if (!newOrg.admin_password_confirm) errors.admin_password_confirm = 'Please confirm password';
            if (newOrg.admin_password !== newOrg.admin_password_confirm) {
                errors.admin_password_confirm = 'Passwords do not match';
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
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
        try {
            setIsLoading(true);
            setFieldErrors({});

            // 1. Upload logo first (if selected)
            let logoUrl = '';
            if (logoFile) {
                try {
                    const uploadResponse = await uploadApi.uploadImage(logoFile);
                    logoUrl = uploadResponse.url;
                } catch (uploadError: any) {
                    setFieldErrors({ logo: uploadError.response?.data?.error || 'Failed to upload logo' });
                    setIsLoading(false);
                    return; // Don't proceed if logo upload fails
                }
            }

            // 2. Create organization with uploaded logo URL
            const payload = {
                ...newOrg,
                logo_url: logoUrl,
                theme_config: { primary: newOrg.theme_color },
                // Explicitly include admin details
                admin_name: newOrg.admin_full_name,
                admin_email: newOrg.contact_email,
                admin_password: newOrg.admin_password
            };
            // @ts-ignore
            delete payload.theme_color;
            // @ts-ignore
            delete payload.admin_full_name;

            await organizationsApi.create(payload);

            // Clean up preview URL
            if (logoPreview) {
                URL.revokeObjectURL(logoPreview);
            }

            router.push('/admin/organizations');
        } catch (err: any) {
            setFieldErrors({ submit: err.response?.data?.error || 'Failed to create organization' });
        } finally {
            setIsLoading(false);
        }
    };

    const renderProfile = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Organization Profile</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <Input
                        label="Organization Name *"
                        placeholder="Acme Corp"
                        value={newOrg.name}
                        onChange={e => {
                            setNewOrg({ ...newOrg, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                            setFieldErrors(prev => ({ ...prev, name: '' }));
                        }}
                        error={fieldErrors.name}
                        required
                    />
                </div>
                <Input
                    label="Slug (URL) *"
                    placeholder="acme-corp"
                    value={newOrg.slug}
                    readOnly
                    className="bg-muted/50 font-mono text-xs"
                />
                <RichSelect
                    label="Organization Type"
                    value={newOrg.type}
                    onChange={val => setNewOrg({ ...newOrg, type: val })}
                    options={[
                        { value: 'CLIENT', label: 'Client', icon: Briefcase },
                        { value: 'PARTNER', label: 'Partner', icon: Globe },
                        { value: 'PROVIDER', label: 'SustainPro', icon: Shield }
                    ]}
                />
                <Input
                    label="Industry Sector"
                    placeholder="Manufacturing, Energy..."
                    value={newOrg.industry}
                    onChange={e => setNewOrg({ ...newOrg, industry: e.target.value })}
                />
                <Input
                    label="Corporate Website"
                    placeholder="https://acme.com"
                    value={newOrg.website}
                    onChange={e => setNewOrg({ ...newOrg, website: e.target.value })}
                    icon={Globe}
                />
                <div className="md:col-span-2">
                    <Textarea
                        label="Description"
                        placeholder="Brief overview of the organization..."
                        value={newOrg.description}
                        onChange={e => setNewOrg({ ...newOrg, description: e.target.value })}
                        className="resize-none min-h-[100px]"
                    />
                </div>
            </div>
        </div>
    );

    const renderBranding = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Regional & Branding</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="label-compact">Organization Logo</label>
                    <div className="h-full">
                        {logoPreview ? (
                            <div className="relative w-full aspect-video rounded-lg border border-border overflow-hidden bg-muted/10 flex items-center justify-center group">
                                <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (logoPreview) {
                                                URL.revokeObjectURL(logoPreview);
                                            }
                                            setLogoFile(null);
                                            setLogoPreview('');
                                        }}
                                        className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-600 flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Remove Logo
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative h-full min-h-[200px]">
                                <input
                                    type="file"
                                    id="logo-upload"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        // Validate file size (5MB)
                                        if (file.size > 5 * 1024 * 1024) {
                                            setFieldErrors({ logo: 'File size must be less than 5MB' });
                                            return;
                                        }

                                        // Store file and create preview
                                        setLogoFile(file);
                                        setLogoPreview(URL.createObjectURL(file));
                                        setFieldErrors({ ...fieldErrors, logo: '' });
                                    }}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="logo-upload"
                                    className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors gap-3 p-6"
                                >
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Upload className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-foreground">
                                            Click to Select Logo
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            SVG, PNG, JPG or GIF (max. 5MB)
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1 italic">
                                            Logo will be uploaded when you create the organization
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <RichSelect
                        label="Timezone"
                        value={newOrg.timezone}
                        onChange={val => setNewOrg({ ...newOrg, timezone: val })}
                        options={timezoneOptions}
                        searchable
                        placeholder="Search timezones..."
                    />
                    <div>
                        <label className="label-compact">Theme Color</label>
                        <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card">
                            <input
                                type="color"
                                value={newOrg.theme_color}
                                onChange={e => setNewOrg({ ...newOrg, theme_color: e.target.value })}
                                className="h-10 w-16 p-1 rounded border border-input cursor-pointer bg-background"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Brand Color</p>
                                <p className="text-xs text-muted-foreground font-mono">{newOrg.theme_color}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-border" style={{ backgroundColor: newOrg.theme_color }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAdmin = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="header-section">Organization Admin Setup</h2>
                <p className="text-sm text-muted-foreground">Create the primary administrator account for this organization</p>
            </div>

            {/* Two Column Layout: 60% Password Details | 40% Role Card */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Column - 60% - Password Details */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Full Name */}
                    <Input
                        label="Full Name"
                        placeholder="John Doe"
                        value={newOrg.admin_full_name}
                        onChange={e => {
                            setNewOrg({ ...newOrg, admin_full_name: e.target.value });
                            setFieldErrors(prev => ({ ...prev, admin_full_name: '' }));
                        }}
                        error={fieldErrors.admin_full_name}
                        required
                        icon={User}
                    />

                    {/* Email */}
                    <div className="space-y-1">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="admin@acme.com"
                            value={newOrg.contact_email}
                            onChange={e => {
                                setNewOrg({ ...newOrg, contact_email: e.target.value });
                                setFieldErrors(prev => ({ ...prev, contact_email: '' }));
                            }}
                            error={fieldErrors.contact_email}
                            required
                            icon={Mail}
                        />
                        <p className="text-xs text-muted-foreground">This email will be used for the admin account login</p>
                    </div>


                    {/* Password Fields - Inline */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PasswordInput
                            label="Password"
                            value={newOrg.admin_password}
                            onChange={(value) => {
                                setNewOrg({ ...newOrg, admin_password: value });
                                setFieldErrors(prev => ({ ...prev, admin_password: '', admin_password_confirm: '' }));
                            }}
                            error={fieldErrors.admin_password}
                            required
                        />

                        <PasswordInput
                            label="Confirm Password"
                            value={newOrg.admin_password_confirm}
                            onChange={(value) => {
                                setNewOrg({ ...newOrg, admin_password_confirm: value });
                                setFieldErrors(prev => ({ ...prev, admin_password_confirm: '' }));
                            }}
                            error={fieldErrors.admin_password_confirm}
                            confirmValue={newOrg.admin_password}
                            required
                        />
                    </div>

                    {/* Password Strength - Full Width */}
                    {newOrg.admin_password && (
                        <div className="pt-2 border-t border-dashed border-border/50">
                            <PasswordStrength
                                password={newOrg.admin_password}
                                confirmPassword={newOrg.admin_password_confirm}
                            />
                        </div>
                    )}
                </div>
                {/* Right Column - 40% - Role Card */}
                <div className="lg:col-span-2">
                    <div className="h-full p-6 rounded-xl border border-border bg-muted/5 space-y-6 !shadow-none">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                <UserCog className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-foreground">Organization Admin</h3>
                                <p className="text-xs text-muted-foreground">Highest permission level</p>
                            </div>
                        </div>

                        {/* Clean List */}
                        <div className="space-y-3 pl-1">
                            <div className="flex items-start gap-3 group">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">Full Organization Access</p>
                                    <p className="text-xs text-muted-foreground">Complete control over settings and configuration</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 group">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">User Management</p>
                                    <p className="text-xs text-muted-foreground">Invite, edit, and remove team members</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 group">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">Asset Control</p>
                                    <p className="text-xs text-muted-foreground">Manage all events, devices, and inventory</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderLocation = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Contact Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <Input
                        label="Street Address"
                        placeholder="123 Industrial Ave"
                        value={newOrg.address}
                        onChange={e => setNewOrg({ ...newOrg, address: e.target.value })}
                        icon={MapPin}
                    />
                </div>
                <Input
                    label="City"
                    placeholder="New York"
                    value={newOrg.city}
                    onChange={e => setNewOrg({ ...newOrg, city: e.target.value })}
                />
                <Input
                    label="Country"
                    placeholder="United States"
                    value={newOrg.country}
                    onChange={e => setNewOrg({ ...newOrg, country: e.target.value })}
                />
                <div className="md:col-span-2">
                    <Input
                        label="Phone Number"
                        placeholder="+1 (555) 000-0000"
                        value={newOrg.phone}
                        onChange={e => setNewOrg({ ...newOrg, phone: e.target.value })}
                        icon={Phone}
                    />
                </div>
            </div>
        </div>
    );

    const renderReview = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="header-section">Review & Create</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Left Column: Organization & Location */}
                <div className="flex">
                    <div className="card-compact !shadow-none border-border/60 w-full">
                        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Organization Profile
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                                <div className="space-y-1">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Name</span>
                                    <p className="font-medium text-foreground">{newOrg.name || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Type</span>
                                    <p className="font-medium text-foreground">{newOrg.type}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Industry</span>
                                    <p className="font-medium text-foreground">{newOrg.industry || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Website</span>
                                    <p className="font-medium text-foreground">{newOrg.website || '-'}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/50">
                                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" /> Physical Location
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                                    <div className="space-y-1 col-span-2">
                                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Address</span>
                                        <p className="font-medium text-foreground">{newOrg.address || '-'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">City</span>
                                        <p className="font-medium text-foreground">{newOrg.city || '-'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Country</span>
                                        <p className="font-medium text-foreground">{newOrg.country || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Account Administrator */}
                <div className="flex">
                    <div className="card-compact !shadow-none border-border/60 w-full flex flex-col">
                        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                            <UserCog className="w-4 h-4" /> Account Administrator
                        </h3>

                        <div className="flex-1 space-y-6 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{newOrg.admin_full_name || 'Administrator'}</p>
                                        <p className="text-[11px] text-muted-foreground font-medium">Primary Organization Owner</p>
                                    </div>
                                </div>

                                <div className="space-y-4 px-1">
                                    <div className="space-y-1">
                                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Login Email</span>
                                        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/50 text-sm">
                                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="font-medium text-foreground">{newOrg.contact_email || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border/50">
                                <div className="flex items-center gap-2 text-xs text-green-600 font-semibold bg-green-50/50 p-3 rounded-lg border border-green-100/50">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Security credentials successfully configured
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {fieldErrors.submit && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {fieldErrors.submit}
                </div>
            )}
        </div>
    );

    return (
        <DashboardLayout>
            <SetupWizard
                title="Create Tenant"
                description="Setup a new comprehensive organization profile."
                breadcrumbs={[
                    { label: 'Back to Organizations', href: '/admin/organizations' },
                    { label: 'Create Tenant', href: '#' }
                ]}
                steps={STEPS}
                currentStep={currentStep}
                onNext={currentStep === STEPS.length - 1 ? handleSubmit : nextStep}
                onBack={prevStep}
                nextLabel={currentStep === STEPS.length - 1 ? 'Create Tenant Environment' : 'Next Step'}
                backLabel="Back"
                isLastStep={currentStep === STEPS.length - 1}
                isLoading={isLoading}
            >
                {currentStep === 0 && renderProfile()}
                {currentStep === 1 && renderBranding()}
                {currentStep === 2 && renderLocation()}
                {currentStep === 3 && renderAdmin()}
                {currentStep === 4 && renderReview()}
            </SetupWizard>
        </DashboardLayout>
    );
}
