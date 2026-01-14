import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management endpoints
 */

/**
 * @swagger
 * /notifications/health:
 *   get:
 *     summary: Health check
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Service health status
 */
router.get('/health', notificationController.healthCheck);

/**
 * @swagger
 * /notifications/status:
 *   get:
 *     summary: Get notification service status
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Service status
 */
router.get('/status', notificationController.getStatus);

/**
 * @swagger
 * /notifications/email/send:
 *   post:
 *     summary: Send email directly (bypasses queue)
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *             properties:
 *               to:
 *                 type: string
 *                 description: Recipient email
 *               subject:
 *                 type: string
 *               html:
 *                 type: string
 *               text:
 *                 type: string
 *               template:
 *                 type: string
 *                 enum: [otp, password_changed, 2fa_status, welcome, alert]
 *               templateData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Email sent
 *       400:
 *         description: Missing required fields
 */
router.post('/email/send', notificationController.sendDirectEmail);

/**
 * @swagger
 * /notifications/email/queue:
 *   post:
 *     summary: Queue email for sending via RabbitMQ
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - type
 *             properties:
 *               to:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [otp, password_changed, 2fa_enabled, 2fa_disabled, welcome, alert]
 *     responses:
 *       200:
 *         description: Email queued
 */
router.post('/email/queue', notificationController.queueEmail);

/**
 * @swagger
 * /notifications/otp:
 *   post:
 *     summary: Send OTP verification email
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - purpose
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               purpose:
 *                 type: string
 *                 enum: [email_verification, password_reset, login_2fa, phone_verification]
 *               recipientName:
 *                 type: string
 *               expiryMinutes:
 *                 type: number
 *     responses:
 *       200:
 *         description: OTP sent/queued
 */
router.post('/otp', notificationController.sendOtp);

export default router;
