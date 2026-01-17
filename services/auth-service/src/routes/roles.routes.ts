/**
 * Role Routes
 * Role management endpoints
 * 
 * NOTE: Roles are managed through the seed file (packages/shared-database/prisma/seed.ts)
 * This API only provides read access and display property updates for system roles.
 */

import { Router } from 'express';
import { authenticateToken } from '@sustainpro/shared-middleware';
import * as roleController from '../controllers/role.controller';

const router = Router();

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all available roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignable
 *         schema:
 *           type: boolean
 *         description: If true, only returns roles the current user can assign based on hierarchy
 */
router.get('/', authenticateToken, roleController.getAll);

/**
 * @swagger
 * /roles/{code}:
 *   get:
 *     summary: Get role by code
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:code', authenticateToken, roleController.getByCode);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Update a role's display properties
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     description: Super Admin only. Update display properties like name, description, icon, color.
 */
router.put('/:id', authenticateToken, roleController.update);

export default router;
