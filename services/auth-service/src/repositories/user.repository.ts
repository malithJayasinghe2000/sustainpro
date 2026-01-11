import { getPrismaClient } from '@sustainpro/shared-database';
import { User, UserWithPassword, RoleAssignment } from '@sustainpro/shared-types';

const prisma = getPrismaClient();

export class UserRepository {
    /**
     * Find user by email (includes password hash for auth)
     */
    async findByEmail(email: string): Promise<UserWithPassword | null> {
        const user = await prisma.sps_users.findUnique({
            where: { email },
            include: {
                sps_organizations: {
                    select: {
                        name: true,
                        logo_url: true,
                        theme_config: true,
                    },
                },
            },
        });

        if (!user) return null;

        return {
            ...user,
            org_name: user.sps_organizations?.name,
            logo_url: user.sps_organizations?.logo_url,
            theme_config: user.sps_organizations?.theme_config,
        } as any as UserWithPassword;
    }

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
        const user = await prisma.sps_users.findUnique({
            where: { id },
            include: {
                sps_organizations: {
                    select: {
                        name: true,
                        logo_url: true,
                        theme_config: true,
                    },
                },
            },
        });

        if (!user) return null;

        const { password_hash, ...userWithoutPassword } = user;
        return {
            ...userWithoutPassword,
            org_name: user.sps_organizations?.name,
            logo_url: user.sps_organizations?.logo_url,
            theme_config: user.sps_organizations?.theme_config,
        } as any as User;
    }

    /**
     * Get all users (with optional org filter)
     */
    async findAll(organizationId?: string): Promise<User[]> {
        const users = await prisma.sps_users.findMany({
            where: organizationId ? { organization_id: organizationId } : undefined,
            include: {
                sps_organizations: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        return users.map((user: any) => {
            const { password_hash, ...userWithoutPassword } = user;
            return {
                ...userWithoutPassword,
                org_name: user.sps_organizations?.name,
            } as User;
        });
    }

    /**
     * Create a new user
     */
    async create(data: {
        email: string;
        password_hash: string;
        full_name: string;
        organization_id?: string;
        timezone?: string;
        code?: string;
    }): Promise<User> {
        const user = await prisma.sps_users.create({
            data: {
                email: data.email,
                password_hash: data.password_hash,
                full_name: data.full_name,
                organization_id: data.organization_id,
                timezone: data.timezone || 'UTC',
                code: data.code,
            },
        });

        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword as any as User;
    }

    /**
     * Update user
     */
    async update(id: string, data: Partial<User>): Promise<User | null> {
        const updateData: any = {};

        if (data.email !== undefined) updateData.email = data.email;
        if (data.full_name !== undefined) updateData.full_name = data.full_name;
        if (data.timezone !== undefined) updateData.timezone = data.timezone;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;

        if (Object.keys(updateData).length === 0) return this.findById(id);

        const user = await prisma.sps_users.update({
            where: { id },
            data: updateData,
        });

        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword as any as User;
    }

    /**
     * Delete user
     */
    async delete(id: string): Promise<boolean> {
        try {
            await prisma.sps_users.delete({ where: { id } });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get user roles
     */
    async getUserRoles(userId: string): Promise<RoleAssignment[]> {
        return await prisma.sps_role_assignments.findMany({
            where: { user_id: userId },
        }) as any as RoleAssignment[];
    }

    /**
     * Get user permissions (via role mappings)
     */
    async getUserPermissions(userId: string): Promise<string[]> {
        // Use raw SQL since role_assignments and role_permissions are connected via role string
        const result = await prisma.$queryRaw<Array<{ code: string }>>`
            SELECT DISTINCT p.code
            FROM sps_role_assignments ra
            JOIN sps_role_permissions rp ON ra.role = rp.role
            JOIN sps_permissions p ON rp.permission_id = p.id
            WHERE ra.user_id = ${userId}::uuid
        `;

        return result.map((r: { code: string }) => r.code);
    }

    /**
     * Increment failed login attempts
     */
    async incrementFailedAttempts(userId: string, lockUntil?: Date): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                failed_login_attempts: { increment: 1 },
                account_locked_until: lockUntil,
            },
        });
    }

    /**
     * Reset failed login attempts
     */
    async resetFailedAttempts(userId: string): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                failed_login_attempts: 0,
                account_locked_until: null,
                last_login: new Date(),
            },
        });
    }

    /**
     * Update user password
     */
    async updatePassword(userId: string, passwordHash: string): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                password_hash: passwordHash,
            },
        });
    }

    /**
     * Assign role to user
     */
    async assignRole(
        userId: string,
        role: string,
        context: { org_id?: string; event_id?: string; dept_id?: string; service_id?: string }
    ): Promise<RoleAssignment> {
        return await prisma.sps_role_assignments.create({
            data: {
                user_id: userId,
                role,
                org_id: context.org_id,
                event_id: context.event_id,
                dept_id: context.dept_id,
                service_id: context.service_id,
            },
        }) as any as RoleAssignment;
    }

    /**
     * Remove role from user
     */
    async removeRole(assignmentId: string): Promise<boolean> {
        try {
            await prisma.sps_role_assignments.delete({ where: { id: assignmentId } });
            return true;
        } catch (error) {
            return false;
        }
    }
}
