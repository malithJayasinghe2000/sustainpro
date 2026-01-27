import { Router } from 'express';
import { escalationController } from '../controllers/escalation.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Alerts
 *     description: Alert processing endpoints (internal)
 */

/**
 * @swagger
 * /api/v1/alerts/process:
 *   post:
 *     summary: Process an incoming alert from IoT service
 *     tags: [Alerts]
 *     description: Internal endpoint for IoT service to send alerts for processing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_id
 *               - device_id
 *               - device_code
 *               - rule_id
 *               - rule_name
 *               - severity
 *               - message
 *             properties:
 *               organization_id:
 *                 type: string
 *                 format: uuid
 *               event_id:
 *                 type: string
 *                 format: uuid
 *               department_id:
 *                 type: string
 *                 format: uuid
 *               service_id:
 *                 type: string
 *                 format: uuid
 *               device_id:
 *                 type: integer
 *               device_code:
 *                 type: string
 *               rule_id:
 *                 type: string
 *                 format: uuid
 *               rule_name:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *               message:
 *                 type: string
 *               value:
 *                 type: object
 *               threshold:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Alert processed successfully
 */
router.post('/process', (req, res, next) => escalationController.processAlert(req, res, next));

export default router;
