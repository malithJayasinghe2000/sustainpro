import { Request, Response, NextFunction } from 'express';
import { taskRepository, CreateTaskDTO, UpdateTaskDTO, TaskFilters, CreateEvidenceDTO } from '../repositories/task.repository';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'core-service' });

// =============================================
// TASK CONTROLLER
// =============================================

/**
 * Get all tasks with role-based filtering
 * GET /tasks
 */
export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = (req as any).user;
        const { status, priority, department_id, assigned_to, from_date, to_date, page = '1', limit = '20' } = req.query;

        logger.info('Getting all tasks', { userId: user?.id, role: user?.role });

        const filters: TaskFilters = {};

        // Role-based access control
        switch (user?.role) {
            case 'SUPER_ADMIN':
                if (req.query.organization_id) {
                    filters.organization_id = req.query.organization_id as string;
                }
                break;
            case 'ORG_ADMIN':
                if (!user.organization_id) {
                    res.status(403).json({ success: false, error: 'Organization admin must belong to an organization' });
                    return;
                }
                filters.organization_id = user.organization_id;
                break;
            case 'EVENT_MANAGER':
            case 'DEPARTMENT_HEAD':
                if (user.department_id) {
                    filters.department_id = user.department_id;
                }
                break;
            default:
                // Other roles can only see tasks assigned to them or created by them
                filters.assigned_to = user?.id;
        }

        // Apply additional filters
        if (status) {
            filters.status = (status as string).split(',') as any;
        }
        if (priority) {
            filters.priority = (priority as string).split(',') as any;
        }
        if (department_id) {
            filters.department_id = department_id as string;
        }
        if (assigned_to) {
            filters.assigned_to = assigned_to as string;
        }
        if (from_date) {
            filters.from_date = new Date(from_date as string);
        }
        if (to_date) {
            filters.to_date = new Date(to_date as string);
        }

        const result = await taskRepository.findAll(filters, parseInt(page as string), parseInt(limit as string));

        logger.debug('Tasks retrieved', { count: result.data.length, total: result.total });

        res.json({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        logger.error('Failed to get tasks', { error });
        next(error);
    }
}

/**
 * Get my tasks
 * GET /tasks/my
 */
export async function getMyTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = (req as any).user;
        const { status, priority, page = '1', limit = '20' } = req.query;

        logger.info('Getting my tasks', { userId: user?.id });

        const filters: TaskFilters = {
            assigned_to: user?.id,
        };

        if (status) {
            filters.status = (status as string).split(',') as any;
        }
        if (priority) {
            filters.priority = (priority as string).split(',') as any;
        }

        const result = await taskRepository.findAll(filters, parseInt(page as string), parseInt(limit as string));

        logger.debug('My tasks retrieved', { userId: user?.id, count: result.data.length });

        res.json({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        logger.error('Failed to get my tasks', { error });
        next(error);
    }
}

/**
 * Get task by ID
 * GET /tasks/:id
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        logger.info('Getting task by ID', { taskId: id, userId: user?.id });

        const task = await taskRepository.findById(id);

        if (!task) {
            logger.warn('Task not found', { taskId: id });
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        // Check access based on role
        if (!hasAccessToTask(user, task)) {
            logger.warn('Access denied to task', { taskId: id, userId: user?.id });
            res.status(403).json({ success: false, error: 'Access denied to this task' });
            return;
        }

        logger.debug('Task retrieved', { taskId: id });

        res.json({ success: true, data: task });
    } catch (error) {
        logger.error('Failed to get task', { error, taskId: req.params.id });
        next(error);
    }
}

/**
 * Create a new task
 * POST /tasks
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = (req as any).user;
        const { organization_id, department_id, title, description, priority, assigned_to, due_date } = req.body;

        logger.info('Creating task', { title, userId: user?.id });

        if (!title) {
            logger.warn('Task creation failed - title required');
            res.status(400).json({ success: false, error: 'title is required' });
            return;
        }

        const taskData: CreateTaskDTO = {
            organization_id: organization_id || user?.organization_id,
            department_id,
            title,
            description,
            priority,
            assigned_to,
            created_by: user?.id,
            due_date: due_date ? new Date(due_date) : undefined,
        };

        if (!taskData.organization_id) {
            logger.warn('Task creation failed - organization_id required');
            res.status(400).json({ success: false, error: 'organization_id is required' });
            return;
        }

        const task = await taskRepository.create(taskData);

        logger.info('Task created successfully', { taskId: task.id, title: task.title });

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        logger.error('Failed to create task', { error });
        next(error);
    }
}

/**
 * Update a task
 * PUT /tasks/:id
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const updateData: UpdateTaskDTO = req.body;

        logger.info('Updating task', { taskId: id, userId: user?.id });

        const existing = await taskRepository.findById(id);
        if (!existing) {
            logger.warn('Task not found for update', { taskId: id });
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        if (!hasAccessToTask(user, existing)) {
            logger.warn('Access denied for task update', { taskId: id, userId: user?.id });
            res.status(403).json({ success: false, error: 'Access denied to this task' });
            return;
        }

        if (updateData.due_date) {
            updateData.due_date = new Date(updateData.due_date);
        }

        const task = await taskRepository.update(id, updateData);

        logger.info('Task updated successfully', { taskId: id });

        res.json({ success: true, data: task });
    } catch (error) {
        logger.error('Failed to update task', { error, taskId: req.params.id });
        next(error);
    }
}

/**
 * Delete a task
 * DELETE /tasks/:id
 */
