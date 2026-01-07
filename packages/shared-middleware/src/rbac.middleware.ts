/**
 * Role-Based Access Control (RBAC) Middleware
 */
import { Request, Response, NextFunction } from 'express';
import { RoleType } from '@sustainpro/shared-types';
import { ForbiddenError } from '@sustainpro/shared-utils';

/**
 * Role hierarchy - higher roles include lower role permissions
 */
const ROLE_HIERARCHY: Record<RoleType, number> = {
    SUPER_ADMIN: 100,
    ORG_ADMIN: 80,
    EVENT_MANAGER: 60,
    DEPT_HEAD: 40,
    SERVICE_SUPERVISOR: 30,
    TECHNICIAN: 20,
    VIEWER: 10,
};

/**
 * Check if user has required role or higher
 */
export const requireRole = (...allowedRoles: RoleType[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user;

        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }

        // Super admin bypasses all checks
        if (user.isSuperAdmin) {
            next();
            return;
        }

        // Check if user has any of the allowed roles
        const hasRole = user.roles?.some(userRole =>
            allowedRoles.includes(userRole as RoleType)
        );

        if (!hasRole) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                required: allowedRoles,
            });
            return;
        }

        next();
    };
};

/**
 * Check if user has minimum role level
 */
export const requireMinRole = (minRole: RoleType) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user;

        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }

        // Super admin bypasses all checks
        if (user.isSuperAdmin) {
            next();
            return;
        }

        const minLevel = ROLE_HIERARCHY[minRole];

        const hasMinLevel = user.roles?.some(userRole => {
            const roleLevel = ROLE_HIERARCHY[userRole as RoleType];
            return roleLevel !== undefined && roleLevel >= minLevel;
        });

        if (!hasMinLevel) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                minimumRequired: minRole,
            });
            return;
        }

        next();
    };
};

/**
 * Check if user is super admin
 */
export const requireSuperAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const user = req.user;

    if (!user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
        return;
    }

    if (!user.isSuperAdmin) {
        res.status(403).json({
            success: false,
            error: 'Super Admin access required',
        });
        return;
    }

    next();
};

/**
 * Check if user belongs to organization (or is super admin)
 */
export const requireOrgAccess = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const user = req.user;
    const orgId = req.params.organizationId || req.params.orgId || req.body.organization_id;

    if (!user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
        return;
    }

    // Super admin can access any org
    if (user.isSuperAdmin) {
        next();
        return;
    }

    // User must belong to the organization
    if (user.organization_id !== orgId) {
        res.status(403).json({
            success: false,
            error: 'Access denied to this organization',
        });
        return;
    }

    next();
};
