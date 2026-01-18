import { DepartmentRepository } from '../repositories/department.repository';
import { Department, CreateDepartmentDto } from '@sustainpro/shared-types';
import { NotFoundError, ConflictError, createLogger } from '@sustainpro/shared-utils';
import { publishEvent } from '../messaging/publisher';

const logger = createLogger({ service: 'core-service' });

export class DepartmentService {
    private repo = new DepartmentRepository();

    /**
     * Get departments by event
     */
    async getByEvent(eventId: string): Promise<Department[]> {
        return this.repo.findByEvent(eventId);
    }

    /**
     * Get department by ID
     */
    async getById(id: string): Promise<Department> {
        const dept = await this.repo.findById(id);
        if (!dept) {
            throw new NotFoundError('Department', id);
        }
        return dept;
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
    }, createdBy?: string): Promise<Department> {
        // Check for duplicate template in event - DISABLED to allow multiple areas/depts of same type
        /*
        if (data.template_origin_id) {
            const exists = await this.repo.templateExistsInEvent(data.event_id, data.template_origin_id);
            if (exists) {
                throw new ConflictError('This department template has already been added to this event');
            }
        }
        */

        const dept = await this.repo.create(data);

        logger.info('Department created', { deptId: dept.id, name: dept.name });

        await publishEvent('department.created', {
            department_id: dept.id,
            event_id: dept.event_id,
            name: dept.name,
            created_by: createdBy,
        });

        return dept;
    }

    /**
     * Update department
     */
    async update(id: string, data: Partial<Department> & {
        description?: string;
        icon?: string;
        color?: string;
    }): Promise<Department> {
        const dept = await this.repo.update(id, data);
        if (!dept) {
            throw new NotFoundError('Department', id);
        }

        logger.info('Department updated', { deptId: id });

        await publishEvent('department.updated', {
            department_id: id,
            updates: Object.keys(data),
        });

        return dept;
    }

    /**
     * Delete department
     */
    async delete(id: string): Promise<void> {
        const deleted = await this.repo.delete(id);
        if (!deleted) {
            throw new NotFoundError('Department', id);
        }

        logger.info('Department deleted', { deptId: id });

        await publishEvent('department.deleted', { department_id: id });
    }

    /**
     * Get department with services
     */
    async getWithServices(id: string): Promise<any> {
        const dept = await this.repo.getWithServices(id);
        if (!dept) {
            throw new NotFoundError('Department', id);
        }
        return dept;
    }
}
