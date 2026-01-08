import { Router } from 'express';
import { authenticateDevice } from '../middleware/device-auth';
import { authenticateToken } from '@sustainpro/shared-middleware';
import * as telemetryController from '../controllers/telemetry.controller';

const router = Router();

/**
 * @swagger
 * /telemetry:
 *   post:
 *     tags: [Telemetry]
 *     summary: Ingest device telemetry
 *     description: Submit telemetry data from IoT device (requires device API key)
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Telemetry ingested
 */
router.post(
    '/',
    authenticateDevice,
    telemetryController.ingest
);

/**
 * @swagger
 * /telemetry/live/{deviceCode}:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get live data for device
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live device data
 */
router.get(
    '/live/:deviceCode',
    authenticateToken,
    telemetryController.getLiveData
);

/**
 * @swagger
 * /telemetry/live/organization/{orgId}:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get live data for organization
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization live data
 */
router.get(
    '/live/organization/:orgId',
    authenticateToken,
    telemetryController.getLiveDataByOrganization
);

/**
 * @swagger
 * /telemetry/live/event/{eventId}:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get live data for event
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event live data
 */
router.get(
    '/live/event/:eventId',
    authenticateToken,
    telemetryController.getLiveDataByEvent
);

/**
 * @swagger
 * /telemetry/history/{deviceId}:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get telemetry history
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Telemetry history
 */
router.get(
    '/history/:deviceId',
    authenticateToken,
    telemetryController.getHistory
);

/**
 * @swagger
 * /telemetry/history/{deviceId}/range:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get telemetry within time range
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Telemetry history
 */
router.get(
    '/history/:deviceId/range',
    authenticateToken,
    telemetryController.getHistoryByRange
);

/**
 * @swagger
 * /telemetry/stats/dashboard:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get dashboard statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get(
    '/stats/dashboard',
    authenticateToken,
    telemetryController.getDashboardStats
);

/**
 * @swagger
 * /telemetry/stats/system:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get system-wide statistics
 *     description: Get system-wide statistics (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 */
router.get(
    '/stats/system',
    authenticateToken,
    telemetryController.getSystemStats
);

export default router;
