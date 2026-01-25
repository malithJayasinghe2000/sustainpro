import {
    ServiceRepository,
    ServiceTemplate,
    CreateServiceTemplateDTO,
    UpdateServiceTemplateDTO,
    DepartmentService as DeptServiceEntity
} from '../repositories/service.repository';
import { NotFoundError, ForbiddenError, createLogger } from '@sustainpro/shared-utils';
import { publishEvent } from '../messaging/publisher';

const logger = createLogger({ service: 'core-service' });

export class ServiceService {
    private repo = new ServiceRepository();

    /**
     * Get all service templates
     */
    async getAllTemplates(category?: string): Promise<ServiceTemplate[]> {
        logger.debug('Fetching all service templates', { category });
        return this.repo.findAllTemplates(category);
    }

    /**
     * Get service template by ID
     */
    async getTemplateById(id: string): Promise<ServiceTemplate> {
        logger.debug('Fetching service template by ID', { id });
        const template = await this.repo.findTemplateById(id);
        if (!template) {
            throw new NotFoundError('Service template', id);
        }
        return template;
    }

    /**
     * Create service template (Super Admin only)
     */
    async createTemplate(data: CreateServiceTemplateDTO, createdBy?: string): Promise<ServiceTemplate> {
        logger.info('Creating service template', { name: data.name, createdBy });

        const template = await this.repo.createTemplate({
            ...data,
            created_by: createdBy,
        });

        logger.info('Service template created', {
            templateId: template.id,
            name: template.name,
            deviceModelsCount: data.device_models?.length || 0
        });

        await publishEvent('service.template.created', {
            template_id: template.id,
            name: template.name,
            created_by: createdBy,
        });

        return template;
    }

    /**
     * Update service template (Super Admin only)
     */
    async updateTemplate(id: string, data: UpdateServiceTemplateDTO): Promise<ServiceTemplate> {
        logger.info('Updating service template', { id, fields: Object.keys(data) });

        const template = await this.repo.updateTemplate(id, data);
        if (!template) {
            throw new NotFoundError('Service template', id);
        }

        logger.info('Service template updated', { templateId: id });

        await publishEvent('service.template.updated', {
            template_id: id,
            updated_fields: Object.keys(data),
        });

        return template;
    }

    /**
     * Update dashboard layout
     * - Super Admin: Can update any dashboard type
     * - Service Supervisor: Can only update public dashboard for assigned services
     */
    async updateDashboard(
        templateId: string,
        dashboardType: 'device' | 'service' | 'public',
        layout: any,
        userId?: string,
        isSuperAdmin?: boolean
    ): Promise<ServiceTemplate> {
        logger.info('Updating dashboard', { templateId, dashboardType, userId });

        // Permission check for non-super admins
        if (!isSuperAdmin) {
            if (dashboardType !== 'public') {
                throw new ForbiddenError('Only Super Admins can modify device and service dashboards');
            }
            // For public dashboard, check if user is a supervisor for this service
            // This is a template-level edit, so we need different permission logic
            // For now, only allow super admins to edit template dashboards
            // Service supervisors can edit instance-level dashboards (separate endpoint)
            throw new ForbiddenError('Only Super Admins can modify service template dashboards');
        }

        const template = await this.repo.updateDashboard(templateId, dashboardType, layout);
        if (!template) {
            throw new NotFoundError('Service template', templateId);
        }

        logger.info('Dashboard updated', { templateId, dashboardType });

        await publishEvent('service.dashboard.updated', {
            template_id: templateId,
            dashboard_type: dashboardType,
            updated_by: userId,
        });

        return template;
    }

    /**
     * Delete service template (soft delete)
     */
    async deleteTemplate(id: string): Promise<void> {
        logger.info('Deleting service template', { id });

        const deleted = await this.repo.deleteTemplate(id);
        if (!deleted) {
            throw new NotFoundError('Service template', id);
        }

        logger.info('Service template deleted', { templateId: id });

        await publishEvent('service.template.deleted', {
            template_id: id,
        });
    }

    /**
     * Get services by department
     */
    async getByDepartment(departmentId: string): Promise<DeptServiceEntity[]> {
        logger.debug('Fetching services by department', { departmentId });
        return this.repo.findByDepartment(departmentId);
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
    }, assignedBy?: string): Promise<DeptServiceEntity> {
        logger.info('Assigning service to department', {
            departmentId: data.department_id,
            templateId: data.service_template_id
        });

        const service = await this.repo.addToDepartment(data);

        logger.info('Service assigned to department', {
            serviceId: service.id,
            departmentId: data.department_id
        });

        await publishEvent('service.assigned', {
            service_id: service.id,
            department_id: data.department_id,
            template_id: data.service_template_id,
            assigned_by: assignedBy,
        });

        return service;
    }

    /**
     * Remove service from department
     */
    async removeFromDepartment(id: string): Promise<void> {
        logger.info('Removing service from department', { serviceId: id });

        const deleted = await this.repo.removeFromDepartment(id);
        if (!deleted) {
            throw new NotFoundError('Department service', id);
        }

        logger.info('Service removed from department', { serviceId: id });

        await publishEvent('service.unassigned', { service_id: id });
    }

    /**
     * Update department service
     */
    async updateDepartmentService(id: string, data: {
        assigned_supervisor_id?: string;
        config?: Record<string, any>;
        name?: string;
    }): Promise<DeptServiceEntity> {
        logger.info('Updating department service', { serviceId: id, fields: Object.keys(data) });

        const service = await this.repo.updateDepartmentService(id, data);
        if (!service) {
            throw new NotFoundError('Department service', id);
        }

        logger.info('Department service updated', { serviceId: id });

        await publishEvent('service.updated', {
            service_id: id,
            updated_fields: Object.keys(data),
        });

        return service;
    }

    /**
     * Get department service by ID
     */
    async getDepartmentServiceById(id: string): Promise<any> {
        const service = await this.repo.findDepartmentServiceById(id);
        if (!service) {
            throw new NotFoundError('Department service', id);
        }
        return service;

    }
    //   Check if user can edit public dashboard for a service

    async canEditPublicDashboard(userId: string, serviceId: string): Promise<boolean> {
        return this.repo.checkSupervisorAccess(userId, serviceId);
    }

    /**
     * Get services assigned to user (my services)
     */
    async getByUser(userId: string): Promise<any[]> {
        logger.debug('Fetching services for user', { userId });
        return this.repo.findByUser(userId);
    }
}
