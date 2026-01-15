import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

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

// Fallback roles when database table is not available
const FALLBACK_ROLES: Role[] = [
    { id: '1', code: 'SUPER_ADMIN', name: 'Super Admin', description: 'Platform administrator with full access', level: 0, icon: 'ShieldAlert', color: '#EF4444', is_system: true, is_active: true, created_at: null, updated_at: null },
    { id: '2', code: 'ORG_ADMIN', name: 'Organization Admin', description: 'Full control over a specific organization', level: 1, icon: 'Building2', color: '#8B5CF6', is_system: true, is_active: true, created_at: null, updated_at: null },
    { id: '3', code: 'EVENT_MANAGER', name: 'Event Manager', description: 'Manages events, departments, and services', level: 2, icon: 'Calendar', color: '#3B82F6', is_system: true, is_active: true, created_at: null, updated_at: null },
    { id: '4', code: 'DEPT_HEAD', name: 'Department Head', description: 'Oversees a specific department', level: 3, icon: 'Users', color: '#14B8A6', is_system: true, is_active: true, created_at: null, updated_at: null },
    { id: '5', code: 'SERVICE_SUPERVISOR', name: 'Service Supervisor', description: 'Manages service deployments and technicians', level: 4, icon: 'Activity', color: '#F97316', is_system: true, is_active: true, created_at: null, updated_at: null },
    { id: '6', code: 'TECHNICIAN', name: 'Onsite Technician', description: 'Ground-level access to manage devices', level: 5, icon: 'Settings', color: '#A855F7', is_system: true, is_active: true, created_at: null, updated_at: null },
    { id: '7', code: 'SERVICE_SUPPLIER', name: 'Service Supplier', description: 'External supplier with limited access', level: 5, icon: 'Truck', color: '#06B6D4', is_system: true, is_active: true, created_at: null, updated_at: null },
    { id: '8', code: 'VIEWER', name: 'Organizer Viewer', description: 'Read-only access to dashboards and reports', level: 6, icon: 'Eye', color: '#6B7280', is_system: true, is_active: true, created_at: null, updated_at: null },
];

export class RoleRepository {
    /**
     * Get Prisma sps_roles accessor, returns null if not available
     */
    private get rolesTable() {
        return (prisma as any).sps_roles;
    }

    /**
     * Get all active roles
     */
    async findAll(includeInactive = false): Promise<Role[]> {
        try {
            if (!this.rolesTable) throw new Error('sps_roles not available');
            const where = includeInactive ? {} : { is_active: true };
            return await this.rolesTable.findMany({
                where,
                orderBy: { level: 'asc' },
            }) as Role[];
        } catch (error) {
            console.warn('RoleRepository.findAll: Using fallback roles');
            return includeInactive ? FALLBACK_ROLES : FALLBACK_ROLES.filter(r => r.is_active);
        }
    }

    /**
     * Get role by code
     */
    async findByCode(code: string): Promise<Role | null> {
        try {
            if (!this.rolesTable) throw new Error('sps_roles not available');
            return await this.rolesTable.findUnique({
                where: { code },
            }) as Role | null;
        } catch (error) {
            console.warn('RoleRepository.findByCode: Using fallback');
            return FALLBACK_ROLES.find(r => r.code === code) || null;
        }
    }

    /**
     * Get role by ID
     */
    async findById(id: string): Promise<Role | null> {
        try {
            if (!this.rolesTable) throw new Error('sps_roles not available');
            return await this.rolesTable.findUnique({
                where: { id },
            }) as Role | null;
        } catch (error) {
            console.warn('RoleRepository.findById: Using fallback');
            return FALLBACK_ROLES.find(r => r.id === id) || null;
        }
    }

    /**
     * Get roles that a user with given role level can assign
     * (Only roles with equal or higher level number - lower in hierarchy)
     */
    async getAssignableRoles(currentUserRoleLevel: number): Promise<Role[]> {
        try {
            if (!this.rolesTable) throw new Error('sps_roles not available');
            return await this.rolesTable.findMany({
                where: {
                    is_active: true,
                    level: { gte: currentUserRoleLevel },
                },
                orderBy: { level: 'asc' },
            }) as Role[];
        } catch (error) {
            console.warn('RoleRepository.getAssignableRoles: Using fallback');
            return FALLBACK_ROLES.filter(r => r.is_active && r.level >= currentUserRoleLevel);
        }
    }

    /**
     * Get roles by codes
     */
    async findByCodes(codes: string[]): Promise<Role[]> {
        try {
            if (!this.rolesTable) throw new Error('sps_roles not available');
            return await this.rolesTable.findMany({
                where: {
                    code: { in: codes },
                },
                orderBy: { level: 'asc' },
            }) as Role[];
        } catch (error) {
            console.warn('RoleRepository.findByCodes: Using fallback');
            return FALLBACK_ROLES.filter(r => codes.includes(r.code)).sort((a, b) => a.level - b.level);
        }
    }

    /**
     * Create a new role (for custom roles)
     */
    async create(data: {
        code: string;
        name: string;
        description?: string;
        level: number;
        icon?: string;
        color?: string;
    }): Promise<Role> {
        if (!this.rolesTable) throw new Error('sps_roles table not available');
        return await this.rolesTable.create({
            data: {
                ...data,
                is_system: false, // Custom roles are not system roles
            },
        }) as Role;
    }

    /**
     * Update a role (only non-system roles can have code changed)
     */
    async update(id: string, data: Partial<Omit<Role, 'id' | 'created_at'>>): Promise<Role | null> {
        if (!this.rolesTable) throw new Error('sps_roles table not available');
        const role = await this.findById(id);
        if (!role) return null;

        // System roles cannot be deleted or have code changed
        const updateData: any = { ...data };
        if (role.is_system) {
            delete updateData.code;
            delete updateData.is_system;
        }

        return await this.rolesTable.update({
            where: { id },
            data: {
                ...updateData,
                updated_at: new Date(),
            },
        }) as Role;
    }

    /**
     * Soft delete a role (set inactive)
     * System roles cannot be deleted
     */
    async deactivate(id: string): Promise<boolean> {
        if (!this.rolesTable) throw new Error('sps_roles table not available');
        const role = await this.findById(id);
        if (!role || role.is_system) return false;

        await this.rolesTable.update({
            where: { id },
            data: { is_active: false, updated_at: new Date() },
        });
        return true;
    }

    /**
     * Get role display name by code
     */
    async getRoleDisplayName(code: string): Promise<string | null> {
        const role = await this.findByCode(code);
        return role?.name || null;
    }
}
