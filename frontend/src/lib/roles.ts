/**
 * Role Constants and Helpers
 * 
 * NOTE: This file contains static role definitions used as a fallback
 * when the roles API is not available (e.g., during initial page load).
 * 
 * For dynamic role data (names, icons, colors), use the rolesApi from '@/lib/api'.
 * The primary source of truth is the sps_roles database table.
 */

export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN', // Virtual role for is_super_admin=true
    ORG_ADMIN: 'ORG_ADMIN',
    EVENT_MANAGER: 'EVENT_MANAGER',
    DEPT_HEAD: 'DEPT_HEAD',
    SERVICE_SUPERVISOR: 'SERVICE_SUPERVISOR',
    TECHNICIAN: 'TECHNICIAN',
    SERVICE_SUPPLIER: 'SERVICE_SUPPLIER',
    VIEWER: 'VIEWER'
} as const;

export type RoleKey = typeof ROLES[keyof typeof ROLES];

// Fallback labels when API is not available
// The primary source of truth is sps_roles.name in the database
export const ROLE_LABELS: Record<string, string> = {
    [ROLES.SUPER_ADMIN]: 'Super Admin',
    [ROLES.ORG_ADMIN]: 'Organization Admin',
    [ROLES.EVENT_MANAGER]: 'Event Manager',
    [ROLES.DEPT_HEAD]: 'Department Head',
    [ROLES.SERVICE_SUPERVISOR]: 'Service Supervisor',
    [ROLES.TECHNICIAN]: 'Onsite Technician',
    [ROLES.SERVICE_SUPPLIER]: 'Service Supplier',
    [ROLES.VIEWER]: 'Organizer Viewer'
};

// Role hierarchy levels (lower number = higher rank)
// This matches the 'level' field in sps_roles table
export const ROLE_LEVELS: Record<string, number> = {
    [ROLES.SUPER_ADMIN]: 0,
    [ROLES.ORG_ADMIN]: 1,
    [ROLES.EVENT_MANAGER]: 2,
    [ROLES.DEPT_HEAD]: 3,
    [ROLES.SERVICE_SUPERVISOR]: 4,
    [ROLES.TECHNICIAN]: 5,
    [ROLES.SERVICE_SUPPLIER]: 5,
    [ROLES.VIEWER]: 6
};

export const getRoleLabel = (role: string, isSuperAdmin: boolean = false): string => {
    if (isSuperAdmin) return ROLE_LABELS[ROLES.SUPER_ADMIN];
    return ROLE_LABELS[role] || role;
};

export const getRoleLevel = (role: string): number => {
    return ROLE_LEVELS[role] ?? 99;
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

// Check if user has at least the given role level (hierarchy check)
export const hasRoleLevel = (user: any, maxLevel: number): boolean => {
    if (!user) return false;
    if (user.is_super_admin) return true;

    const userRoles = user.roles || [];
    return userRoles.some((r: any) => getRoleLevel(r.role) <= maxLevel);
};

// Start strict RBAC: Admin check includes Super Admin OR Org Admin
export const isAdmin = (user: any): boolean => {
    return hasRole(user, ROLES.ORG_ADMIN);
};

// Check if user can manage another role (hierarchy-based)
export const canManageRole = (user: any, targetRole: string): boolean => {
    if (!user) return false;
    if (user.is_super_admin) return true;

    const userRoles = user.roles || [];
    const userHighestLevel = Math.min(...userRoles.map((r: any) => getRoleLevel(r.role)));
    const targetLevel = getRoleLevel(targetRole);

    // Can manage roles at same level or below
    return userHighestLevel <= targetLevel;
};
