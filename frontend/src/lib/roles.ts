export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN', // Virtual role for is_super_admin=true
    ORG_ADMIN: 'ORG_ADMIN',
    EVENT_MANAGER: 'EVENT_MANAGER',
    DEPT_HEAD: 'DEPT_HEAD',
    SERVICE_SUPERVISOR: 'SERVICE_SUPERVISOR',
    TECHNICIAN: 'TECHNICIAN',
    VIEWER: 'VIEWER'
} as const;

export type RoleKey = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
    [ROLES.SUPER_ADMIN]: 'Platform Super Admin',
    [ROLES.ORG_ADMIN]: 'Organization Admin',
    [ROLES.EVENT_MANAGER]: 'Organization Event Manager',
    [ROLES.DEPT_HEAD]: 'Organization Department Head',
    [ROLES.SERVICE_SUPERVISOR]: 'Organization Service Supervisor',
    [ROLES.TECHNICIAN]: 'Organization Onsite Technician',
    [ROLES.VIEWER]: 'Organization Viewer (Read-only)'
};

export const getRoleLabel = (role: string, isSuperAdmin: boolean = false): string => {
    if (isSuperAdmin) return ROLE_LABELS[ROLES.SUPER_ADMIN];
    return ROLE_LABELS[role] || role;
};

// Helper to check if user has a specific role (or is Super Admin)
export const hasRole = (user: any, requiredRole: string | string[]): boolean => {
    if (!user) return false;
    if (user.is_super_admin) return true;

    if (Array.isArray(requiredRole)) {
        return user.roles?.some((r: any) => requiredRole.includes(r.role)) ?? false;
    }
    return user.roles?.some((r: any) => r.role === requiredRole) ?? false;
};

// Start strict RBAC: Admin check includes Super Admin OR Org Admin
export const isAdmin = (user: any): boolean => {
    return hasRole(user, ROLES.ORG_ADMIN);
};
