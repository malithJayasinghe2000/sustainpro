/**
 * RBAC Routes
 * Role-Based Access Control management endpoints
 * 
 * Note: Permissions are managed via seed file, not via API.
 * This is a best practice because:
 * 1. Permissions are tied to code (routes use requirePermission('xxx'))
 * 2. Adding a new permission requires backend code changes anyway
 * 3. Seed ensures consistent permissions across environments
 * 
 * The API only allows:
 * - Viewing all permissions (for UI)
 * - Assigning/removing permissions to/from roles (role-permission mapping)
 */

import { Router } from 'express';
import { authenticateToken, requireSuperAdmin } from '@sustainpro/shared-middleware';
import * as rbacController from '../controllers/rbac.controller';

const router = Router();

// All RBAC routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /rbac/permissions:
 *   get:
 *     tags: [RBAC]
 *     summary: Get all permissions
 *     description: Get list of all available permissions (defined in seed)
 *     security:
 *       - BearerAuth: []
 */
router.get('/permissions', rbacController.getPermissions);

/**
 * @swagger
 * /rbac/permissions/grouped:
 *   get:
 *     tags: [RBAC]
 *     summary: Get permissions grouped by category
 *     description: Get permissions organized by module/category
 *     security:
 *       - BearerAuth: []
 */
router.get('/permissions/grouped', rbacController.getPermissionsGrouped);

/**
 * @swagger
 * /rbac/mappings:
 *   get:
 *     tags: [RBAC]
 *     summary: Get role-permission mappings
 *     description: Get all role-permission mappings (Super Admin only)
 *     security:
 *       - BearerAuth: []
 */
router.get('/mappings', requireSuperAdmin, rbacController.getMappings);

/**
 * @swagger
 * /rbac/mappings:
 *   post:
 *     tags: [RBAC]
 *     summary: Update role permissions
 *     description: Update permissions for a role (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, permissions]
 *             properties:
 *               role:
 *                 type: string
 *                 description: Role code (e.g., 'ORG_ADMIN')
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permission codes
 */
router.post('/mappings', requireSuperAdmin, rbacController.updateMapping);

/**
 * @swagger
 * /rbac/user/{userId}/permissions:
 *   get:
 *     tags: [RBAC]
 *     summary: Get user's effective permissions
 *     description: Get all permissions a user has based on their roles (Super Admin only)
 *     security:
 *       - BearerAuth: []
 */
router.get('/user/:userId/permissions', requireSuperAdmin, rbacController.getUserPermissions);

/**
 * @swagger
 * /rbac/my-permissions:
 *   get:
 *     tags: [RBAC]
 *     summary: Get current user's permissions
 *     description: Get all permissions for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of permission codes
 */
router.get('/my-permissions', rbacController.getMyPermissions);

export default router;
