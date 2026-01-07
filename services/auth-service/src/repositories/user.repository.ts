import { query } from '../db';
import { User, UserWithPassword, RoleAssignment } from '@sustainpro/shared-types';

export class UserRepository {
    /**
     * Find user by email (includes password hash for auth)
     */
    async findByEmail(email: string): Promise<UserWithPassword | null> {
        const result = await query<UserWithPassword>(
            `SELECT u.*, o.name as org_name, o.logo_url, o.theme_config
       FROM sps_users u
       LEFT JOIN sps_organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
            [email]
        );
        return result.rows[0] || null;
    }

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
        const result = await query<User>(
            `SELECT u.id, u.email, u.full_name, u.code, u.organization_id, 
              u.is_super_admin, u.is_active, u.timezone, u.created_at, u.updated_at,
              o.name as org_name, o.logo_url, o.theme_config
       FROM sps_users u
       LEFT JOIN sps_organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get all users (with optional org filter)
     */
    async findAll(organizationId?: string): Promise<User[]> {
        let sql = `
      SELECT u.id, u.email, u.full_name, u.code, u.organization_id, 
             u.is_super_admin, u.is_active, u.timezone, u.created_at,
             o.name as org_name
      FROM sps_users u
      LEFT JOIN sps_organizations o ON u.organization_id = o.id
    `;
        const params: any[] = [];

        if (organizationId) {
            sql += ` WHERE u.organization_id = $1`;
            params.push(organizationId);
        }

        sql += ` ORDER BY u.created_at DESC`;

        const result = await query<User>(sql, params);
        return result.rows;
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
        const result = await query<User>(
            `INSERT INTO sps_users (email, password_hash, full_name, organization_id, timezone, code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, code, organization_id, is_super_admin, is_active, timezone, created_at`,
            [data.email, data.password_hash, data.full_name, data.organization_id, data.timezone || 'UTC', data.code]
        );
        return result.rows[0];
    }

    /**
     * Update user
     */
    async update(id: string, data: Partial<User>): Promise<User | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.email !== undefined) {
            fields.push(`email = $${paramIndex++}`);
            values.push(data.email);
        }
        if (data.full_name !== undefined) {
            fields.push(`full_name = $${paramIndex++}`);
            values.push(data.full_name);
        }
        if (data.timezone !== undefined) {
            fields.push(`timezone = $${paramIndex++}`);
            values.push(data.timezone);
        }
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${paramIndex++}`);
            values.push(data.is_active);
        }

        if (fields.length === 0) return this.findById(id);

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await query<User>(
            `UPDATE sps_users SET ${fields.join(', ')} WHERE id = $${paramIndex} 
       RETURNING id, email, full_name, code, organization_id, is_super_admin, is_active, timezone, created_at, updated_at`,
            values
        );
        return result.rows[0] || null;
    }

    /**
     * Delete user
     */
    async delete(id: string): Promise<boolean> {
        const result = await query('DELETE FROM sps_users WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Get user roles
     */
    async getUserRoles(userId: string): Promise<RoleAssignment[]> {
        const result = await query<RoleAssignment>(
            `SELECT id, user_id, role, org_id, event_id, dept_id, service_id
       FROM sps_role_assignments WHERE user_id = $1`,
            [userId]
        );
        return result.rows;
    }

    /**
     * Get user permissions (via role mappings)
     */
    async getUserPermissions(userId: string): Promise<string[]> {
        const result = await query<{ permission_code: string }>(
            `SELECT DISTINCT rp.permission_code
       FROM sps_role_assignments ra
       JOIN sps_role_permissions rp ON ra.role = rp.role_code
       WHERE ra.user_id = $1`,
            [userId]
        );
        return result.rows.map(r => r.permission_code);
    }

    /**
     * Increment failed login attempts
     */
    async incrementFailedAttempts(userId: string, lockUntil?: Date): Promise<void> {
        await query(
            `UPDATE sps_users 
       SET failed_login_attempts = failed_login_attempts + 1, 
           account_locked_until = $2
       WHERE id = $1`,
            [userId, lockUntil]
        );
    }

    /**
     * Reset failed login attempts
     */
    async resetFailedAttempts(userId: string): Promise<void> {
        await query(
            `UPDATE sps_users 
       SET failed_login_attempts = 0, 
           account_locked_until = NULL, 
           last_login = NOW()
       WHERE id = $1`,
            [userId]
        );
    }

    /**
     * Assign role to user
     */
    async assignRole(
        userId: string,
        role: string,
        context: { org_id?: string; event_id?: string; dept_id?: string; service_id?: string }
    ): Promise<RoleAssignment> {
        const result = await query<RoleAssignment>(
            `INSERT INTO sps_role_assignments (user_id, role, org_id, event_id, dept_id, service_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [userId, role, context.org_id, context.event_id, context.dept_id, context.service_id]
        );
        return result.rows[0];
    }

    /**
     * Remove role from user
     */
    async removeRole(assignmentId: string): Promise<boolean> {
        const result = await query('DELETE FROM sps_role_assignments WHERE id = $1', [assignmentId]);
        return (result.rowCount ?? 0) > 0;
    }
}
