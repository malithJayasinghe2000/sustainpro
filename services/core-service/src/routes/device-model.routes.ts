import { Router } from 'express';
import { requireRole } from '@sustainpro/shared-middleware';
import * as deviceModelController from '../controllers/device-model.controller';

const router = Router();

/**
 * @swagger
 * /device-models/stats/count:
 *   get:
 *     tags: [Device Models]
 *     summary: Get device model count
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Model count
 */
router.get('/stats/count', deviceModelController.getCount);

/**
 * @swagger
 * /device-models:
 *   get:
 *     tags: [Device Models]
 *     summary: List all device models
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Device models list
 */
router.get('/', deviceModelController.getAll);

/**
 * @swagger
 * /device-models/{id}:
 *   get:
 *     tags: [Device Models]
 *     summary: Get device model by ID
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
 *         description: Device model details
 */
router.get('/:id', deviceModelController.getById);

/**
 * @swagger
 * /device-models:
 *   post:
 *     tags: [Device Models]
 *     summary: Create device model
 *     description: Create device model (SUPER_ADMIN only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Model created
 */
router.post(
    '/',
    requireRole('SUPER_ADMIN'),
    deviceModelController.create
);

/**
 * @swagger
 * /device-models/{id}:
 *   put:
 *     tags: [Device Models]
 *     summary: Update device model
 *     description: Update device model (SUPER_ADMIN only)
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
 *         description: Model updated
 */
router.put(
    '/:id',
    requireRole('SUPER_ADMIN'),
    deviceModelController.update
);

/**
 * @swagger
 * /device-models/{id}:
 *   delete:
 *     tags: [Device Models]
 *     summary: Delete device model
 *     description: Delete device model (SUPER_ADMIN only)
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
 *         description: Model deleted
 */
router.delete(
    '/:id',
    requireRole('SUPER_ADMIN'),
    deviceModelController.remove
);

export default router;
