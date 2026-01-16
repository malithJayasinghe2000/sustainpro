import { Router } from 'express';
import * as auditLogController from '../controllers/audit-log.controller';
import { requirePermission } from '@sustainpro/shared-middleware';

const router = Router();

// Note: authenticateToken is already applied at app.ts level for this route

// Get list of categories (for filter dropdown) - requires view permission
router.get('/categories', requirePermission('audit.view'), auditLogController.getCategories);

// Get audit log statistics
router.get('/stats', requirePermission('audit.view'), auditLogController.getStats);

// Export audit logs to CSV - requires export permission
router.get('/export', requirePermission('audit.export'), auditLogController.exportCSV);

// Get user activity (audit logs for specific user)
router.get('/user/:userId', requirePermission('audit.view'), auditLogController.getUserActivity);

// Get single audit log by ID
router.get('/:id', requirePermission('audit.view'), auditLogController.getById);

// Get all audit logs with filtering and pagination
router.get('/', requirePermission('audit.view'), auditLogController.getAll);

export default router;

