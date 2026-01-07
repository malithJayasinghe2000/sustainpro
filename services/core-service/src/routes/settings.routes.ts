import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { authenticateToken, requireSuperAdmin } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * GET /api/v1/settings/public
 * Get public settings (no auth required)
 */
router.get('/public', settingsController.getPublic);

/**
 * GET /api/v1/settings/security
 * Get security settings for login page (no auth required)
 */
router.get('/security', settingsController.getSecurity);

/**
 * GET /api/v1/settings
 * Get full system settings (requires auth)
 */
router.get('/', authenticateToken, settingsController.get);

/**
 * PUT /api/v1/settings
 * Update system settings (Super Admin only)
 */
router.put('/', authenticateToken, requireSuperAdmin, settingsController.update);

export default router;
