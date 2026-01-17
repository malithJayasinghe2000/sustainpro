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
        const departments = await prisma.sps_departments.findMany({
            where: { event_id: eventId },
            include: {
                _count: {
                    select: { sps_department_services: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return departments.map(d => ({
            ...d,
            services_count: d._count.sps_department_services
        })) as any as DepartmentWithServices[];
    }

    /**
     * Get department by ID
     */
    async findById(id: string): Promise<DepartmentWithServices | null> {
        const department = await prisma.sps_departments.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { sps_department_services: true }
                }
            }
        });

        if (!department) return null;

        return {
            ...department,
            services_count: department._count.sps_department_services
        } as any as DepartmentWithServices;
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

        const services = await prisma.sps_department_services.findMany({
            where: { department_id: id },
            include: {
                sps_service_templates: {
                    select: { name: true, description: true }
                }
            },
            orderBy: { created_at: 'asc' }
        });

        const servicesWithTemplate = services.map(s => ({
            ...s,
            template_name: s.sps_service_templates?.name,
            template_description: s.sps_service_templates?.description
        }));

        return { ...dept, services: servicesWithTemplate };
    }
}
