import { Router } from 'express';
import { requireRole } from '@sustainpro/shared-middleware';
import * as departmentTemplateController from '../controllers/department-template.controller';

const router = Router();

// GET /department-templates - List all templates (global + org-specific)
router.get('/', departmentTemplateController.getAll);

// GET /department-templates/:id - Get specific template
router.get('/:id', departmentTemplateController.getById);

// POST /department-templates - Create template (ORG_ADMIN+)
router.post(
    '/',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    departmentTemplateController.create
);

// PUT /department-templates/:id - Update template (ORG_ADMIN+)
router.put(
    '/:id',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    departmentTemplateController.update
);

// DELETE /department-templates/:id - Delete template (ORG_ADMIN+)
router.delete(
    '/:id',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    departmentTemplateController.remove
);

export default router;
