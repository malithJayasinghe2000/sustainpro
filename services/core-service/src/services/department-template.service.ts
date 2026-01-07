import { 
    DepartmentTemplateRepository, 
    DepartmentTemplate, 
    CreateDepartmentTemplateInput, 
    UpdateDepartmentTemplateInput 
} from '../repositories/department-template.repository';
import { NotFoundError, ConflictError, createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'department-template-service' });

const departmentTemplateRepository = new DepartmentTemplateRepository();

export class DepartmentTemplateService {
    /**
     * Get all department templates (global + organization-specific)
     */
    async getAll(organizationId?: string): Promise<DepartmentTemplate[]> {
        return departmentTemplateRepository.findAll(organizationId);
    }

    /**
     * Get a department template by ID
     */
    async getById(id: string): Promise<DepartmentTemplate> {
        const template = await departmentTemplateRepository.findById(id);
        if (!template) {
            throw new NotFoundError(`Department template not found: ${id}`);
        }
        return template;
    }

    /**
     * Create a new department template
     */
    async create(input: CreateDepartmentTemplateInput): Promise<DepartmentTemplate> {
        // Check for duplicate name
        const existing = await departmentTemplateRepository.findByName(
            input.name,
            input.organization_id
        );
        if (existing) {
            throw new ConflictError(
                input.organization_id
                    ? 'A template with this name already exists in your organization'
                    : 'A global template with this name already exists'
            );
        }

        logger.info('Creating department template', { name: input.name, orgId: input.organization_id });
        return departmentTemplateRepository.create(input);
    }

    /**
     * Update a department template
     */
    async update(id: string, input: UpdateDepartmentTemplateInput): Promise<DepartmentTemplate> {
        const existing = await departmentTemplateRepository.findById(id);
        if (!existing) {
            throw new NotFoundError(`Department template not found: ${id}`);
        }

        logger.info('Updating department template', { id });
        return departmentTemplateRepository.update(id, input);
    }

    /**
     * Delete a department template (soft delete)
     */
    async delete(id: string): Promise<void> {
        const existing = await departmentTemplateRepository.findById(id);
        if (!existing) {
            throw new NotFoundError(`Department template not found: ${id}`);
        }

        logger.info('Deleting department template', { id });
        await departmentTemplateRepository.delete(id);
    }
}

export const departmentTemplateService = new DepartmentTemplateService();
