import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

export interface ServiceTemplate {
    id: string;
    name: string;
    description: string | null;
    scope: string;
    config: Record<string, any>;
    is_public_dashboard_supported: boolean;
    created_by: string;
    created_at: Date;
    device_models?: any[];
}

export interface DepartmentService {
    id: string;
    department_id: string;
    service_template_id: string;
    name: string | null;
    config: Record<string, any>;
    status: string;
    assigned_supervisor_id: string | null;
    created_at: Date;
}

export class ServiceRepository {
    /**
     * Get all service templates
     */
    async findAllTemplates(scope?: string): Promise<ServiceTemplate[]> {
        let sql = `
            SELECT st.*, 
                COALESCE(
                    json_agg(
                        json_build_object('device_model_id', sdm.device_model_id, 'role', sdm.role)
                    ) FILTER (WHERE sdm.device_model_id IS NOT NULL),
                    '[]'::json
                ) as device_models
            FROM sps_service_templates st
            LEFT JOIN sps_service_device_models sdm ON st.id = sdm.service_id
        `;
        const params: any[] = [];

        if (scope) {
            sql += ` WHERE st.scope = $1`;
            params.push(scope);
        }

        sql += ` GROUP BY st.id ORDER BY st.created_at DESC`;

        const result = await prisma.$queryRaw`${sql}` as any;
        return scope ? await prisma.$queryRaw`
            SELECT st.*, 
                COALESCE(
                    json_agg(
                        json_build_object('device_model_id', sdm.device_model_id, 'role', sdm.role)
                    ) FILTER (WHERE sdm.device_model_id IS NOT NULL),
                    '[]'::json
                ) as device_models
            FROM sps_service_templates st
            LEFT JOIN sps_service_device_models sdm ON st.id = sdm.service_id
            WHERE st.scope = ${scope}
            GROUP BY st.id ORDER BY st.created_at DESC
        ` as any as ServiceTemplate[] : await prisma.$queryRaw`
            SELECT st.*, 
                COALESCE(
                    json_agg(
                        json_build_object('device_model_id', sdm.device_model_id, 'role', sdm.role)
                    ) FILTER (WHERE sdm.device_model_id IS NOT NULL),
                    '[]'::json
                ) as device_models
            FROM sps_service_templates st
            LEFT JOIN sps_service_device_models sdm ON st.id = sdm.service_id
            GROUP BY st.id ORDER BY st.created_at DESC
        ` as any as ServiceTemplate[];
    }

    /**
     * Get service template by ID
     */
    async findTemplateById(id: string): Promise<ServiceTemplate | null> {
        const result = await prisma.$queryRaw`
            SELECT st.*,
                COALESCE(
                    (SELECT jsonb_agg(
                        jsonb_build_object(
                            'device_model_id', sdm.device_model_id, 
                            'role', sdm.role,
                            'min_count', sdm.min_count,
                            'max_count', sdm.max_count
                        )
                    ) FROM sps_service_device_models sdm WHERE sdm.service_id = st.id),
                    '[]'::jsonb
                ) as device_models
             FROM sps_service_templates st
             WHERE st.id = ${id}
        ` as any as ServiceTemplate[];
        return result[0] || null;
    }

    /**
     * Create service template
     */
    async createTemplate(data: {
        name: string;
        description?: string;
        scope: string;
        config?: Record<string, any>;
        is_public_dashboard_supported?: boolean;
        created_by: string;
        main_dashboard_layout?: any[];
        public_dashboard_layout?: any[];
    }): Promise<ServiceTemplate> {
        const result = await prisma.$queryRaw`
            INSERT INTO sps_service_templates (
                name, description, scope, config, is_public_dashboard_supported, 
                created_by, main_dashboard_layout, public_dashboard_layout
            ) VALUES (
                ${data.name},
                ${data.description || null},
                ${data.scope},
                ${JSON.stringify(data.config || {})},
                ${data.is_public_dashboard_supported || false},
                ${data.created_by},
                ${JSON.stringify(data.main_dashboard_layout || [])},
                ${JSON.stringify(data.public_dashboard_layout || [])}
            )
            RETURNING *
        ` as any as ServiceTemplate[];
        return result[0];
    }

    /**
     * Update service template
     */
    async updateTemplate(id: string, data: Partial<ServiceTemplate>): Promise<ServiceTemplate | null> {
        const updates: any = {};

        if (data.name !== undefined) updates.name = data.name;
        if (data.description !== undefined) updates.description = data.description;
        if (data.scope !== undefined) updates.scope = data.scope;
        if (data.config !== undefined) updates.config = data.config;

        if (Object.keys(updates).length === 0) return this.findTemplateById(id);

        const result = await prisma.sps_service_templates.update({
            where: { id },
            data: updates,
        });
        return result as any as ServiceTemplate;
    }

    /**
     * Delete service template
     */
    async deleteTemplate(id: string): Promise<boolean> {
        try {
            await prisma.sps_service_templates.delete({
                where: { id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get services by department
     */
    async findByDepartment(departmentId: string): Promise<DepartmentService[]> {
        const result = await prisma.$queryRaw`
            SELECT ds.*, st.name as template_name, st.description as template_description
             FROM sps_department_services ds
             LEFT JOIN sps_service_templates st ON ds.service_template_id = st.id
             WHERE ds.department_id = ${departmentId}
             ORDER BY ds.created_at
        ` as any as DepartmentService[];
        return result;
    }

    /**
     * Add service to department
     */
    async addToDepartment(data: {
        department_id: string;
        service_template_id: string;
        name?: string;
        config?: Record<string, any>;
        assigned_supervisor_id?: string;
    }): Promise<DepartmentService> {
        const result = await prisma.sps_department_services.create({
            data: {
                department_id: data.department_id,
                service_template_id: data.service_template_id,
                name: data.name || null,
                config: data.config || {},
                status: 'ACTIVE',
                assigned_supervisor_id: data.assigned_supervisor_id || null,
            },
        });
        return result as any as DepartmentService;
    }

    /**
     * Remove service from department
     */
    async removeFromDepartment(id: string): Promise<boolean> {
        try {
            await prisma.sps_department_services.delete({
                where: { id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}
