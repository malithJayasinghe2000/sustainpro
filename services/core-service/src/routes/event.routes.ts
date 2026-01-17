import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { requireMinRole, requirePermission, requireAnyPermission } from '@sustainpro/shared-middleware';

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
 *     description: Create new event (permission events.create)
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
router.post('/', requirePermission('events.create'), eventController.create);

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     tags: [Events]
 *     summary: Update event
 *     description: "Update event (permission: events.update or events.status)"
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
router.put('/:id', requireAnyPermission('events.update', 'events.status'), eventController.update);

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete event
 *     description: Delete event (permission events.delete)
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
router.delete('/:id', requirePermission('events.delete'), eventController.remove);

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
router.post('/:id/start', requireAnyPermission('events.update', 'events.status'), eventController.start);

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
router.post('/:id/stop', requireAnyPermission('events.update', 'events.status'), eventController.stop);

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
router.post('/:id/archive', requireAnyPermission('events.update', 'events.status'), eventController.archive);

/**
 * @swagger
 * /events/{id}/request-end:
 *   post:
 *     tags: [Events]
 *     summary: Request to end event
 *     description: Request to end an event (for event managers who cannot directly end)
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
 *         description: End request submitted
 */
router.post('/:id/request-end', requirePermission('events.endrequest'), eventController.requestEnd);

/**
 * @swagger
 * /events/{id}/end:
 *   post:
 *     tags: [Events]
 *     summary: End event immediately
 *     description: End an event immediately (for org admins and super admins)
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
 *         description: Event ended
 */
router.post('/:id/end', requirePermission('events.end'), eventController.endEvent);

/**
 * @swagger
 * /events/{id}/request-delete:
 *   post:
 *     tags: [Events]
 *     summary: Request to delete event
 *     description: Request to delete an event (for event managers)
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
 *         description: Delete request submitted
 */
router.post('/:id/request-delete', requirePermission('events.deleterequest'), eventController.requestDelete);

export default router;
