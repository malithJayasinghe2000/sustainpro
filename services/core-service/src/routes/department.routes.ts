import { Router } from 'express';
import * as deptController from '../controllers/department.controller';
import { requireMinRole } from '@sustainpro/shared-middleware';

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
router.get('/by-event/:eventId', deptController.getByEvent);

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
router.get('/:id', deptController.getById);

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
router.get('/:id/services', deptController.getServices);

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
router.get('/:id/full', deptController.getWithServices);

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
router.post('/', requireMinRole('ORG_ADMIN'), deptController.create);

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
router.put('/:id', requireMinRole('ORG_ADMIN'), deptController.update);

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
router.delete('/:id', requireMinRole('ORG_ADMIN'), deptController.remove);

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
router.post('/:id/services', requireMinRole('EVENT_MANAGER'), deptController.addService);

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
router.delete('/:id/services/:serviceId', requireMinRole('EVENT_MANAGER'), deptController.removeService);

export default router;
