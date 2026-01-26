import { Router } from 'express';
import { requirePermission } from '@sustainpro/shared-middleware';
import * as taskController from '../controllers/task.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organization_id:
 *           type: string
 *           format: uuid
 *         department_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         priority:
 *           type: string
 *           enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *         status:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, CANCELLED]
 *         assigned_to:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *         created_by:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             full_name:
 *               type: string
 *         due_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         completed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     TaskEvidence:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         task_id:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [PHOTO, VIDEO, DOCUMENT, SIGNATURE]
 *         url:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         uploaded_by:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             full_name:
 *               type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks with filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (comma-separated)
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority (comma-separated)
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', requirePermission('tasks.view'), taskController.getAll);

/**
 * @swagger
 * /tasks/my:
 *   get:
 *     tags: [Tasks]
 *     summary: Get tasks assigned to current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's tasks
 */
router.get('/my', requirePermission('tasks.view'), taskController.getMyTasks);

/**
 * @swagger
 * /tasks/stats:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Task statistics
 */
router.get('/stats', requirePermission('tasks.view'), taskController.getStats);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
router.get('/:id', requirePermission('tasks.view'), taskController.getById);

/**
 * @swagger
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               organization_id:
 *                 type: string
 *               department_id:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *               assigned_to:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Task created
 */
router.post('/', requirePermission('tasks.create'), taskController.create);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update a task
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *               status:
 *                 type: string
 *               due_date:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated
 */
router.put('/:id', requirePermission('tasks.update'), taskController.update);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 */
router.delete('/:id', requirePermission('tasks.delete'), taskController.deleteTask);

/**
 * @swagger
 * /tasks/{id}/assign:
 *   post:
 *     tags: [Tasks]
 *     summary: Assign task to a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task assigned
 */
router.post('/:id/assign', requirePermission('tasks.assign'), taskController.assignTask);

/**
 * @swagger
 * /tasks/{id}/start:
 *   post:
 *     tags: [Tasks]
 *     summary: Start a task
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task started
 */
router.post('/:id/start', requirePermission('tasks.start'), taskController.startTask);

/**
 * @swagger
 * /tasks/{id}/complete:
 *   post:
 *     tags: [Tasks]
 *     summary: Complete a task
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task completed
 */
router.post('/:id/complete', requirePermission('tasks.complete'), taskController.completeTask);

/**
 * @swagger
 * /tasks/{id}/cancel:
 *   post:
 *     tags: [Tasks]
 *     summary: Cancel a task
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task cancelled
 */
router.post('/:id/cancel', requirePermission('tasks.cancel'), taskController.cancelTask);

/**
 * @swagger
 * /tasks/{id}/evidence:
 *   get:
 *     tags: [Tasks]
 *     summary: Get evidence for a task
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task evidence list
 */
router.get('/:id/evidence', requirePermission('tasks.evidence_view'), taskController.getEvidence);

/**
 * @swagger
 * /tasks/{id}/evidence:
 *   post:
 *     tags: [Tasks]
 *     summary: Add evidence to a task
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - url
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [PHOTO, VIDEO, DOCUMENT, SIGNATURE]
 *               url:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Evidence added
 */
router.post('/:id/evidence', requirePermission('tasks.evidence_upload'), taskController.addEvidence);

/**
 * @swagger
 * /tasks/{taskId}/evidence/{evidenceId}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete task evidence
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: evidenceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Evidence deleted
 */
router.delete('/:taskId/evidence/:evidenceId', requirePermission('tasks.evidence_delete'), taskController.deleteEvidence);

export default router;
