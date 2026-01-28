import { Router } from 'express';
import * as escalationController from '../controllers/escalation.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/escalations:
 *   get:
 *     summary: Get all escalations with role-based filtering
 *     tags: [Escalations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         description: Filter by organization
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
 *         description: Comma-separated status filter
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *         description: Comma-separated severity filter
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
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of escalations
 */
router.get('/', escalationController.getAll);

/**
 * @swagger
 * /api/v1/escalations/my:
 *   get:
 *     summary: Get my assigned escalations
 *     tags: [Escalations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of my escalations
 */
router.get('/my', escalationController.getMyEscalations);

/**
 * @swagger
 * /api/v1/escalations/pending-count:
 *   get:
 *     summary: Get count of pending (Open/Ack) escalations
 *     tags: [Escalations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Count
 */
router.get('/pending-count', escalationController.getPendingCount);

export default router;
