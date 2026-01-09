import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

export interface ServiceTemplate {
    id: string;
    name: string;
    code: string;
    description: string | null;
    category: string;
    config_schema: Record<string, any>;
    default_config: Record<string, any>;
    main_dashboard_layout: any;
    public_dashboard_layout: any;
    features: any[];
    is_public: boolean;
    is_active: boolean;
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
    async findAllTemplates(category?: string): Promise<ServiceTemplate[]> {
        const whereClause = category ? { category } : {};

        const templates = await prisma.sps_service_templates.findMany({
            where: whereClause,
            orderBy: { created_at: 'desc' },
        });

        // Get device models for each template
        const templateIds = templates.map(t => t.id);
        const deviceModels = await prisma.sps_service_device_models.findMany({
            where: { service_template_id: { in: templateIds } },
        });

        // Map device models to templates
        return templates.map(template => ({
            ...template,
            device_models: deviceModels
                .filter(dm => dm.service_template_id === template.id)
                .map(dm => ({ device_model_id: dm.device_model_id, role: dm.is_required ? 'required' : 'optional' })),
        })) as any as ServiceTemplate[];
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
        code?: string;
        description?: string;
        category?: string;
        config_schema?: Record<string, any>;
        default_config?: Record<string, any>;
        main_dashboard_layout?: any[];
        public_dashboard_layout?: any[];
        features?: any[];
        is_public?: boolean;
    }): Promise<ServiceTemplate> {
        // Generate a code from the name if not provided
        const code = data.code || data.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        const result = await prisma.sps_service_templates.create({
            data: {
                name: data.name,
                code: code,
                category: data.category || 'MONITORING',
                description: data.description,
                config_schema: data.config_schema || {},
                default_config: data.default_config || {},
                main_dashboard_layout: data.main_dashboard_layout || { widgets: [] },
                public_dashboard_layout: data.public_dashboard_layout || { widgets: [] },
                features: data.features || [],
                is_public: data.is_public ?? true,
            },
        });
        return result as any as ServiceTemplate;
    }

    /**
     * Update service template
     */
    async updateTemplate(id: string, data: Partial<ServiceTemplate>): Promise<ServiceTemplate | null> {
        const updates: any = {};

        if (data.name !== undefined) updates.name = data.name;
        if (data.description !== undefined) updates.description = data.description;
        if (data.category !== undefined) updates.category = data.category;
        if (data.config_schema !== undefined) updates.config_schema = data.config_schema;
        if (data.default_config !== undefined) updates.default_config = data.default_config;
        if (data.is_public !== undefined) updates.is_public = data.is_public;
        if (data.is_active !== undefined) updates.is_active = data.is_active;

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
