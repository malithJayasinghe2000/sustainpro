import { Router } from 'express';
import { requirePermission } from '@sustainpro/shared-middleware';
import * as escalationPolicyController from '../controllers/escalation-policy.controller';

const router = Router();

/**
 * @swagger
 * /escalation-policies:
 *   get:
 *     tags: [Escalation Policies]
 *     summary: List all escalation policies for organization
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: service_id
 *         schema:
 *           type: string
 *         description: Filter by service ID
 *       - in: query
 *         name: event_id
 *         schema:
 *           type: string
 *         description: Filter by event ID
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Escalation policies list
 */
router.get('/', escalationPolicyController.getAll);

/**
 * @swagger
 * /escalation-policies/service/{serviceId}:
 *   get:
 *     tags: [Escalation Policies]
 *     summary: Get escalation policies by service ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Escalation policies for service
 */
router.get('/service/:serviceId', escalationPolicyController.getByService);

/**
 * @swagger
 * /escalation-policies/{id}:
 *   get:
 *     tags: [Escalation Policies]
 *     summary: Get escalation policy by ID
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
 *         description: Escalation policy details
 *       404:
 *         description: Policy not found
 */
router.get('/:id', escalationPolicyController.getById);

/**
 * @swagger
 * /escalation-policies:
 *   post:
 *     tags: [Escalation Policies]
 *     summary: Create a new escalation policy
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - escalation_level
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               escalation_level:
 *                 type: number
 *               escalation_delay_minutes:
 *                 type: number
 *               auto_assign_to:
 *                 type: string
 *               notify_method:
 *                 type: string
 *                 enum: [email, sms, push, all]
 *               is_active:
 *                 type: boolean
 *               event_id:
 *                 type: string
 *               service_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Policy created
 */
router.post('/', escalationPolicyController.create);

/**
 * @swagger
 * /escalation-policies/bulk:
 *   post:
 *     tags: [Escalation Policies]
 *     summary: Create multiple escalation policies at once
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - policies
 *             properties:
 *               policies:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Policies created
 */
router.post('/bulk', escalationPolicyController.createBulk);

/**
 * @swagger
 * /escalation-policies/{id}:
 *   put:
 *     tags: [Escalation Policies]
 *     summary: Update an escalation policy
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
 *     responses:
 *       200:
 *         description: Policy updated
 *       404:
 *         description: Policy not found
 */
router.put('/:id', escalationPolicyController.update);

/**
 * @swagger
 * /escalation-policies/{id}:
 *   delete:
 *     tags: [Escalation Policies]
 *     summary: Delete an escalation policy
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
 *         description: Policy deleted
 *       404:
 *         description: Policy not found
 */
router.delete('/:id', escalationPolicyController.deletePolicy);

export default router;
