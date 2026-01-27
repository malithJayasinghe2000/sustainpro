import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'core-service' });

// =============================================
// TYPE DEFINITIONS
// =============================================

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CreateTaskDTO {
    organization_id: string;
    department_id?: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    assigned_to?: string;
    created_by?: string;
    due_date?: Date;
}

export interface UpdateTaskDTO {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    assigned_to?: string;
    due_date?: Date;
}

export interface TaskFilters {
    organization_id?: string;
    department_id?: string;
    status?: TaskStatus | TaskStatus[];
    priority?: TaskPriority | TaskPriority[];
    assigned_to?: string;
    created_by?: string;
    from_date?: Date;
    to_date?: Date;
}

export interface CreateEvidenceDTO {
    task_id: string;
    type: string;
    url: string;
    description?: string;
    uploaded_by?: string;
}

// =============================================
// TASK REPOSITORY
// =============================================

class TaskRepository {
    /**
     * Create a new task
     */
    async create(data: CreateTaskDTO): Promise<any> {
        logger.info('Creating task', { title: data.title, organizationId: data.organization_id });

        const task = await prisma.sps_tasks.create({
            data: {
                organization_id: data.organization_id,
                department_id: data.department_id || null,
                title: data.title,
                description: data.description || null,
                priority: data.priority || 'MEDIUM',
                status: 'PENDING',
                assigned_to: data.assigned_to || null,
                created_by: data.created_by || null,
                due_date: data.due_date || null,
            },
            include: {
                sps_organizations: { select: { id: true, name: true } },
                sps_departments: { select: { id: true, name: true } },
                sps_users_sps_tasks_assigned_toTosps_users: { select: { id: true, full_name: true, email: true } },
                sps_users_sps_tasks_created_byTosps_users: { select: { id: true, full_name: true } },
            },
        });

        logger.info('Task created', { taskId: task.id, title: task.title });

        return this.mapToResponse(task);
    }

    /**
     * Get all tasks with filters
     */
    async findAll(filters: TaskFilters, page = 1, limit = 20): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
        logger.debug('Finding tasks', { filters, page, limit });

        const where: any = {};

        if (filters.organization_id) {
            where.organization_id = filters.organization_id;
        }

        if (filters.department_id) {
            where.department_id = filters.department_id;
        }

        if (filters.status) {
            where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
        }

        if (filters.priority) {
            where.priority = Array.isArray(filters.priority) ? { in: filters.priority } : filters.priority;
        }

        if (filters.assigned_to) {
            where.assigned_to = filters.assigned_to;
        }

        if (filters.created_by) {
            where.created_by = filters.created_by;
        }

        if (filters.from_date || filters.to_date) {
            where.created_at = {};
            if (filters.from_date) {
                where.created_at.gte = filters.from_date;
            }
            if (filters.to_date) {
                where.created_at.lte = filters.to_date;
            }
        }

