import { ServiceRepository, ServiceTemplate, DepartmentService as DeptServiceEntity } from '../repositories/service.repository';
import { NotFoundError, createLogger } from '@sustainpro/shared-utils';
import { publishEvent } from '../messaging/publisher';

const logger = createLogger({ service: 'core-service' });

export class ServiceService {
    private repo = new ServiceRepository();

    /**
     * Get all service templates
     */
    async getAllTemplates(category?: string): Promise<ServiceTemplate[]> {
        return this.repo.findAllTemplates(category);
    }

    /**
     * Get service template by ID
     */
    async getTemplateById(id: string): Promise<ServiceTemplate> {
        const template = await this.repo.findTemplateById(id);
        if (!template) {
            throw new NotFoundError('Service template', id);
        }
        return template;
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
        const template = await this.repo.createTemplate(data);

        logger.info('Service template created', { templateId: template.id, name: template.name });

        return template;
    }

    /**
     * Update service template
     */
    async updateTemplate(id: string, data: Partial<ServiceTemplate>): Promise<ServiceTemplate> {
        const template = await this.repo.updateTemplate(id, data);
        if (!template) {
            throw new NotFoundError('Service template', id);
        }

        logger.info('Service template updated', { templateId: id });

        return template;
    }

    /**
     * Delete service template
     */
    async deleteTemplate(id: string): Promise<void> {
        const deleted = await this.repo.deleteTemplate(id);
        if (!deleted) {
            throw new NotFoundError('Service template', id);
        }

        logger.info('Service template deleted', { templateId: id });
    }

    /**
     * Get services by department
     */
    async getByDepartment(departmentId: string): Promise<DeptServiceEntity[]> {
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
        const deleted = await this.repo.removeFromDepartment(id);
        if (!deleted) {
            throw new NotFoundError('Department service', id);
        }

        logger.info('Service removed from department', { serviceId: id });

        await publishEvent('service.unassigned', { service_id: id });
    }
}
