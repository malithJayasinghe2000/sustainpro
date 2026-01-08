import { Router } from 'express';
import { requireRole } from '@sustainpro/shared-middleware';
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
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
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
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
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
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
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
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
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
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
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
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    deviceController.regenerateApiKey
);

export default router;
