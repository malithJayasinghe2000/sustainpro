import { Router } from 'express';
import * as orgController from '../controllers/organization.controller';
import { requireSuperAdmin } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * GET /api/v1/organizations
 * Get all organizations (filtered by org for non-super-admins)
 */
router.get('/', orgController.getAll);

/**
 * GET /api/v1/organizations/:id
 * Get organization by ID
 */
router.get('/:id', orgController.getById);

/**
 * GET /api/v1/organizations/:id/structure
 * Get full organization structure with events and departments
 */
router.get('/:id/structure', orgController.getStructure);

/**
 * POST /api/v1/organizations
 * Create new organization (Super Admin only)
 */
router.post('/', requireSuperAdmin, orgController.create);

/**
 * PUT /api/v1/organizations/:id
 * Update organization (Super Admin only)
 */
router.put('/:id', requireSuperAdmin, orgController.update);

/**
 * DELETE /api/v1/organizations/:id
 * Delete organization (Super Admin only)
 */
router.delete('/:id', requireSuperAdmin, orgController.remove);

export default router;
