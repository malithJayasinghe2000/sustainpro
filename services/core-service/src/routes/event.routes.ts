import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { requireMinRole } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * GET /api/v1/events
 * Get all events (Super Admin only)
 */
router.get('/', eventController.getAll);

/**
 * GET /api/v1/events/by-org/:orgId
 * Get events by organization
 */
router.get('/by-org/:orgId', eventController.getByOrganization);

/**
 * GET /api/v1/events/:id
 * Get event by ID
 */
router.get('/:id', eventController.getById);

/**
 * GET /api/v1/events/:id/details
 * Get event with full details (departments, services)
 */
router.get('/:id/details', eventController.getDetails);

/**
 * POST /api/v1/events
 * Create new event (ORG_ADMIN or higher)
 */
router.post('/', requireMinRole('ORG_ADMIN'), eventController.create);

/**
 * PUT /api/v1/events/:id
 * Update event (ORG_ADMIN or higher)
 */
router.put('/:id', requireMinRole('ORG_ADMIN'), eventController.update);

/**
 * DELETE /api/v1/events/:id
 * Delete event (ORG_ADMIN or higher)
 */
router.delete('/:id', requireMinRole('ORG_ADMIN'), eventController.remove);

/**
 * POST /api/v1/events/:id/start
 * Start event (change status to ACTIVE)
 */
router.post('/:id/start', requireMinRole('ORG_ADMIN'), eventController.start);

/**
 * POST /api/v1/events/:id/stop
 * Stop event (change status to PAUSED)
 */
router.post('/:id/stop', requireMinRole('ORG_ADMIN'), eventController.stop);

/**
 * POST /api/v1/events/:id/archive
 * Archive event
 */
router.post('/:id/archive', requireMinRole('ORG_ADMIN'), eventController.archive);

export default router;
