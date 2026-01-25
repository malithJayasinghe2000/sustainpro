import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { requireSuperAdmin, authenticateToken, requirePermission } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * @swagger
 * /services:
 *   get:
 *     tags: [Services]
 *     summary: Get service templates
 *     description: Get all service templates
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Service templates
 */
// Requires services.view permission
router.get('/my/services', authenticateToken, serviceController.getMyServices);
router.get('/', requirePermission('services.view'), serviceController.getAll);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     tags: [Services]
 *     summary: Get service template
 *     description: Get service template by ID
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
router.get('/:id', requirePermission('services.view'), serviceController.getById);

/**
 * @swagger
 * /services:
 *   post:
 *     tags: [Services]
 *     summary: Create service template
 *     description: Create new service template
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Service created
 */
router.post('/', requirePermission('services.create'), serviceController.create);

/**
 * @swagger
 * /services/{id}:
 *   put:
 *     tags: [Services]
 *     summary: Update service template
 *     description: Update service template
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
router.put('/:id', requirePermission('services.update'), serviceController.update);

/**
 * @swagger
 * /services/{id}:
 *   delete:
 *     tags: [Services]
 *     summary: Delete service template
 *     description: Delete service template
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
router.delete('/:id', requirePermission('services.delete'), serviceController.remove);


/**
 * @swagger
 * /services/{id}/dashboards/{type}:
 *   get:
 *     tags: [Services]
 *     summary: Get dashboard layout
 *     description: Get specific dashboard layout (device, service, or public)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [device, service, public]
 *     responses:
 *       200:
 *         description: Dashboard layout
 */
router.get('/:id/dashboards/:type', authenticateToken, serviceController.getDashboard);

/**
 * @swagger
 * /services/{id}/dashboards/{type}:
 *   put:
 *     tags: [Services]
 *     summary: Update dashboard layout
 *     description: Update specific dashboard layout (Super Admin for all, Service Supervisor for public only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [device, service, public]
 *     responses:
 *       200:
 *         description: Dashboard updated
 */
router.put('/:id/dashboards/:type', authenticateToken, serviceController.updateDashboard);

/**
 * @swagger
 * /services/{id}/assign:
 *   post:
 *     tags: [Services]
 *     summary: Assign service to department
 *     description: Assign a service template to a department
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Service assigned
 */
router.post('/:id/assign', authenticateToken, serviceController.assignToDepartment);

export default router;
