import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

export interface DepartmentTemplate {
    id: string;
    organization_id: string | null;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    suggested_services: any[];
    required_roles: string[];
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateDepartmentTemplateInput {
    organization_id?: string | null;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    suggested_services?: any[];
    required_roles?: string[];
}

export interface UpdateDepartmentTemplateInput {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    suggested_services?: any[];
    required_roles?: string[];
    is_active?: boolean;
}

export class DepartmentTemplateRepository {
    async findAll(organizationId?: string): Promise<DepartmentTemplate[]> {
        // If organizationId is provided, get global templates + org-specific templates
        // If not provided, get only global templates
        if (organizationId) {
            const result = await prisma.$queryRaw`
                SELECT * FROM sps_department_templates 
                WHERE (organization_id IS NULL OR organization_id = ${organizationId}::uuid) 
                AND is_active = true 
                ORDER BY organization_id NULLS FIRST, name ASC
            ` as any as DepartmentTemplate[];
            return result;
        } else {
            const result = await prisma.$queryRaw`
                SELECT * FROM sps_department_templates 
                WHERE organization_id IS NULL 
                AND is_active = true 
                ORDER BY name ASC
            ` as any as DepartmentTemplate[];
            return result;
        }
    }

    async findById(id: string): Promise<DepartmentTemplate | null> {
        const result = await prisma.sps_department_templates.findUnique({
            where: { id },
        });
        return result as any as DepartmentTemplate | null;
    }

    async findByName(name: string, organizationId?: string | null): Promise<DepartmentTemplate | null> {
        if (organizationId) {
            const result = await prisma.$queryRaw`
                SELECT * FROM sps_department_templates 
                 WHERE organization_id = ${organizationId} AND LOWER(name) = LOWER(${name})
            ` as any as DepartmentTemplate[];
            return result[0] || null;
        } else {
            const result = await prisma.$queryRaw`
                SELECT * FROM sps_department_templates 
                 WHERE organization_id IS NULL AND LOWER(name) = LOWER(${name})
            ` as any as DepartmentTemplate[];
            return result[0] || null;
        }
    }

    async create(data: CreateDepartmentTemplateInput): Promise<DepartmentTemplate> {
        const result = await prisma.sps_department_templates.create({
            data: {
                organization_id: data.organization_id || null,
                name: data.name,
                description: data.description || null,
                icon: data.icon || null,
                color: data.color || null,
                suggested_services: data.suggested_services || [],
                required_roles: data.required_roles || [],
            },
        });
        return result as any as DepartmentTemplate;
    }

    async update(id: string, data: UpdateDepartmentTemplateInput): Promise<DepartmentTemplate> {
        const updates: any = {};

        if (data.name !== undefined) updates.name = data.name;
        if (data.description !== undefined) updates.description = data.description;
        if (data.icon !== undefined) updates.icon = data.icon;
        if (data.color !== undefined) updates.color = data.color;
        if (data.suggested_services !== undefined) updates.suggested_services = data.suggested_services;
        if (data.required_roles !== undefined) updates.required_roles = data.required_roles;
        if (data.is_active !== undefined) updates.is_active = data.is_active;

        const result = await prisma.sps_department_templates.update({
            where: { id },
            data: updates,
        });
        return result as any as DepartmentTemplate;
    }

    async delete(id: string): Promise<void> {
        // Soft delete
        await prisma.sps_department_templates.update({
            where: { id },
            data: {
                is_active: false,
            },
        });
    }
}
