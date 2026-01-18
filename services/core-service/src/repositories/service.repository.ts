import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// =============================================
// TYPE DEFINITIONS
// =============================================

export interface ServiceParameter {
    key: string;
    name: string;
    icon?: string;
    dataType: 'number' | 'string' | 'boolean';
    unit?: string;
    aggregation?: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'LATEST';
    sourceParam?: string; // Parameter key from device model
}

export interface DeviceModelLink {
    device_model_id: string;
    role?: string;
    min_devices?: number;
    max_devices?: number;
    is_required?: boolean;
}

export interface ServiceTemplate {
    id: string;
    name: string;
    code: string;
    description: string | null;
    category: string;
    image_url: string | null;
    service_type: string;
    has_public_dashboard: boolean;
    service_parameters: ServiceParameter[];
    device_dashboard_layout: any;
    main_dashboard_layout: any;
    public_dashboard_layout: any;
    config_schema: Record<string, any>;
    default_config: Record<string, any>;
    features: any[];
    is_public: boolean;
    is_active: boolean;
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
    device_models?: DeviceModelLink[];
}

export interface CreateServiceTemplateDTO {
    name: string;
    code?: string;
    description?: string;
    category?: string;
    image_url?: string;
    service_type?: string;
    has_public_dashboard?: boolean;
    service_parameters?: ServiceParameter[];
    device_dashboard_layout?: any;
    main_dashboard_layout?: any;
    public_dashboard_layout?: any;
    config_schema?: Record<string, any>;
    default_config?: Record<string, any>;
    features?: any[];
    is_public?: boolean;
    device_models?: DeviceModelLink[];
    created_by?: string;
}

export interface UpdateServiceTemplateDTO extends Partial<CreateServiceTemplateDTO> {
    is_active?: boolean;
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

// =============================================
// REPOSITORY CLASS
// =============================================

export class ServiceRepository {
    /**
     * Generate a URL-safe code from a name
     */
    private generateCode(name: string): string {
        return name
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .substring(0, 50);
    }

    /**
     * Get all service templates with device models
     */
    async findAllTemplates(category?: string): Promise<ServiceTemplate[]> {
        const whereClause: any = { is_active: true };
        if (category) whereClause.category = category;

        const templates = await prisma.sps_service_templates.findMany({
            where: whereClause,
            orderBy: { created_at: 'desc' },
            include: {
                sps_service_device_models: {
                    include: {
                        sps_device_models: true
                    }
                }
            }
        });

        return templates.map(template => ({
            ...template,
            service_parameters: (template.service_parameters as unknown as ServiceParameter[]) || [],
            device_models: template.sps_service_device_models.map(sdm => ({
                device_model_id: sdm.device_model_id,
                role: sdm.role || 'primary',
                min_devices: sdm.min_devices || 1,
                max_devices: sdm.max_devices,
                is_required: sdm.is_required || false,
                device_model: sdm.sps_device_models
            })),
        })) as any as ServiceTemplate[];
    }

    /**
     * Get service template by ID with full details
     */
    async findTemplateById(id: string): Promise<ServiceTemplate | null> {
        const template = await prisma.sps_service_templates.findUnique({
            where: { id },
            include: {
                sps_service_device_models: {
                    include: {
                        sps_device_models: true
                    }
                }
            }
        });

        if (!template) return null;

        return {
            ...template,
            service_parameters: (template.service_parameters as unknown as ServiceParameter[]) || [],
            device_models: template.sps_service_device_models.map(sdm => ({
                device_model_id: sdm.device_model_id,
                role: sdm.role || 'primary',
                min_devices: sdm.min_devices || 1,
                max_devices: sdm.max_devices,
                is_required: sdm.is_required || false,
                device_model: sdm.sps_device_models
            })),
        } as any as ServiceTemplate;
    }

