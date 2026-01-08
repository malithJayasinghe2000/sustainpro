import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { requireMinRole } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * @swagger
 * /events:
 *   get:
 *     tags: [Events]
 *     summary: Get all events
 *     description: Get all events (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of events
 */
router.get('/', eventController.getAll);

/**
 * @swagger
 * /events/by-org/{orgId}:
 *   get:
 *     tags: [Events]
 *     summary: Get events by organization
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
 *         description: Organization events
 */
router.get('/by-org/:orgId', eventController.getByOrganization);

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Get event by ID
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
 *         description: Event details
 */
router.get('/:id', eventController.getById);

/**
 * @swagger
 * /events/{id}/details:
 *   get:
 *     tags: [Events]
 *     summary: Get event details
 *     description: Get event with full details (departments, services)
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
 *         description: Event full details
 */
router.get('/:id/details', eventController.getDetails);

/**
 * @swagger
 * /events:
 *   post:
 *     tags: [Events]
 *     summary: Create event
 *     description: Create new event (ORG_ADMIN or higher)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Event created
 */
router.post('/', requireMinRole('ORG_ADMIN'), eventController.create);

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     tags: [Events]
 *     summary: Update event
 *     description: Update event (ORG_ADMIN or higher)
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
 *         description: Event updated
 */
router.put('/:id', requireMinRole('ORG_ADMIN'), eventController.update);

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete event
 *     description: Delete event (ORG_ADMIN or higher)
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
 *         description: Event deleted
 */
router.delete('/:id', requireMinRole('ORG_ADMIN'), eventController.remove);

/**
 * @swagger
 * /events/{id}/start:
 *   post:
 *     tags: [Events]
 *     summary: Start event
 *     description: Start event (change status to ACTIVE)
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
 *         description: Event started
 */
router.post('/:id/start', requireMinRole('ORG_ADMIN'), eventController.start);

/**
 * @swagger
 * /events/{id}/stop:
 *   post:
 *     tags: [Events]
 *     summary: Stop event
 *     description: Stop event (change status to PAUSED)
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
 *         description: Event stopped
 */
router.post('/:id/stop', requireMinRole('ORG_ADMIN'), eventController.stop);

/**
 * @swagger
 * /events/{id}/archive:
 *   post:
 *     tags: [Events]
 *     summary: Archive event
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
 *         description: Event archived
 */
router.post('/:id/archive', requireMinRole('ORG_ADMIN'), eventController.archive);

export default router;
