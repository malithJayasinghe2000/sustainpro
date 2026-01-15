import { Router, Request, Response, NextFunction } from 'express';
import { RoleRepository } from '../repositories/role.repository';
import { UserRepository } from '../repositories/user.repository';
import { authenticateToken } from '@sustainpro/shared-middleware';
import { createLogger, BadRequestError } from '@sustainpro/shared-utils';

const router = Router();
const roleRepo = new RoleRepository();
const userRepo = new UserRepository();
const logger = createLogger({ service: 'auth-service' });

// Fallback static roles when sps_roles table is not available
const FALLBACK_ROLES = [
    { id: '1', code: 'SUPER_ADMIN', name: 'Super Admin', description: 'Platform administrator with full access', level: 0, icon: 'ShieldAlert', color: '#EF4444', is_system: true, is_active: true },
    { id: '2', code: 'ORG_ADMIN', name: 'Organization Admin', description: 'Full control over a specific organization', level: 1, icon: 'Building2', color: '#8B5CF6', is_system: true, is_active: true },
    { id: '3', code: 'EVENT_MANAGER', name: 'Event Manager', description: 'Manages events, departments, and services', level: 2, icon: 'Calendar', color: '#3B82F6', is_system: true, is_active: true },
    { id: '4', code: 'DEPT_HEAD', name: 'Department Head', description: 'Oversees a specific department', level: 3, icon: 'Users', color: '#14B8A6', is_system: true, is_active: true },
    { id: '5', code: 'SERVICE_SUPERVISOR', name: 'Service Supervisor', description: 'Manages service deployments and technicians', level: 4, icon: 'Activity', color: '#F97316', is_system: true, is_active: true },
    { id: '6', code: 'TECHNICIAN', name: 'Onsite Technician', description: 'Ground-level access to manage devices', level: 5, icon: 'Settings', color: '#A855F7', is_system: true, is_active: true },
    { id: '7', code: 'SERVICE_SUPPLIER', name: 'Service Supplier', description: 'External supplier with limited access', level: 5, icon: 'Truck', color: '#06B6D4', is_system: true, is_active: true },
    { id: '8', code: 'VIEWER', name: 'Organizer Viewer', description: 'Read-only access to dashboards and reports', level: 6, icon: 'Eye', color: '#6B7280', is_system: true, is_active: true },
];

/**
 * @swagger
 * /api/v1/auth/roles:
 *   get:
 *     summary: Get all available roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignable
 *         schema:
 *           type: boolean
 *         description: If true, only returns roles the current user can assign
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const assignableOnly = req.query.assignable === 'true';
        const user = (req as any).user;

        let roles: any[] = [];

        try {
            if (assignableOnly && !user.isSuperAdmin) {
                // Get current user's roles to determine their highest level
                const userRoles = await userRepo.getUserRoles(user.id);

                if (userRoles.length === 0) {
                    roles = [];
                } else {
                    // Get role levels for user's roles
                    const userRoleCodes = userRoles.map(r => r.role);
                    const userRoleDetails = await roleRepo.findByCodes(userRoleCodes);

                    // Find highest level (lowest number = highest rank)
                    const highestLevel = Math.min(...userRoleDetails.map(r => r.level));

                    // Get assignable roles (same level or below in hierarchy)
                    roles = await roleRepo.getAssignableRoles(highestLevel);
                }
            } else if (user.isSuperAdmin) {
                // Super admins can assign any role
                roles = await roleRepo.findAll();
            } else {
                // Get all active roles
                roles = await roleRepo.findAll();
            }
        } catch (dbError) {
            // Fallback to static roles if database query fails
            logger.warn('Failed to fetch roles from database, using fallback', { error: dbError });
            roles = FALLBACK_ROLES.filter(r => r.code !== 'SUPER_ADMIN');
        }

        res.json({
            success: true,
            data: roles,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/v1/auth/roles/{code}:
 *   get:
 *     summary: Get role by code
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Role code (e.g., ORG_ADMIN)
 *     responses:
 *       200:
 *         description: Role details
 *       404:
 *         description: Role not found
 */
router.get('/:code', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.params;
        const role = await roleRepo.findByCode(code);

        if (!role) {
            throw new BadRequestError(`Role not found: ${code}`);
        }

        res.json({
            success: true,
            data: role,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
