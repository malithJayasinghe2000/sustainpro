import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { authenticateToken, requireSuperAdmin } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * @swagger
 * /settings/public:
 *   get:
 *     tags: [Settings]
 *     summary: Get public settings
 *     description: Get public settings (no authentication required)
 *     responses:
 *       200:
 *         description: Public settings retrieved
 */
router.get('/public', settingsController.getPublic);

/**
 * @swagger
 * /settings/security:
 *   get:
 *     tags: [Settings]
 *     summary: Get security settings
 *     description: Get security settings for login page (no authentication required)
 *     responses:
 *       200:
 *         description: Security settings retrieved
 */
router.get('/security', settingsController.getSecurity);

/**
 * @swagger
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get system settings
 *     description: Get full system settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: System settings retrieved
 */
router.get('/', authenticateToken, settingsController.get);

/**
 * @swagger
 * /settings:
 *   put:
 *     tags: [Settings]
 *     summary: Update system settings
 *     description: Update system settings (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated
 *       403:
 *         description: Forbidden - Super Admin required
 */
router.put('/', authenticateToken, requireSuperAdmin, settingsController.update);

export default router;