    /**
     * Create a new service template with device models
     */
    async createTemplate(data: CreateServiceTemplateDTO): Promise<ServiceTemplate> {
        const code = data.code || this.generateCode(data.name);

        return await prisma.$transaction(async (tx) => {
            // Create the service template
            const template = await tx.sps_service_templates.create({
                data: {
                    name: data.name,
                    code: code,
                    category: data.category || 'MONITORING',
                    description: data.description,
                    image_url: data.image_url,
                    service_type: data.service_type || 'GLOBAL',
                    has_public_dashboard: data.has_public_dashboard || false,
                    service_parameters: (data.service_parameters || []) as any,
                    device_dashboard_layout: data.device_dashboard_layout || { widgets: [] },
                    main_dashboard_layout: data.main_dashboard_layout || { widgets: [] },
                    public_dashboard_layout: data.public_dashboard_layout || { widgets: [] },
                    config_schema: data.config_schema || {},
                    default_config: data.default_config || {},
                    features: data.features || [],
                    is_public: data.is_public ?? true,
                    created_by: data.created_by,
                },
            });

            // Link device models if provided
            if (data.device_models && data.device_models.length > 0) {
                await tx.sps_service_device_models.createMany({
                    data: data.device_models.map(dm => ({
                        service_template_id: template.id,
                        device_model_id: dm.device_model_id,
                        role: dm.role || 'primary',
                        min_devices: dm.min_devices || 1,
                        max_devices: dm.max_devices,
                        is_required: dm.is_required || false,
                    })),
                });
            }

            // Fetch and return the complete template
            const result = await tx.sps_service_templates.findUnique({
                where: { id: template.id },
                include: {
                    sps_service_device_models: {
                        include: {
                            sps_device_models: true
                        }
                    }
                }
            });

            return {
                ...result,
                service_parameters: (result?.service_parameters as unknown as ServiceParameter[]) || [],
                device_models: result?.sps_service_device_models.map(sdm => ({
                    device_model_id: sdm.device_model_id,
                    role: sdm.role || 'primary',
                    min_devices: sdm.min_devices || 1,
                    max_devices: sdm.max_devices,
                    is_required: sdm.is_required || false,
                    device_model: sdm.sps_device_models
                })) || [],
            } as any as ServiceTemplate;
        });
    }

    /**
     * Update service template and optionally device models
     */
    async updateTemplate(id: string, data: UpdateServiceTemplateDTO): Promise<ServiceTemplate | null> {
        return await prisma.$transaction(async (tx) => {
            // Build update object
            const updates: any = {
                updated_at: new Date(),
            };

            // Map fields that can be updated
            const fields = [
                'name', 'description', 'category', 'image_url', 'service_type',
                'has_public_dashboard', 'service_parameters', 'device_dashboard_layout',
                'main_dashboard_layout', 'public_dashboard_layout', 'config_schema',
                'default_config', 'features', 'is_public', 'is_active'
            ];

            for (const field of fields) {
                if ((data as any)[field] !== undefined) {
                    updates[field] = (data as any)[field];
                }
            }

            // Generate new code if name changed and no explicit code provided
            if (data.name && !data.code) {
                updates.code = this.generateCode(data.name);
            }

            // Update the template
            await tx.sps_service_templates.update({
                where: { id },
                data: updates,
            });

            // Update device models if provided
            if (data.device_models !== undefined) {
                // Delete existing links
                await tx.sps_service_device_models.deleteMany({
                    where: { service_template_id: id }
                });

                // Create new links
                if (data.device_models.length > 0) {
                    await tx.sps_service_device_models.createMany({
                        data: data.device_models.map(dm => ({
                            service_template_id: id,
                            device_model_id: dm.device_model_id,
                            role: dm.role || 'primary',
                            min_devices: dm.min_devices || 1,
                            max_devices: dm.max_devices,
                            is_required: dm.is_required || false,
                        })),
                    });
                }
            }

            return await this.findTemplateById(id);
        });
    }

    /**
     * Update specific dashboard layout
     */
    async updateDashboard(
        id: string, 
        dashboardType: 'device' | 'service' | 'public', 
        layout: any
    ): Promise<ServiceTemplate | null> {
        const fieldMap: Record<string, string> = {
            device: 'device_dashboard_layout',
            service: 'main_dashboard_layout',
            public: 'public_dashboard_layout',
        };

        const field = fieldMap[dashboardType];
        if (!field) return null;

        await prisma.sps_service_templates.update({
            where: { id },
            data: {
                [field]: layout,
                updated_at: new Date(),
            },
        });

        return await this.findTemplateById(id);
    }

    /**
     * Delete service template (soft delete)
     */
    async deleteTemplate(id: string): Promise<boolean> {
        try {
            await prisma.sps_service_templates.update({
                where: { id },
                data: { 
                    is_active: false,
                    updated_at: new Date(),
                },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Hard delete service template
     */
    async hardDeleteTemplate(id: string): Promise<boolean> {
        try {
            // Delete device model links first
            await prisma.sps_service_device_models.deleteMany({
                where: { service_template_id: id }
            });
            
            // Delete the template
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
        const result = await prisma.sps_department_services.findMany({
            where: { department_id: departmentId },
            include: {
                sps_service_templates: true
            },
            orderBy: { created_at: 'desc' }
        });
        
        return result.map(ds => ({
            ...ds,
            template_name: ds.sps_service_templates?.name,
            template_description: ds.sps_service_templates?.description,
        })) as any as DepartmentService[];
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

    /**
     * Check if user has supervisor access to a service instance
     */
    async checkSupervisorAccess(userId: string, serviceId: string): Promise<boolean> {
        const assignment = await prisma.sps_role_assignments.findFirst({
            where: {
                user_id: userId,
                service_id: serviceId,
                role: 'SERVICE_SUPERVISOR',
            }
        });
        return !!assignment;
    }
}
