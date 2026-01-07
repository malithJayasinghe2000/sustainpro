import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { requireSuperAdmin } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * GET /api/v1/services
 * Get all service templates (Super Admin only)
 */
router.get('/', requireSuperAdmin, serviceController.getAll);

/**
 * GET /api/v1/services/:id
 * Get service template by ID (Super Admin only)
 */
router.get('/:id', requireSuperAdmin, serviceController.getById);

/**
 * POST /api/v1/services
 * Create new service template (Super Admin only)
 */
router.post('/', requireSuperAdmin, serviceController.create);

/**
 * PUT /api/v1/services/:id
 * Update service template (Super Admin only)
 */
router.put('/:id', requireSuperAdmin, serviceController.update);

/**
 * DELETE /api/v1/services/:id
 * Delete service template (Super Admin only)
 */
router.delete('/:id', requireSuperAdmin, serviceController.remove);

export default router;
