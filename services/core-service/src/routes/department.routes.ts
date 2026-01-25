import { Router } from 'express';
import * as deptController from '../controllers/department.controller';
import { requirePermission, authenticateToken } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * @swagger
 * /departments/by-event/{eventId}:
 *   get:
 *     tags: [Departments]
 *     summary: Get departments by event
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
 *         description: Event departments
 */
router.get('/by-event/:eventId', authenticateToken, deptController.getByEvent);

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     tags: [Departments]
 *     summary: Get department by ID
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
 *         description: Department details
 */
router.get('/:id', authenticateToken, deptController.getById);

/**
 * @swagger
 * /departments/{id}/services:
 *   get:
 *     tags: [Departments]
 *     summary: Get services in department
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
 *         description: Department services
 */
router.get('/:id/services', authenticateToken, deptController.getServices);

/**
 * @swagger
 * /departments/{id}/full:
 *   get:
 *     tags: [Departments]
 *     summary: Get department with all services
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
 *         description: Full department with services
 */
router.get('/:id/full', authenticateToken, deptController.getWithServices);

/**
 * @swagger
 * /departments:
 *   post:
 *     tags: [Departments]
 *     summary: Create new department
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Department created
 */
router.post('/', requirePermission('departments.create'), deptController.create);

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     tags: [Departments]
 *     summary: Update department
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
 *         description: Department updated
 */
router.put('/:id', requirePermission('departments.update'), deptController.update);

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     tags: [Departments]
 *     summary: Delete department
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Department deleted
 */
router.delete('/:id', requirePermission('departments.delete'), deptController.remove);

/**
 * @swagger
 * /departments/{id}/services:
 *   post:
 *     tags: [Departments]
 *     summary: Add service to department
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
 *         description: Service added
 */
router.post('/:id/services', requirePermission('services.assign'), deptController.addService);

/**
 * @swagger
 * /departments/{id}/services/{serviceId}:
 *   put:
 *     tags: [Departments]
 *     summary: Update service in department
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service updated
 */
router.put('/:id/services/:serviceId', requirePermission('services.update'), deptController.updateService);

/**
 * @swagger
 * /departments/{id}/services/{serviceId}:
 *   delete:
 *     tags: [Departments]
 *     summary: Remove service from department
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Service removed
 */
router.delete('/:id/services/:serviceId', requirePermission('services.assign'), deptController.removeService);

export default router;