        const [tasks, total] = await Promise.all([
            prisma.sps_tasks.findMany({
                where,
                include: {
                    sps_organizations: { select: { id: true, name: true } },
                    sps_departments: { select: { id: true, name: true } },
                    sps_users_sps_tasks_assigned_toTosps_users: { select: { id: true, full_name: true, email: true } },
                    sps_users_sps_tasks_created_byTosps_users: { select: { id: true, full_name: true } },
                    sps_task_evidence: { select: { id: true, type: true, url: true, description: true } },
                },
                orderBy: [
                    { priority: 'asc' },
                    { due_date: 'asc' },
                    { created_at: 'desc' },
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.sps_tasks.count({ where }),
        ]);

        logger.debug('Tasks found', { count: tasks.length, total });

        return {
            data: tasks.map(this.mapToResponse),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get task by ID
     */
    async findById(id: string): Promise<any> {
        logger.debug('Finding task by ID', { taskId: id });

        const task = await prisma.sps_tasks.findUnique({
            where: { id },
            include: {
                sps_organizations: { select: { id: true, name: true } },
                sps_departments: { select: { id: true, name: true } },
                sps_users_sps_tasks_assigned_toTosps_users: { select: { id: true, full_name: true, email: true } },
                sps_users_sps_tasks_created_byTosps_users: { select: { id: true, full_name: true } },
                sps_task_evidence: {
                    include: {
                        sps_users: { select: { id: true, full_name: true } },
                    },
                    orderBy: { created_at: 'desc' },
                },
                sps_escalations: {
                    select: { id: true, reason: true, status: true, severity: true },
                },
            },
        });

        if (!task) {
            logger.warn('Task not found', { taskId: id });
            return null;
        }

        return this.mapToResponse(task);
    }

    /**
     * Update a task
     */
    async update(id: string, data: UpdateTaskDTO): Promise<any> {
        logger.info('Updating task', { taskId: id, data });

        const task = await prisma.sps_tasks.update({
            where: { id },
            data: {
                ...data,
                updated_at: new Date(),
            },
            include: {
                sps_organizations: { select: { id: true, name: true } },
                sps_departments: { select: { id: true, name: true } },
                sps_users_sps_tasks_assigned_toTosps_users: { select: { id: true, full_name: true, email: true } },
            },
        });

        logger.info('Task updated', { taskId: id });

        return this.mapToResponse(task);
    }

    /**
     * Delete a task
     */
    async delete(id: string): Promise<boolean> {
        logger.info('Deleting task', { taskId: id });

        await prisma.sps_tasks.delete({ where: { id } });

        logger.info('Task deleted', { taskId: id });

        return true;
    }

    /**
     * Assign a task to a user
     */
    async assign(id: string, userId: string): Promise<any> {
        logger.info('Assigning task', { taskId: id, userId });

        const task = await prisma.sps_tasks.update({
            where: { id },
            data: {
                assigned_to: userId,
                updated_at: new Date(),
            },
            include: {
                sps_users_sps_tasks_assigned_toTosps_users: { select: { id: true, full_name: true, email: true } },
            },
        });

        logger.info('Task assigned', { taskId: id, assignedTo: userId });

        return this.mapToResponse(task);
    }

    /**
     * Start a task (change status to IN_PROGRESS)
     */
    async start(id: string): Promise<any> {
        logger.info('Starting task', { taskId: id });

        const task = await prisma.sps_tasks.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                updated_at: new Date(),
            },
        });

        logger.info('Task started', { taskId: id });

        return this.mapToResponse(task);
    }

    /**
     * Complete a task
     */
    async complete(id: string): Promise<any> {
        logger.info('Completing task', { taskId: id });

        const task = await prisma.sps_tasks.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completed_at: new Date(),
                updated_at: new Date(),
            },
        });

        logger.info('Task completed', { taskId: id });

        return this.mapToResponse(task);
    }

    /**
     * Cancel a task
     */
    async cancel(id: string): Promise<any> {
        logger.info('Cancelling task', { taskId: id });

        const task = await prisma.sps_tasks.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                updated_at: new Date(),
            },
        });

        logger.info('Task cancelled', { taskId: id });

        return this.mapToResponse(task);
    }

    /**
     * Add evidence to a task
     */
    async addEvidence(data: CreateEvidenceDTO): Promise<any> {
        logger.info('Adding evidence to task', { taskId: data.task_id, type: data.type });

        const evidence = await prisma.sps_task_evidence.create({
            data: {
                task_id: data.task_id,
                type: data.type,
                url: data.url,
                description: data.description || null,
                uploaded_by: data.uploaded_by || null,
            },
            include: {
                sps_users: { select: { id: true, full_name: true } },
            },
        });

        logger.info('Evidence added', { evidenceId: evidence.id, taskId: data.task_id });

        return {
            id: evidence.id,
            task_id: evidence.task_id,
            type: evidence.type,
            url: evidence.url,
            description: evidence.description,
            uploaded_by: evidence.sps_users ? {
                id: evidence.sps_users.id,
                full_name: evidence.sps_users.full_name,
            } : null,
            created_at: evidence.created_at,
        };
    }

    /**
     * Get evidence for a task
     */
    async getEvidence(taskId: string): Promise<any[]> {
        logger.debug('Getting evidence for task', { taskId });

        const evidence = await prisma.sps_task_evidence.findMany({
            where: { task_id: taskId },
            include: {
                sps_users: { select: { id: true, full_name: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        logger.debug('Evidence found', { taskId, count: evidence.length });

        return evidence.map((e) => ({
            id: e.id,
            task_id: e.task_id,
            type: e.type,
            url: e.url,
            description: e.description,
            uploaded_by: e.sps_users ? {
                id: e.sps_users.id,
                full_name: e.sps_users.full_name,
            } : null,
            created_at: e.created_at,
        }));
    }

    /**
     * Delete evidence
     */
    async deleteEvidence(evidenceId: string): Promise<boolean> {
        logger.info('Deleting evidence', { evidenceId });

        await prisma.sps_task_evidence.delete({ where: { id: evidenceId } });

        logger.info('Evidence deleted', { evidenceId });

        return true;
    }

    /**
     * Get task statistics
     */
    async getStats(filters: TaskFilters): Promise<{
        total: number;
        pending: number;
        in_progress: number;
        completed: number;
        cancelled: number;
        overdue: number;
        byPriority: Record<string, number>;
    }> {
        logger.debug('Getting task statistics', { filters });

        const where: any = {};

        if (filters.organization_id) {
            where.organization_id = filters.organization_id;
        }

        if (filters.department_id) {
            where.department_id = filters.department_id;
        }

        if (filters.assigned_to) {
            where.assigned_to = filters.assigned_to;
        }

        const [total, pending, in_progress, completed, cancelled, overdue, byPriority] = await Promise.all([
            prisma.sps_tasks.count({ where }),
            prisma.sps_tasks.count({ where: { ...where, status: 'PENDING' } }),
            prisma.sps_tasks.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.sps_tasks.count({ where: { ...where, status: 'COMPLETED' } }),
            prisma.sps_tasks.count({ where: { ...where, status: 'CANCELLED' } }),
            prisma.sps_tasks.count({
                where: {
                    ...where,
                    status: { in: ['PENDING', 'IN_PROGRESS'] },
                    due_date: { lt: new Date() },
                },
            }),
            prisma.sps_tasks.groupBy({
                by: ['priority'],
                where,
                _count: { priority: true },
            }),
        ]);

        const priorityMap: Record<string, number> = {};
        for (const item of byPriority) {
            if (item.priority) {
                priorityMap[item.priority] = item._count.priority;
            }
        }

        logger.debug('Task statistics retrieved', { total, pending, in_progress, completed, cancelled, overdue });

        return {
            total,
            pending,
            in_progress,
            completed,
            cancelled,
            overdue,
            byPriority: priorityMap,
        };
    }

    /**
     * Map database record to response format
     */
    private mapToResponse(task: any): any {
        return {
            id: task.id,
            organization_id: task.organization_id,
            department_id: task.department_id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            due_date: task.due_date,
            completed_at: task.completed_at,
            created_at: task.created_at,
            updated_at: task.updated_at,
            organization: task.sps_organizations ? {
                id: task.sps_organizations.id,
                name: task.sps_organizations.name,
            } : null,
            department: task.sps_departments ? {
                id: task.sps_departments.id,
                name: task.sps_departments.name,
            } : null,
            assigned_to: task.sps_users_sps_tasks_assigned_toTosps_users ? {
                id: task.sps_users_sps_tasks_assigned_toTosps_users.id,
                full_name: task.sps_users_sps_tasks_assigned_toTosps_users.full_name,
                email: task.sps_users_sps_tasks_assigned_toTosps_users.email,
            } : null,
            created_by: task.sps_users_sps_tasks_created_byTosps_users ? {
                id: task.sps_users_sps_tasks_created_byTosps_users.id,
                full_name: task.sps_users_sps_tasks_created_byTosps_users.full_name,
            } : null,
            evidence: task.sps_task_evidence || [],
            escalations: task.sps_escalations || [],
        };
    }
}

export const taskRepository = new TaskRepository();
