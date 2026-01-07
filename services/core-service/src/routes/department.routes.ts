import { Router } from 'express';
import * as deptController from '../controllers/department.controller';
import { requireMinRole } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * GET /api/v1/departments/by-event/:eventId
 * Get departments by event
 */
router.get('/by-event/:eventId', deptController.getByEvent);

/**
 * GET /api/v1/departments/:id
 * Get department by ID
 */
router.get('/:id', deptController.getById);

/**
 * GET /api/v1/departments/:id/services
 * Get services in department
 */
router.get('/:id/services', deptController.getServices);

/**
 * GET /api/v1/departments/:id/full
 * Get department with all services
 */
router.get('/:id/full', deptController.getWithServices);

/**
 * POST /api/v1/departments
 * Create new department
 */
router.post('/', requireMinRole('ORG_ADMIN'), deptController.create);

/**
 * PUT /api/v1/departments/:id
 * Update department
 */
router.put('/:id', requireMinRole('ORG_ADMIN'), deptController.update);

/**
 * DELETE /api/v1/departments/:id
 * Delete department
 */
router.delete('/:id', requireMinRole('ORG_ADMIN'), deptController.remove);

/**
 * POST /api/v1/departments/:id/services
 * Add service to department
 */
router.post('/:id/services', requireMinRole('ORG_ADMIN'), deptController.addService);

/**
 * DELETE /api/v1/departments/:id/services/:serviceId
 * Remove service from department
 */
router.delete('/:id/services/:serviceId', requireMinRole('ORG_ADMIN'), deptController.removeService);

export default router;
