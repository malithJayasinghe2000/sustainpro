import { Router } from 'express';
import { requireRole } from '@sustainpro/shared-middleware';
import * as departmentTemplateController from '../controllers/department-template.controller';

const router = Router();

/**
 * @swagger
 * /department-templates:
 *   get:
 *     tags: [Department Templates]
 *     summary: Get all department templates
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of department templates
 */
router.get('/', departmentTemplateController.getAll);

/**
 * @swagger
 * /department-templates/{id}:
 *   get:
 *     tags: [Department Templates]
 *     summary: Get specific template
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
 *         description: Template details
 */
router.get('/:id', departmentTemplateController.getById);

/**
 * @swagger
 * /department-templates:
 *   post:
 *     tags: [Department Templates]
 *     summary: Create template (ORG_ADMIN+)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Template created
 */
router.post(
    '/',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    departmentTemplateController.create
);

/**
 * @swagger
 * /department-templates/{id}:
 *   put:
 *     tags: [Department Templates]
 *     summary: Update template (ORG_ADMIN+)
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
 *         description: Template updated
 */
router.put(
    '/:id',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    departmentTemplateController.update
);

/**
 * @swagger
 * /department-templates/{id}:
 *   delete:
 *     tags: [Department Templates]
 *     summary: Delete template (ORG_ADMIN+)
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
 *         description: Template deleted
 */
router.delete(
    '/:id',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    departmentTemplateController.remove
);

export default router;