export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        logger.info('Deleting task', { taskId: id, userId: user?.id });

        // Only admins can delete tasks
        if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(user?.role)) {
            logger.warn('Unauthorized task deletion attempt', { taskId: id, userId: user?.id, role: user?.role });
            res.status(403).json({ success: false, error: 'Only administrators can delete tasks' });
            return;
        }

        const existing = await taskRepository.findById(id);
        if (!existing) {
            logger.warn('Task not found for deletion', { taskId: id });
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        await taskRepository.delete(id);

        logger.info('Task deleted successfully', { taskId: id, userId: user?.id });

        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        logger.error('Failed to delete task', { error, taskId: req.params.id });
        next(error);
    }
}

/**
 * Assign task to user
 * POST /tasks/:id/assign
 */
export async function assignTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        const currentUser = (req as any).user;

        logger.info('Assigning task', { taskId: id, assignToUserId: user_id, byUserId: currentUser?.id });

        if (!user_id) {
            logger.warn('Task assignment failed - user_id required');
            res.status(400).json({ success: false, error: 'user_id is required' });
            return;
        }

        const existing = await taskRepository.findById(id);
        if (!existing) {
            logger.warn('Task not found for assignment', { taskId: id });
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        const task = await taskRepository.assign(id, user_id);

        logger.info('Task assigned successfully', { taskId: id, assignedTo: user_id });

        res.json({ success: true, data: task, message: 'Task assigned successfully' });
    } catch (error) {
        logger.error('Failed to assign task', { error, taskId: req.params.id });
        next(error);
    }
}

/**
 * Start a task
 * POST /tasks/:id/start
 */
export async function startTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        logger.info('Starting task', { taskId: id, userId: user?.id });

        const existing = await taskRepository.findById(id);
        if (!existing) {
            logger.warn('Task not found for starting', { taskId: id });
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        if (existing.status !== 'PENDING') {
            logger.warn('Cannot start task - invalid status', { taskId: id, currentStatus: existing.status });
            res.status(400).json({ success: false, error: `Cannot start task with status: ${existing.status}` });
            return;
        }

        const task = await taskRepository.start(id);

        logger.info('Task started successfully', { taskId: id });

        res.json({ success: true, data: task, message: 'Task started' });
    } catch (error) {
        logger.error('Failed to start task', { error, taskId: req.params.id });
        next(error);
    }
}

/**
 * Complete a task
 * POST /tasks/:id/complete
 */
export async function completeTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        logger.info('Completing task', { taskId: id, userId: user?.id });

        const existing = await taskRepository.findById(id);
        if (!existing) {
            logger.warn('Task not found for completion', { taskId: id });
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
            logger.warn('Cannot complete task - invalid status', { taskId: id, currentStatus: existing.status });
            res.status(400).json({ success: false, error: `Cannot complete task with status: ${existing.status}` });
            return;
        }

        const task = await taskRepository.complete(id);

        logger.info('Task completed successfully', { taskId: id });

        res.json({ success: true, data: task, message: 'Task completed' });
    } catch (error) {
        logger.error('Failed to complete task', { error, taskId: req.params.id });
        next(error);
    }
}

/**
 * Cancel a task
 * POST /tasks/:id/cancel
 */
