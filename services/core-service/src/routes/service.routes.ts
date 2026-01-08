import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { requireSuperAdmin } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * @swagger
 * /services:
 *   get:
 *     tags: [Services]
 *     summary: Get service templates
 *     description: Get all service templates (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Service templates
 */
router.get('/', requireSuperAdmin, serviceController.getAll);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     tags: [Services]
 *     summary: Get service template
 *     description: Get service template by ID (Super Admin only)
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
 *         description: Service template
 */
router.get('/:id', requireSuperAdmin, serviceController.getById);

/**
 * @swagger
 * /services:
 *   post:
 *     tags: [Services]
 *     summary: Create service template
 *     description: Create new service template (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Service created
 */
router.post('/', requireSuperAdmin, serviceController.create);

/**
 * @swagger
 * /services/{id}:
 *   put:
 *     tags: [Services]
 *     summary: Update service template
 *     description: Update service template (Super Admin only)
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
 *         description: Service updated
 */
router.put('/:id', requireSuperAdmin, serviceController.update);

/**
 * @swagger
 * /services/{id}:
 *   delete:
 *     tags: [Services]
 *     summary: Delete service template
 *     description: Delete service template (Super Admin only)
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
 *         description: Service deleted
 */
router.delete('/:id', requireSuperAdmin, serviceController.remove);

export default router;
