import { Router } from 'express';
import { requireRole, requirePermission } from '@sustainpro/shared-middleware';
import * as deviceController from '../controllers/device.controller';

const router = Router();

/**
 * @swagger
 * /devices/stats:
 *   get:
 *     tags: [Devices]
 *     summary: Get device statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Device stats
 */
router.get('/stats', deviceController.getStats);

/**
 * @swagger
 * /devices/by-org/{orgId}:
 *   get:
 *     tags: [Devices]
 *     summary: Get devices by organization
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
 *         description: Organization devices
 */
router.get('/by-org/:orgId', deviceController.getByOrganization);

/**
 * @swagger
 * /devices/by-service/{serviceId}:
 *   get:
 *     tags: [Devices]
 *     summary: Get devices by service
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
 *         description: Service devices
 */
router.get('/by-service/:serviceId', deviceController.getByService);

/**
 * @swagger
 * /devices/register:
 *   post:
 *     tags: [Devices]
 *     summary: Register device via USB provisioning
 *     description: Register a new device or update existing device via USB provisioning workflow
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hardware_id
 *             properties:
 *               hardware_id:
 *                 type: string
 *                 description: Hardware ID from the device
 *               device_code:
 *                 type: string
 *                 description: Friendly name/code for the device
 *               location:
 *                 type: string
 *                 description: Physical location of the device
 *               service_id:
 *                 type: string
 *                 description: Service to assign the device to
 *               organization_id:
 *                 type: string
 *                 description: Organization ID (uses user's org if not provided)
 *     responses:
 *       201:
 *         description: Device registered successfully
 *       200:
 *         description: Device already exists, API key regenerated
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Access denied
 */
router.post('/register', deviceController.register);

/**
 * @swagger
 * /devices:
 *   get:
 *     tags: [Devices]
 *     summary: List all devices
 *     description: List all devices (filtered by org for non-super-admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Devices list
 */
router.get('/', deviceController.getAll);

/**
 * @swagger
 * /devices/{id}:
 *   get:
 *     tags: [Devices]
 *     summary: Get device by ID
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
 *         description: Device details
 */
router.get('/:id', deviceController.getById);

/**
 * @swagger
 * /devices:
 *   post:
 *     tags: [Devices]
 *     summary: Create device
 *     description: Create device (ORG_ADMIN+)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Device created
 */
router.post(
    '/',
    requirePermission('devices.manage'),
    deviceController.create
);

/**
 * @swagger
 * /devices/{id}:
 *   put:
 *     tags: [Devices]
 *     summary: Update device
 *     description: Update device (ORG_ADMIN+)
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
 *         description: Device updated
 */
router.put(
    '/:id',
    requirePermission('devices.manage'),
    deviceController.update
);

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     tags: [Devices]
 *     summary: Delete device
 *     description: Delete device (ORG_ADMIN+)
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
 *         description: Device deleted
 */
router.delete(
    '/:id',
    requirePermission('devices.manage'),
    deviceController.remove
);

/**
 * @swagger
 * /devices/{id}/assign:
 *   post:
 *     tags: [Devices]
 *     summary: Assign device to service
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
 *         description: Device assigned
 */
router.post(
    '/:id/assign',
    requirePermission('devices.manage'),
    deviceController.assignToService
);

/**
 * @swagger
 * /devices/{id}/unassign:
 *   post:
 *     tags: [Devices]
 *     summary: Unassign device from service
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
 *         description: Device unassigned
 */
router.post(
    '/:id/unassign',
    requirePermission('devices.manage'),
    deviceController.unassignFromService
);

/**
 * @swagger
 * /devices/{id}/regenerate-api-key:
 *   post:
 *     tags: [Devices]
 *     summary: Regenerate device API key
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
 *         description: API key regenerated
 */
router.post(
    '/:id/regenerate-api-key',
    requirePermission('devices.manage'),
    deviceController.regenerateApiKey
);

export default router;
