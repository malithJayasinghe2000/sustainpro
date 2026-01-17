/**
 * usePermissions Hook
 * Best Practice: Centralized permission checking for React components
 * 
 * Usage:
 *   const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();
 *   
 *   if (hasPermission('users.manage')) { ... }
 *   if (hasAnyPermission(['devices.view', 'devices.manage'])) { ... }
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { rbacApi } from '@/lib/api';

// Permission codes - keep in sync with backend seed.ts
export const PERMISSIONS = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard.view',
    
    // Devices
    DEVICES_VIEW: 'devices.view',
    DEVICES_MANAGE: 'devices.manage',
    
    // Events
    EVENTS_VIEW: 'events.view',
    EVENTS_MANAGE: 'events.manage',
    
    // Users
    USERS_VIEW: 'users.view',
    USERS_MANAGE: 'users.manage',
    
    // Reports
    REPORTS_VIEW: 'reports.view',
    
    // Settings
    SETTINGS_MANAGE: 'settings.manage',
    
    // Telemetry
    TELEMETRY_VIEW: 'telemetry.view',
    
    // Alerts
    ALERTS_MANAGE: 'alerts.manage',
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

interface UsePermissionsReturn {
    permissions: string[];
    loading: boolean;
    error: string | null;
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    hasAllPermissions: (permissions: string[]) => boolean;
    refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
    const { user, isLoading: authLoading } = useAuth();
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPermissions = useCallback(async () => {
        if (!user) {
            setPermissions([]);
            setLoading(false);
            return;
        }

        // Super admin has all permissions
        if (user.is_super_admin) {
            setPermissions(Object.values(PERMISSIONS));
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const perms = await rbacApi.getMyPermissions();
            setPermissions(perms);
        } catch (err: any) {
            console.error('Failed to fetch permissions:', err);
            setError(err.message || 'Failed to fetch permissions');
            // Fallback to permissions from user object if available
            if (user.permissions) {
                setPermissions(user.permissions);
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading) {
            fetchPermissions();
        }
    }, [authLoading, fetchPermissions]);

    const hasPermission = useCallback((permission: string): boolean => {
        // Super admin has all permissions
        if (user?.is_super_admin) return true;
        return permissions.includes(permission);
    }, [permissions, user]);

    const hasAnyPermission = useCallback((perms: string[]): boolean => {
        if (user?.is_super_admin) return true;
        return perms.some(p => permissions.includes(p));
    }, [permissions, user]);

    const hasAllPermissions = useCallback((perms: string[]): boolean => {
        if (user?.is_super_admin) return true;
        return perms.every(p => permissions.includes(p));
    }, [permissions, user]);

    return useMemo(() => ({
        permissions,
        loading: loading || authLoading,
        error,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refetch: fetchPermissions,
    }), [permissions, loading, authLoading, error, hasPermission, hasAnyPermission, hasAllPermissions, fetchPermissions]);
}

/**
 * Permission Guard Component
 * Conditionally renders children based on permission
 * 
 * Usage:
 *   <PermissionGuard permission="users.manage">
 *     <DeleteUserButton />
 *   </PermissionGuard>
 */
interface PermissionGuardProps {
    permission?: string;
    anyOf?: string[];
    allOf?: string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function PermissionGuard({
    permission,
    anyOf,
    allOf,
    children,
    fallback = null,
}: PermissionGuardProps) {
    const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

    if (loading) {
        return null; // Or a loading spinner
    }

    let allowed = false;

    if (permission) {
        allowed = hasPermission(permission);
    } else if (anyOf && anyOf.length > 0) {
        allowed = hasAnyPermission(anyOf);
    } else if (allOf && allOf.length > 0) {
        allowed = hasAllPermissions(allOf);
    }

    return allowed ? <>{children}</> : <>{fallback}</>;
}

export default usePermissions;
