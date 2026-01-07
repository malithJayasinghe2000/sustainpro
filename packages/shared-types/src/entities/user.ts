/**
 * User entity and related types
 */
export interface User {
    id: string;
    email: string;
    full_name: string;
    code: string;
    organization_id: string | null;
    is_super_admin: boolean;
    is_active: boolean;
    timezone: string;
    failed_login_attempts: number;
    account_locked_until: Date | null;
    last_login: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface UserWithPassword extends User {
    password_hash: string;
}

export interface CreateUserDto {
    email: string;
    password: string;
    full_name: string;
    organization_id?: string;
    timezone?: string;
}

export interface UpdateUserDto {
    email?: string;
    full_name?: string;
    timezone?: string;
    is_active?: boolean;
}

export interface JwtPayload {
    id: string;
    email: string;
    organization_id: string | null;
    isSuperAdmin: boolean;
    roles: string[];
    iat?: number;
    exp?: number;
}

export interface RoleAssignment {
    id: string;
    user_id: string;
    role: string;
    org_id: string | null;
    event_id: string | null;
    dept_id: string | null;
    service_id: string | null;
}

export type RoleType =
    | 'SUPER_ADMIN'
    | 'ORG_ADMIN'
    | 'EVENT_MANAGER'
    | 'DEPT_HEAD'
    | 'SERVICE_SUPERVISOR'
    | 'TECHNICIAN'
    | 'VIEWER';
