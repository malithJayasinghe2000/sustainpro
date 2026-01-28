import { Router } from 'express';
import * as alertController from '../controllers/alert.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Alert:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organization_id:
 *           type: string
 *           format: uuid
 *         event_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         department_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         service_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         device_id:
 *           type: string
 *           format: uuid
 *         rule_id:
 *           type: string
 *           format: uuid
 *         severity:
 *           type: string
 *           enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *         status:
 *           type: string
 *           enum: [ACTIVE, ACKNOWLEDGED, RESOLVED, EXPIRED, VERIFIED]
 *         message:
 *           type: string
 *         value:
 *           type: object
 *         threshold:
 *           type: object
 *         acknowledged_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         acknowledged_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         resolved_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         resolved_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         escalation_level:
 *           type: integer
 *         auto_assigned_to:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         metadata:
 *           type: object
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         device:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             device_type:
 *               type: string
 *         rule:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *     AlertStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         active:
 *           type: integer
 *         acknowledged:
 *           type: integer
 *         resolved:
 *           type: integer
 *         expired:
 *           type: integer
 *         by_severity:
 *           type: object
 *           properties:
 *             critical:
 *               type: integer
 *             high:
 *               type: integer
 *             medium:
 *               type: integer
 *             low:
 *               type: integer
 */

/**
 * @swagger
 * /api/v1/alerts:
 *   get:
 *     summary: Get all alerts with role-based filtering
 *     description: |
 *       Retrieves alerts based on user role:
 *       - SUPER_ADMIN: All alerts
 *       - ORG_ADMIN: Organization alerts
 *       - EVENT_MANAGER: Event alerts
 *       - DEPARTMENT_HEAD: Department alerts
 *       - SUPERVISOR: Service alerts
 *       - Others: Assigned alerts only
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         description: Filter by organization (Super Admin only)
 *       - in: query
 *         name: event_id
 *         schema:
 *           type: string
 *         description: Filter by event
 *       - in: query
 *         name: department_id
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: service_id
 *         schema:
 *           type: string
 *         description: Filter by service
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated status filter (ACTIVE,ACKNOWLEDGED,RESOLVED,EXPIRED)
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *         description: Comma-separated severity filter (CRITICAL,HIGH,MEDIUM,LOW)
 *       - in: query
 *         name: device_id
 *         schema:
 *           type: string
 *         description: Filter by device
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter alerts from this date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter alerts until this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', alertController.getAll);

/**
 * @swagger
 * /api/v1/alerts/stats:
 *   get:
 *     summary: Get alert statistics
 *     description: Get aggregated alert statistics based on user role access
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         description: Filter by organization (Super Admin only)
 *     responses:
 *       200:
 *         description: Alert statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AlertStats'
 */
router.get('/stats', alertController.getStats);

/**
 * @swagger
 * /api/v1/alerts/{id}:
 *   get:
 *     summary: Get alert by ID
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alert details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       404:
 *         description: Alert not found
 *       403:
 *         description: Access denied
 */
router.get('/:id', alertController.getById);

/**
 * @swagger
 * /api/v1/alerts/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge an alert
 *     description: Mark an active alert as acknowledged
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         description: Alert cannot be acknowledged (wrong status)
 *       404:
 *         description: Alert not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/acknowledge', alertController.acknowledge);

/**
 * @swagger
 * /api/v1/alerts/{id}/resolve:
 *   post:
 *     summary: Resolve an alert
 *     description: Mark an active or acknowledged alert as resolved
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         description: Alert cannot be resolved (wrong status)
 *       404:
 *         description: Alert not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/resolve', alertController.resolve);

/**
 * @swagger
 * /api/v1/alerts/{id}/dismiss:
 *   post:
 *     summary: Dismiss an alert
 *     description: Dismiss an alert without resolving (mark as expired)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alert dismissed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         description: Alert cannot be dismissed (wrong status)
 *       404:
 *         description: Alert not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/dismiss', alertController.dismiss);

/**
 * @swagger
 * /api/v1/alerts/{id}/escalate:
 *   post:
 *     summary: Escalate an alert
 *     description: Escalate an alert to a higher level and optionally assign to a user
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - escalation_level
 *             properties:
 *               escalation_level:
 *                 type: integer
 *                 description: New escalation level
 *               assign_to:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to assign the alert to
 *     responses:
 *       200:
 *         description: Alert escalated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         description: Alert cannot be escalated (wrong status)
 *       404:
 *         description: Alert not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/escalate', alertController.escalate);

/**
 * @swagger
 * /api/v1/alerts/{id}/approve:
 *   post:
 *     summary: Approve a resolved alert
 *     description: |
 *       Approve a resolved alert/escalation. Only these roles can approve:
 *       - SUPER_ADMIN
 *       - ORG_ADMIN
 *       - EVENT_MANAGER
 *       - DEPT_HEAD
 *       - SERVICE_SUPERVISOR
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approval_notes:
 *                 type: string
 *                 description: Optional notes about the approval
 *     responses:
 *       200:
 *         description: Resolution approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *                 message:
 *                   type: string
 *       400:
 *         description: Alert is not in resolved status
 *       404:
 *         description: Alert not found
 *       403:
 *         description: Access denied - Insufficient role
 */
router.post('/:id/approve', alertController.approveResolution);

/**
 * @swagger
 * /api/v1/alerts/{id}:
 *   delete:
 *     summary: Delete an alert (Admin only)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Alert deleted successfully
 *       404:
 *         description: Alert not found
 *       403:
 *         description: Access denied - Admin only
 */
router.delete('/:id', alertController.deleteAlert);

export default router;
