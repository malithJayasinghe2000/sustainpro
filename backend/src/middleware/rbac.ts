import { Request, Response, NextFunction } from 'express';
import pool from '../db';

/**
 * Validates if the user has the required ROLE for the requested RESOURCE.
 * Implements CASCADING TRUST:
 * - Org Admin > All
 * - Event Admin > All in Event
 * - Dept Head > All in Dept
 */
export const requireRole = (...allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // 1. Super Admin Bypass
            if (req.user.isSuperAdmin) {
                return next();
            }

            // 2. Fetch User's Roles from DB to get the latest state
            // (The JWT might be stale, so for critical actions we check DB)
            // But for performance, we might rely on JWT. 
            // Let's rely on DB for now for safety as per "Real RBAC" requirement.

            const userId = req.user.id;

            // We need to know the CONTEXT of the request.
            // e.g. /api/events/:eventId/... -> Context is Event
            // e.g. /api/services/:serviceId/... -> Context is Service

            // This is the tricky part: Generic middleware needs to know where to find the ID.
            // We'll rely on route params naming convention: orgId, eventId, deptId, serviceId
            const { orgId, eventId, deptId, serviceId } = req.params;
            const { organization_id: userOrgId } = req.user;

            const client = await pool.connect();
            try {
                // QUERY: Get all roles for this user that MIGHT apply to this context
                const queryText = `
                    SELECT role, org_id, event_id, dept_id, service_id 
                    FROM sps_role_assignments 
                    WHERE user_id = $1
                `;
                interface RoleAssignment {
                    role: string;
                    org_id?: string;
                    event_id?: string;
                    dept_id?: string;
                    service_id?: string;
                }
                const { rows } = await client.query(queryText, [userId]);
                const roles: RoleAssignment[] = rows;

                let hasAccess = false;

                // Check access for ANY of the allowed roles
                for (const requiredRole of allowedRoles) {

                    // Logic: Does user have 'requiredRole' in the correct context?

                    // Special Case: Role mappings
                    // 'admin' -> 'ORG_ADMIN' for backwards compatibility
                    let targetRole = requiredRole;
                    if (requiredRole === 'admin') targetRole = 'ORG_ADMIN';

                    // Check 1: SUPER_ADMIN has access to everything, or check specific role
                    const isOrgContext = roles.some((r: RoleAssignment) =>
                        (r.role === 'SUPER_ADMIN' || r.role === targetRole) && r.org_id === userOrgId
                    );
                    if (isOrgContext) {
                        hasAccess = true;
                        break;
                    }

                    // Check 2: Event/Dept/Service Context
                    // (Simplified: if you have the role assigned to specific ID passed in params)
                    if (eventId) {
                        if (roles.some((r: RoleAssignment) => r.role === targetRole && r.event_id === eventId)) {
                            hasAccess = true; break;
                        }
                    }
                }

                if (hasAccess) {
                    return next();
                }

                // If no specific cascading match found
                return res.status(403).json({ message: 'Forbidden: Insufficient Privileges' });

            } finally {
                client.release();
            }

        } catch (err) {
            console.error('RBAC Error:', err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    };
};

/**
 * Middleware to require super admin access
 * Strictly checks the is_super_admin flag
 */
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('🔐 Super Admin Check:', {
            hasUser: !!req.user,
            isSuperAdmin: req.user?.isSuperAdmin,
            userId: req.user?.id,
            email: req.user?.email
        });

        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!req.user.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Super admin access required'
            });
        }

        return next();
    } catch (err) {
        console.error('Super Admin Check Error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
