/**
 * Role Service
 * Handles role management with proper business logic
 * 
 * NOTE: Roles are defined in the seed file (packages/shared-database/prisma/seed.ts)
 * This service only provides read access and display property updates.
 */

import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger, NotFoundError } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'auth-service' });

// Access sps_roles dynamically since it might not be typed
const rolesTable = () => (prisma as any).sps_roles;

export interface Role {
    id: string;
    code: string;
    name: string;
    description: string | null;
    level: number;
    icon: string | null;
    color: string | null;
    is_system: boolean;
    is_active: boolean;
    created_at: Date | null;
    updated_at: Date | null;
}

export interface UpdateRoleDto {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
}

export class RoleService {
    /**
     * Get all active roles
     */
    async getAll(includeInactive: boolean = false): Promise<Role[]> {
        const roles = await rolesTable().findMany({
            where: includeInactive ? {} : { is_active: true },
            orderBy: { level: 'asc' },
        });

        return roles as Role[];
    }

    /**
     * Get role by code
     */
    async getByCode(code: string): Promise<Role | null> {
        const role = await rolesTable().findUnique({
            where: { code },
        });

        return role as Role | null;
    }

    /**
     * Get role by ID
     */
    async getById(id: string): Promise<Role | null> {
        const role = await rolesTable().findUnique({
            where: { id },
        });

        return role as Role | null;
    }

    /**
     * Get roles by codes
     */
    async getByCodes(codes: string[]): Promise<Role[]> {
        const roles = await rolesTable().findMany({
            where: { code: { in: codes } },
            orderBy: { level: 'asc' },
        });

        return roles as Role[];
    }

    /**
     * Get assignable roles for a user based on their highest role level
     * Users can only assign roles at their level or below
     */
    async getAssignableRoles(userHighestLevel: number): Promise<Role[]> {
        const roles = await rolesTable().findMany({
            where: {
                is_active: true,
                level: { gte: userHighestLevel },
            },
            orderBy: { level: 'asc' },
        });

        return roles as Role[];
    }

    /**
     * Update a role's display properties
     * Only name, description, icon, and color can be updated
     */
    async update(id: string, data: UpdateRoleDto): Promise<Role> {
        const existing = await this.getById(id);
        if (!existing) {
            throw new NotFoundError('Role', id);
        }

        const role = await rolesTable().update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                icon: data.icon,
                color: data.color,
                updated_at: new Date(),
            },
        });

        logger.info('Role display properties updated', { roleId: id });

        return role as Role;
    }

    /**
     * Get user's role codes
     */
    async getUserRoleCodes(userId: string): Promise<string[]> {
        const assignments = await prisma.sps_role_assignments.findMany({
            where: { user_id: userId },
            select: { role: true },
        });

        return assignments.map(a => a.role);
    }

    /**
     * Get user's highest role level (lowest number = highest authority)
     */
    async getUserHighestLevel(userId: string): Promise<number> {
        const roleCodes = await this.getUserRoleCodes(userId);
        if (roleCodes.length === 0) {
            return 99; // No roles = lowest level
        }

        const roles = await this.getByCodes(roleCodes);
        if (roles.length === 0) {
            return 99;
        }

        return Math.min(...roles.map(r => r.level));
    }
}

// Export singleton instance
export const roleService = new RoleService();
