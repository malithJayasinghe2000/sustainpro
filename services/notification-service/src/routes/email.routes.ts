import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Email
 *   description: Email sending endpoints
 */

/**
 * @swagger
 * /email/alert:
 *   post:
 *     summary: Send alert email notification
 *     description: Internal endpoint called by IoT service to send alert emails
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - alertId
 *               - severity
 *               - message
 *             properties:
 *               to:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *                 description: Recipient email(s)
 *               alertId:
 *                 type: string
 *                 format: uuid
 *               severity:
 *                 type: string
 *                 enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *               message:
 *                 type: string
 *               deviceCode:
 *                 type: string
 *               ruleName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email(s) sent successfully
 *       207:
 *         description: Partial success - some emails failed
 *       400:
 *         description: Missing required fields
 */
router.post('/alert', notificationController.sendAlertEmail);

export default router;