export async function cancelTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        logger.info('Cancelling task', { taskId: id, userId: user?.id });

        const existing = await taskRepository.findById(id);
        if (!existing) {
            logger.warn('Task not found for cancellation', { taskId: id });
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
            logger.warn('Cannot cancel task - invalid status', { taskId: id, currentStatus: existing.status });
            res.status(400).json({ success: false, error: `Cannot cancel task with status: ${existing.status}` });
            return;
        }

        const task = await taskRepository.cancel(id);

        logger.info('Task cancelled successfully', { taskId: id });

        res.json({ success: true, data: task, message: 'Task cancelled' });
    } catch (error) {
        logger.error('Failed to cancel task', { error, taskId: req.params.id });
        next(error);
    }
}

/**
 * Add evidence to a task
 * POST /tasks/:id/evidence
 */
export async function addEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const { type, url, description } = req.body;
        const user = (req as any).user;

        logger.info('Adding evidence to task', { taskId: id, type, userId: user?.id });

        if (!type || !url) {
            logger.warn('Evidence addition failed - type and url required');
            res.status(400).json({ success: false, error: 'type and url are required' });
            return;
        }

        const existing = await taskRepository.findById(id);
        if (!existing) {
            logger.warn('Task not found for evidence', { taskId: id });
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        const evidenceData: CreateEvidenceDTO = {
            task_id: id,
            type,
            url,
            description,
            uploaded_by: user?.id,
        };

        const evidence = await taskRepository.addEvidence(evidenceData);

        logger.info('Evidence added successfully', { taskId: id, evidenceId: evidence.id });

        res.status(201).json({ success: true, data: evidence, message: 'Evidence added' });
    } catch (error) {
        logger.error('Failed to add evidence', { error, taskId: req.params.id });
        next(error);
    }
}

/**
 * Get evidence for a task
 * GET /tasks/:id/evidence
 */
export async function getEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        logger.info('Getting task evidence', { taskId: id, userId: user?.id });

        const existing = await taskRepository.findById(id);
        if (!existing) {
            logger.warn('Task not found for evidence retrieval', { taskId: id });
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        const evidence = await taskRepository.getEvidence(id);

        logger.debug('Task evidence retrieved', { taskId: id, count: evidence.length });

        res.json({ success: true, data: evidence });
    } catch (error) {
        logger.error('Failed to get evidence', { error, taskId: req.params.id });
        next(error);
    }
}

/**
 * Delete evidence
 * DELETE /tasks/:taskId/evidence/:evidenceId
 */
export async function deleteEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { taskId, evidenceId } = req.params;
        const user = (req as any).user;

        logger.info('Deleting evidence', { taskId, evidenceId, userId: user?.id });

        // Only admins can delete evidence
        if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(user?.role)) {
            logger.warn('Unauthorized evidence deletion attempt', { evidenceId, userId: user?.id, role: user?.role });
            res.status(403).json({ success: false, error: 'Only administrators can delete evidence' });
            return;
        }

        await taskRepository.deleteEvidence(evidenceId);

        logger.info('Evidence deleted successfully', { evidenceId });

        res.json({ success: true, message: 'Evidence deleted successfully' });
    } catch (error) {
        logger.error('Failed to delete evidence', { error, evidenceId: req.params.evidenceId });
        next(error);
    }
}

/**
 * Get task statistics
 * GET /tasks/stats
 */
export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = (req as any).user;

        logger.info('Getting task statistics', { userId: user?.id });

        const filters: TaskFilters = {};

        switch (user?.role) {
            case 'SUPER_ADMIN':
                if (req.query.organization_id) {
                    filters.organization_id = req.query.organization_id as string;
                }
                break;
            case 'ORG_ADMIN':
                filters.organization_id = user.organization_id;
                break;
            case 'DEPARTMENT_HEAD':
                filters.department_id = user.department_id;
                break;
            default:
                filters.assigned_to = user?.id;
        }

        const stats = await taskRepository.getStats(filters);

        logger.debug('Task statistics retrieved', { stats });

        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('Failed to get task stats', { error });
        next(error);
    }
}

/**
 * Helper: Check if user has access to a task
 */
function hasAccessToTask(user: any, task: any): boolean {
    switch (user?.role) {
        case 'SUPER_ADMIN':
            return true;
        case 'ORG_ADMIN':
            return task.organization_id === user.organization_id;
        case 'DEPARTMENT_HEAD':
            return task.department_id === user.department_id;
        default:
            // Other roles can access tasks assigned to them or created by them
            return task.assigned_to?.id === user?.id || task.created_by?.id === user?.id;
    }
}
