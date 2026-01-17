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
                        timezone: true,
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
            // Use org timezone if user doesn't have their own
            timezone: user.timezone || user.sps_organizations?.timezone || 'UTC',
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
                        timezone: true,
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
            // Use org timezone if user doesn't have their own
            timezone: user.timezone || user.sps_organizations?.timezone || 'UTC',
        } as any as User;
    }

    /**
     * Get all users (with optional org filter)
     */
    /**
     * Get all users (with optional org filter and pagination)
     */
    async findAll(params: {
        organizationId?: string;
        skip?: number;
        take?: number;
        search?: string;
        role?: string;
    }): Promise<{ users: User[], total: number }> {
        const { organizationId, skip, take, search, role } = params;

        const where: any = {};

        if (organizationId) {
            where.organization_id = organizationId;
        }

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { full_name: { contains: search, mode: 'insensitive' } },
                { id: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (role && role !== 'ALL') {
            where.sps_role_assignments = {
                some: { role: role }
            };
        }

        const [users, total] = await Promise.all([
            prisma.sps_users.findMany({
                where,
                include: {
                    sps_organizations: {
                        select: {
                            name: true,
                        },
                    },
                    sps_role_assignments: {
                        select: {
                            role: true,
                            org_id: true,
                            event_id: true,
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                skip,
                take,
            }),
            prisma.sps_users.count({ where })
        ]);

        // Fetch all role definitions for display name mapping
        // With fallback to static mapping if sps_roles table not available
        let roleDisplayNames = new Map<string, string>();
        try {
            const allRoles = await (prisma as any).sps_roles?.findMany?.({
                where: { is_active: true },
            });
            if (allRoles && allRoles.length > 0) {
                roleDisplayNames = new Map(allRoles.map((r: { code: string; name: string }) => [r.code, r.name]));
            }
        } catch (error) {
            // Fallback: Use static role names if sps_roles table doesn't exist or Prisma not regenerated
            console.warn('sps_roles table not available, using static role names');
        }

        // Fallback static role names
        const staticRoleNames: Record<string, string> = {
            'SUPER_ADMIN': 'Super Admin',
            'ORG_ADMIN': 'Organization Admin',
            'EVENT_MANAGER': 'Event Manager',
            'DEPT_HEAD': 'Department Head',
            'SERVICE_SUPERVISOR': 'Service Supervisor',
            'TECHNICIAN': 'Onsite Technician',
            'SERVICE_SUPPLIER': 'Service Supplier',
            'VIEWER': 'Organizer Viewer',
        };

        const mappedUsers = users.map((user: any) => {
            const { password_hash, ...userWithoutPassword } = user;
            // Map role assignments to the format expected by frontend
            const roles = (user.sps_role_assignments || []).map((ra: any) => ({
                role: ra.role,
                org_id: ra.org_id,
                event_id: ra.event_id,
            }));
            // Get the primary role (first role assignment)
            const primaryRoleCode = user.sps_role_assignments?.[0]?.role;
            return {
                ...userWithoutPassword,
                org_name: user.sps_organizations?.name,
                roles, // Array of role assignments for frontend
                role_code: primaryRoleCode || null,
                role_name: primaryRoleCode ? (roleDisplayNames.get(primaryRoleCode) || staticRoleNames[primaryRoleCode] || primaryRoleCode) : null,
            } as User;
        });

        return { users: mappedUsers, total };
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
        force_password_change?: boolean;
    }): Promise<User> {
        const user = await prisma.sps_users.create({
            data: {
                email: data.email,
                password_hash: data.password_hash,
                full_name: data.full_name,
                organization_id: data.organization_id,
                timezone: data.timezone || 'UTC',
                code: data.code,
                force_password_change: data.force_password_change ?? false,
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
     * Assign role to user (replaces any existing role assignments)
     */
    async assignRole(
        userId: string,
        role: string,
        context: { org_id?: string; event_id?: string; dept_id?: string; service_id?: string }
    ): Promise<RoleAssignment> {
        // First, remove all existing role assignments for this user
        await prisma.sps_role_assignments.deleteMany({
            where: { user_id: userId }
        });

        // Then create the new role assignment
        return await prisma.sps_role_assignments.create({
            data: {
                user_id: userId,
                role,
                org_id: context.org_id || null,
                event_id: context.event_id || null,
                dept_id: context.dept_id || null,
                service_id: context.service_id || null,
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

    /**
     * Find user by email for auth (includes password)
     */
    async findByEmailForAuth(email: string): Promise<UserWithPassword | null> {
        return this.findByEmail(email);
    }

    /**
     * Update user password (also clears force_password_change flag)
     */
    async updatePassword(userId: string, passwordHash: string): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                password_hash: passwordHash,
                password_changed_at: new Date(),
                force_password_change: false, // Clear the flag after password change
                updated_at: new Date(),
            },
        });
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin(userId: string): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                last_login: new Date(),
            },
        });
    }

    /**
     * Update email verification status
     */
    async updateEmailVerified(userId: string, verified: boolean): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                email_verified: verified,
                email_verified_at: verified ? new Date() : null,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Update 2FA status
     */
    async update2FAStatus(userId: string, enabled: boolean): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                two_factor_enabled: enabled,
                two_factor_verified_at: enabled ? new Date() : null,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Store 2FA secret for TOTP
     */
    async store2FASecret(userId: string, secret: string): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                two_factor_secret: secret,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Store 2FA backup codes
     */
    async store2FABackupCodes(userId: string, backupCodes: string[]): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                two_factor_backup_codes: JSON.stringify(backupCodes),
                updated_at: new Date(),
            },
        });
    }

    /**
     * Set force password change flag
     */
    async setForcePasswordChange(userId: string, force: boolean): Promise<void> {
        await prisma.sps_users.update({
            where: { id: userId },
            data: {
                force_password_change: force,
                updated_at: new Date(),
            },
        });
    }
}
