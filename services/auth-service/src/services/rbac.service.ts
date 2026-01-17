/**
 * RBAC Service
 * Handles role and permission management with proper business logic
 */

import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger, NotFoundError, BadRequestError } from '@sustainpro/shared-utils';
import { clearPermissionCache, publishPermissionCacheInvalidation } from '@sustainpro/shared-middleware';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'auth-service' });

export interface Permission {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: string | null;
}

export interface RolePermissionMapping {
    [role: string]: string[];
}

export class RBACService {
    /**
     * Get all permissions
     */
    async getAllPermissions(): Promise<Permission[]> {
        const permissions = await prisma.sps_permissions.findMany({
            orderBy: [
                { category: 'asc' },
                { code: 'asc' }
            ],
        });

        return permissions.map(p => ({
            id: p.id,
            code: p.code,
            name: p.name,
            description: p.description,
            category: p.category,
        }));
    }

    /**
     * Get role-permission mappings
     * Returns: { 'ORG_ADMIN': ['events.view', 'events.manage', ...], ... }
     */
    async getRolePermissionMappings(): Promise<RolePermissionMapping> {
        const mappings = await prisma.sps_role_permissions.findMany({
            include: {
                sps_permissions: {
                    select: { code: true }
                }
            }
        });

        // Group by role
        const result: RolePermissionMapping = {};
        for (const mapping of mappings) {
            if (!result[mapping.role]) {
                result[mapping.role] = [];
            }
            result[mapping.role].push(mapping.sps_permissions.code);
        }

        return result;
    }

    /**
     * Update permissions for a role
     * This replaces all existing permissions with the new set
     */
    async updateRolePermissions(role: string, permissionCodes: string[]): Promise<void> {
        // Validate role exists using dynamic access (sps_roles not typed in Prisma)
        const rolesTable = (prisma as any).sps_roles;
        const roleExists = await rolesTable.findUnique({
            where: { code: role }
        });

        if (!roleExists) {
            throw new BadRequestError(`Role not found: ${role}`);
        }

        // Get permission IDs for the codes
        const permissions = await prisma.sps_permissions.findMany({
            where: { code: { in: permissionCodes } },
            select: { id: true, code: true }
        });

        const validPermissionIds = permissions.map(p => p.id);
        const validPermissionCodes = permissions.map(p => p.code);

        // Log if some permissions were not found
        const invalidCodes = permissionCodes.filter(c => !validPermissionCodes.includes(c));
        if (invalidCodes.length > 0) {
            logger.warn('Some permission codes not found', { role, invalidCodes });
        }

        // Use transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
            // Delete existing permissions for this role
            await tx.sps_role_permissions.deleteMany({
                where: { role }
            });

            // Insert new permissions
            if (validPermissionIds.length > 0) {
                await tx.sps_role_permissions.createMany({
                    data: validPermissionIds.map(permissionId => ({
                        role,
                        permission_id: permissionId,
                    })),
                    skipDuplicates: true,
                });
            }
        });

        // Clear permission cache for all users with this role
        const usersWithRole = await prisma.sps_role_assignments.findMany({
            where: { role },
            select: { user_id: true }
        });

        for (const assignment of usersWithRole) {
            clearPermissionCache(assignment.user_id);
        }

        // Publish distributed cache invalidation event
        await publishPermissionCacheInvalidation('role_updated', { roleCode: role });

        logger.info('Role permissions updated', { role, permissionCount: validPermissionIds.length });
    }

    /**
     * Get permissions for a specific user
     * This is used for debugging/admin purposes
     */
    async getUserPermissions(userId: string): Promise<string[]> {
        const result = await prisma.$queryRaw<{ code: string }[]>`
            SELECT DISTINCT p.code
            FROM sps_permissions p
            INNER JOIN sps_role_permissions rp ON p.id = rp.permission_id
            INNER JOIN sps_role_assignments ra ON rp.role = ra.role
            WHERE ra.user_id = ${userId}::uuid
        `;

        return result.map(r => r.code);
    }

    /**
     * Check if a user has a specific permission
     */
    async userHasPermission(userId: string, permissionCode: string): Promise<boolean> {
        const result = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) as count
            FROM sps_permissions p
            INNER JOIN sps_role_permissions rp ON p.id = rp.permission_id
            INNER JOIN sps_role_assignments ra ON rp.role = ra.role
            WHERE ra.user_id = ${userId}::uuid
            AND p.code = ${permissionCode}
        `;

        return Number(result[0]?.count || 0) > 0;
    }

    /**
     * Get all permissions grouped by category (for UI display)
     */
    async getPermissionsGroupedByCategory(): Promise<Record<string, Permission[]>> {
        const permissions = await this.getAllPermissions();
        
        const grouped: Record<string, Permission[]> = {};
        for (const perm of permissions) {
            const category = perm.category || 'other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(perm);
        }

        return grouped;
    }
}

// Export singleton instance
export const rbacService = new RBACService();
