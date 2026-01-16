import { Router } from 'express';
import * as orgController from '../controllers/organization.controller';
import { requireSuperAdmin } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * @swagger
 * /organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: Get all organizations
 *     description: Get all organizations (filtered by org for non-super-admins)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/', orgController.getAll);

/**
 * @swagger
 * /organizations/stats/overview:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization statistics
 *     description: Get overview of organization counts
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Organization statistics
 */
router.get('/stats/overview', requireSuperAdmin, orgController.getStats);

/**
 * @swagger
 * /organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization by ID
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
 *         description: Organization details
 */
router.get('/:id', orgController.getById);

/**
 * @swagger
 * /organizations/{id}/structure:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization structure
 *     description: Get full organization structure with events and departments
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
 *         description: Organization structure
 */
router.get('/:id/structure', orgController.getStructure);

/**
 * @swagger
 * /organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create organization
 *     description: Create new organization (Super Admin only)
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
 *         description: Organization created
 */
router.post('/', requireSuperAdmin, orgController.create);

/**
 * @swagger
 * /organizations/{id}:
 *   put:
 *     tags: [Organizations]
 *     summary: Update organization
 *     description: Update organization (Super Admin only)
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
 *         description: Organization updated
 */
router.put('/:id', requireSuperAdmin, orgController.update);

/**
 * @swagger
 * /organizations/{id}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Delete organization
 *     description: Delete organization (Super Admin only)
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
 *         description: Organization deleted
 */
router.delete('/:id', requireSuperAdmin, orgController.remove);

export default router;
