import { getPrismaClient } from '@sustainpro/shared-database';
import { Department, CreateDepartmentDto } from '@sustainpro/shared-types';

const prisma = getPrismaClient();

export interface DepartmentWithServices extends Department {
    services_count?: number;
    services?: any[];
}

export class DepartmentRepository {
    /**
     * Get departments by event
     */
    async findByEvent(eventId: string): Promise<DepartmentWithServices[]> {
        const departments = await prisma.$queryRaw<DepartmentWithServices[]>`
            SELECT d.*,
                COUNT(ds.id)::int as services_count
            FROM sps_departments d
            LEFT JOIN sps_department_services ds ON d.id = ds.department_id
            WHERE d.event_id = ${eventId}
            GROUP BY d.id
            ORDER BY d.created_at DESC
        `;
        
        return departments;
    }

    /**
     * Get department by ID
     */
    async findById(id: string): Promise<DepartmentWithServices | null> {
        const departments = await prisma.$queryRaw<DepartmentWithServices[]>`
            SELECT d.*,
                (SELECT COUNT(*)::int FROM sps_department_services ds WHERE ds.department_id = d.id) as services_count
            FROM sps_departments d
            WHERE d.id = ${id}
        `;
        
        return departments[0] || null;
    }

    /**
     * Create department
     */
    async create(data: CreateDepartmentDto & {
        description?: string;
        icon?: string;
        color?: string;
        template_origin_id?: string;
    }): Promise<Department> {
        const dept = await prisma.sps_departments.create({
            data: {
                event_id: data.event_id,
                name: data.name,
                head_user_id: data.head_user_id || null,
                description: data.description || null,
                icon: data.icon || 'Layers',
                color: data.color || '#3B82F6',
            } as any
        });
        
        return dept as any as Department;
    }

    /**
     * Update department
     */
    async update(id: string, data: Partial<Department> & {
        description?: string;
        icon?: string;
        color?: string;
    }): Promise<Department | null> {
        const updateData: any = {};

        if (data.name !== undefined) {
            updateData.name = data.name;
        }
        if (data.head_user_id !== undefined) {
            updateData.head_user_id = data.head_user_id;
        }
        if ((data as any).description !== undefined) {
            updateData.description = (data as any).description;
        }
        if ((data as any).icon !== undefined) {
            updateData.icon = (data as any).icon;
        }
        if ((data as any).color !== undefined) {
            updateData.color = (data as any).color;
        }

        if (Object.keys(updateData).length === 0) {
            return this.findById(id);
        }

        const dept = await prisma.sps_departments.update({
            where: { id },
            data: updateData
        });
        
        return dept as any as Department;
    }

    /**
     * Delete department
     */
    async delete(id: string): Promise<boolean> {
        try {
            await prisma.sps_departments.delete({
                where: { id }
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if template already exists in event
     */
    async templateExistsInEvent(eventId: string, templateId: string): Promise<boolean> {
        const count = await prisma.sps_departments.count({
            where: {
                event_id: eventId,
            } as any
        });
        
        return count > 0;
    }

    /**
     * Get department with services
     */
    async getWithServices(id: string): Promise<DepartmentWithServices | null> {
        const dept = await this.findById(id);
        if (!dept) return null;

        const services = await prisma.$queryRaw`
            SELECT ds.*, st.name as template_name, st.description as template_description
            FROM sps_department_services ds
            LEFT JOIN sps_service_templates st ON ds.service_template_id = st.id
            WHERE ds.department_id = ${id}
            ORDER BY ds.created_at
        ` as any[];

        return { ...dept, services };
    }
}
