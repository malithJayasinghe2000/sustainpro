// Basic User Profile Interface
export interface User {
    id: string;
    email: string;
    code: string; // SPS-USR-001
    full_name?: string;
    is_active: boolean;
    is_super_admin: boolean;
    timezone?: string;
    organization_id: string;
    org_name?: string;
    org_logo?: string;
    theme_config?: { primary?: string;[key: string]: any };

    // Flattened roles for UI convenience
    roles: RoleAssignment[];
    permissions?: string[]; // Dynamic Permissions
    
    // Context IDs from role assignments
    eventIds?: string[];  // Event IDs assigned to user
    deptIds?: string[];   // Department IDs assigned to user
    serviceIds?: string[]; // Service IDs assigned to user


    created_at: string;
    last_login_at?: string;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    code: string; // SPS-ORG-001
    type: 'PROVIDER' | 'CLIENT' | 'PARTNER';
    description?: string;
    industry?: string;
    website?: string;
    logo_url?: string;
    timezone?: string;
    theme_config?: { primary?: string;[key: string]: any };

    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    vat_id?: string;
    billing_email?: string;
    contact_email?: string; // Often came from join, but useful to have here

    plan_tier?: 'BASIC' | 'PRO' | 'ENTERPRISE';
    max_users?: number;

    max_devices?: number;
    subscription_status?: string;

    // Counts from API
    user_count?: number;
    device_count?: number;

    created_at?: string;
}

export interface RoleAssignment {
    role: string;
    org_id?: string;
    event_id?: string;
    dept_id?: string;
    service_id?: string;
}

export interface LoginResponse {
    message: string;
    token: string;
    user: User;
    expiresIn: number;
}
