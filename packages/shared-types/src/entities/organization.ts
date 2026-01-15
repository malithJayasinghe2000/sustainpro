/**
 * Organization entity and related types
 */
export interface Organization {
    id: string;
    name: string;
    slug: string;
    code: string;
    type: OrganizationType;
    description: string | null;
    industry: string | null;
    website: string | null;
    logo_url: string | null;
    timezone: string;
    address: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    vat_id: string | null;
    billing_email: string | null;
    contact_email: string | null;
    plan_tier: PlanTier;
    max_users: number;
    max_devices: number;
    subscription_status: SubscriptionStatus;
    theme_config: Record<string, any>;
    created_at: Date;
    updated_at: Date;
    user_count?: number;
    device_count?: number;
}

export type OrganizationType = 'CLIENT' | 'PROVIDER' | 'PARTNER';
export type PlanTier = 'BASIC' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface CreateOrganizationDto {
    name: string;
    slug?: string;
    type?: OrganizationType;
    description?: string;
    industry?: string;
    website?: string;
    logo_url?: string;
    timezone?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    contact_email?: string;
    theme_config?: Record<string, any>;
    // Admin user details (for creating org admin during org creation)
    admin_name?: string;
    admin_email?: string;
    admin_password?: string;
}

export interface UpdateOrganizationDto {
    name?: string;
    description?: string;
    industry?: string;
    website?: string;
    logo_url?: string;
    timezone?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    contact_email?: string;
    theme_config?: Record<string, any>;
}
