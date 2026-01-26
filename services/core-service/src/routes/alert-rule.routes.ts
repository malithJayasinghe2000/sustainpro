import { Router } from 'express';
import { requirePermission } from '@sustainpro/shared-middleware';
import * as alertRuleController from '../controllers/alert-rule.controller';

const router = Router();

/**
 * @swagger
 * /alert-rules:
 *   get:
 *     tags: [Alert Rules]
 *     summary: List all alert rules for organization
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
 *         description: Alert rules list
 */
router.get('/', alertRuleController.getAll);

/**
 * @swagger
 * /alert-rules/service/{serviceId}:
 *   get:
 *     tags: [Alert Rules]
 *     summary: Get alert rules by service ID
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
 *         description: Alert rules for service
 */
router.get('/service/:serviceId', alertRuleController.getByService);

/**
 * @swagger
 * /alert-rules/{id}:
 *   get:
 *     tags: [Alert Rules]
 *     summary: Get alert rule by ID
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
 *         description: Alert rule details
 *       404:
 *         description: Alert rule not found
 */
router.get('/:id', alertRuleController.getById);

/**
 * @swagger
 * /alert-rules:
 *   post:
 *     tags: [Alert Rules]
 *     summary: Create a new alert rule
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
 *               - condition
 *               - severity
 *             properties:
 *               name:
 *                 type: string
 *                 description: Rule name
 *               description:
 *                 type: string
 *                 description: Rule description
 *               device_type:
 *                 type: string
 *                 description: Device type filter
 *               condition:
 *                 type: object
 *                 required:
 *                   - metric
 *                   - operator
 *                   - threshold
 *                 properties:
 *                   metric:
 *                     type: string
 *                   operator:
 *                     type: string
 *                     enum: ['>', '<', '>=', '<=', '==', '!=', 'contains', 'in']
 *                   threshold:
 *                     oneOf:
 *                       - type: number
 *                       - type: string
 *                       - type: array
 *               actions:
 *                 type: array
 *                 items:
 *                   type: object
 *               severity:
 *                 type: string
 *                 enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *               is_active:
 *                 type: boolean
 *                 default: true
 *               priority:
 *                 type: integer
 *                 default: 100
 *               cooldown_seconds:
 *                 type: integer
 *                 default: 300
 *               event_id:
 *                 type: string
 *               service_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Alert rule created
 *       400:
 *         description: Validation error
 */
router.post(
    '/',
    requirePermission('alerts.create'),
    alertRuleController.create
);

/**
 * @swagger
 * /alert-rules/bulk:
 *   post:
 *     tags: [Alert Rules]
 *     summary: Create multiple alert rules (bulk)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rules
 *             properties:
 *               rules:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/CreateAlertRule'
 *     responses:
 *       201:
 *         description: Alert rules created
 *       400:
 *         description: Validation error
 */
router.post(
    '/bulk',
    requirePermission('alerts.create'),
    alertRuleController.createBulk
);

/**
 * @swagger
 * /alert-rules/{id}:
 *   put:
 *     tags: [Alert Rules]
 *     summary: Update an alert rule
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               condition:
 *                 type: object
 *               actions:
 *                 type: array
 *               severity:
 *                 type: string
 *                 enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *               is_active:
 *                 type: boolean
 *               priority:
 *                 type: integer
 *               cooldown_seconds:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Alert rule updated
 *       404:
 *         description: Alert rule not found
 */
router.put(
    '/:id',
    requirePermission('alerts.update'),
    alertRuleController.update
);

/**
 * @swagger
 * /alert-rules/{id}:
 *   delete:
 *     tags: [Alert Rules]
 *     summary: Delete an alert rule
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
 *         description: Alert rule deleted
 *       404:
 *         description: Alert rule not found
 */
router.delete(
    '/:id',
    requirePermission('alerts.delete'),
    alertRuleController.deleteRule
);

/**
 * @swagger
 * /alert-rules/{id}/toggle:
 *   patch:
 *     tags: [Alert Rules]
 *     summary: Toggle alert rule active status
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
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Alert rule toggled
 *       404:
 *         description: Alert rule not found
 */
router.patch(
    '/:id/toggle',
    requirePermission('rules.toggle'),
    alertRuleController.toggleActive
);

/**
 * @swagger
 * /alert-rules/{id}/test:
 *   post:
 *     tags: [Alert Rules]
 *     summary: Test an alert rule with sample data
 *     description: Evaluate if an alert rule would trigger with given sample data
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
 *               - sample_data
 *             properties:
 *               sample_data:
 *                 type: object
 *                 description: Sample telemetry data to test against the rule
 *                 example: { "temperature": 45, "humidity": 30 }
 *     responses:
 *       200:
 *         description: Test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     rule_id:
 *                       type: string
 *                     rule_name:
 *                       type: string
 *                     triggered:
 *                       type: boolean
 *                     severity:
 *                       type: string
 *                     would_create_alert:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       400:
 *         description: Invalid sample data
 *       404:
 *         description: Alert rule not found
 */
router.post(
    '/:id/test',
    requirePermission('rules.test'),
    alertRuleController.testRule
);

export default router;
