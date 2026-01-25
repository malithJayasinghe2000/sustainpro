import { getPrismaClient } from '@sustainpro/shared-database';
import { Department, CreateDepartmentDto } from '@sustainpro/shared-types';

const prisma = getPrismaClient();

export interface DepartmentWithServices extends Department {
    services_count?: number;
    services?: any[];
    template?: any;
}

export class DepartmentRepository {
    async findByUser(userId: string): Promise<DepartmentWithServices[]> {
        const departments = await prisma.sps_departments.findMany({
            where: {
                OR: [
                    { head_user_id: userId },
                    {
                        sps_role_assignments: {
                            some: {
                                user_id: userId,
                                role: 'DEPT_HEAD'
                            }
                        }
                    }
                ]
            },
            include: {
                sps_events: {
                    select: { name: true, code: true, start_date: true, end_date: true, status: true }
                },
                sps_department_templates: {
                    select: { name: true, description: true, icon: true, color: true }
                },
                _count: {
                    select: {
                        sps_department_services: true,
                        sps_role_assignments: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return departments.map(d => ({
            ...d,
            event_name: d.sps_events?.name,
            event_start_date: d.sps_events?.start_date,
            event_end_date: d.sps_events?.end_date,
            event_status: d.sps_events?.status,
            template: d.sps_department_templates,
            services_count: d._count.sps_department_services,
            staff_count: d._count.sps_role_assignments
        })) as any as DepartmentWithServices[];
    }

    /**
     * Get departments by event
     */
    async findByEvent(eventId: string): Promise<DepartmentWithServices[]> {
        const departments = await prisma.sps_departments.findMany({
            where: { event_id: eventId },
            include: {
                sps_department_templates: {
                    select: { name: true, description: true, icon: true, color: true }
                },
                _count: {
                    select: {
                        sps_department_services: true,
                        sps_role_assignments: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return departments.map(d => ({
            ...d,
            // If template data exists, we can optionally use it or pass it along.
            // For now, let's keep the department's own fields primary, but you can override here if needed.
            template: d.sps_department_templates,
            services_count: d._count.sps_department_services,
            staff_count: d._count.sps_role_assignments
        })) as any as DepartmentWithServices[];
    }

    /**
     * Get department by ID
     */
    async findById(id: string): Promise<DepartmentWithServices | null> {
        const department = await prisma.sps_departments.findUnique({
            where: { id },
            include: {
                sps_department_templates: {
                    select: { name: true, description: true, icon: true, color: true }
                },
                _count: {
                    select: {
                        sps_department_services: true,
                        sps_role_assignments: true
                    }
                }
            }
        });

        if (!department) return null;

        return {
            ...department,
            template: department.sps_department_templates,
            services_count: department._count.sps_department_services,
            staff_count: department._count.sps_role_assignments
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
        coordinates?: any;
    }): Promise<Department> {
        const dept = await prisma.sps_departments.create({
            data: {
                event_id: data.event_id,
                name: data.name,
                location_name: (data as any).location_name || null,
                head_user_id: data.head_user_id || null,
                description: data.description || null,
                icon: data.icon || 'Layers',
                color: data.color || '#3B82F6',
                department_template_id: data.template_origin_id || null,
                coordinates: data.coordinates || {},
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
                department_template_id: templateId
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
