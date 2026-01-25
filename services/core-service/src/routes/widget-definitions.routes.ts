import { Router } from 'express';
import * as widgetController from '../controllers/widget-definitions.controller';
import { authenticateToken, requireRole } from '@sustainpro/shared-middleware';

const router = Router();

// =============================================
// WIDGET CATEGORIES
// =============================================

/**
 * @swagger
 * /widget-definitions/categories:
 *   get:
 *     summary: Get all widget categories
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of widget categories
 */
router.get('/categories', widgetController.getCategories);

/**
 * @swagger
 * /widget-definitions/categories:
 *   post:
 *     summary: Create a widget category
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               color:
 *                 type: string
 *               sort_order:
 *                 type: number
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/categories', requireRole('SUPER_ADMIN'), widgetController.createCategory);

/**
 * @swagger
 * /widget-definitions/categories/{id}:
 *   put:
 *     summary: Update a widget category
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/categories/:id', requireRole('SUPER_ADMIN'), widgetController.updateCategory);

/**
 * @swagger
 * /widget-definitions/categories/{id}:
 *   delete:
 *     summary: Delete a widget category
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 */
router.delete('/categories/:id', requireRole('SUPER_ADMIN'), widgetController.deleteCategory);

// =============================================
// WIDGET DEFINITIONS
// =============================================

/**
 * @swagger
 * /widget-definitions:
 *   get:
 *     summary: Get all widget definitions
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: render_type
 *         schema:
 *           type: string
 *         description: Filter by render type
 *       - in: query
 *         name: include_system
 *         schema:
 *           type: boolean
 *         description: Include system widgets
 *       - in: query
 *         name: include_deprecated
 *         schema:
 *           type: boolean
 *         description: Include deprecated widgets
 *     responses:
 *       200:
 *         description: List of widget definitions
 */
router.get('/', widgetController.getDefinitions);

/**
 * @swagger
 * /widget-definitions/render-types:
 *   get:
 *     summary: Get available render types with their defaults
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of render types
 */
router.get('/render-types', widgetController.getRenderTypes);

/**
 * @swagger
 * /widget-definitions/{id}:
 *   get:
 *     summary: Get a widget definition by ID
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget definition
 */
router.get('/:id', widgetController.getDefinition);

/**
 * @swagger
 * /widget-definitions:
 *   post:
 *     summary: Create a widget definition
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - category_id
 *               - render_type
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category_id:
 *                 type: string
 *               render_type:
 *                 type: string
 *               default_width:
 *                 type: number
 *               default_height:
 *                 type: number
 *               parameter_slots:
 *                 type: array
 *               settings_schema:
 *                 type: object
 *               default_settings:
 *                 type: object
 *               style_conditions:
 *                 type: array
 *     responses:
 *       201:
 *         description: Widget definition created
 */
router.post('/', requireRole('SUPER_ADMIN'), widgetController.createDefinition);

/**
 * @swagger
 * /widget-definitions/{id}:
 *   put:
 *     summary: Update a widget definition
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget definition updated
 */
router.put('/:id', requireRole('SUPER_ADMIN'), widgetController.updateDefinition);

/**
 * @swagger
 * /widget-definitions/{id}:
 *   delete:
 *     summary: Delete a widget definition (soft delete)
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget definition deleted
 */
router.delete('/:id', requireRole('SUPER_ADMIN'), widgetController.deleteDefinition);

/**
 * @swagger
 * /widget-definitions/{id}/duplicate:
 *   post:
 *     summary: Duplicate a widget definition
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Widget definition duplicated
 */
router.post('/:id/duplicate', requireRole('SUPER_ADMIN'), widgetController.duplicateDefinition);

// =============================================
// WIDGET PRESETS
// =============================================

/**
 * @swagger
 * /widget-definitions/{definitionId}/presets:
 *   get:
 *     summary: Get presets for a widget definition
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: definitionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of presets
 */
router.get('/:definitionId/presets', widgetController.getPresets);

/**
 * @swagger
 * /widget-definitions/{definitionId}/presets:
 *   post:
 *     summary: Create a preset for a widget definition
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: definitionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Preset created
 */
router.post('/:definitionId/presets', requireRole('SUPER_ADMIN'), widgetController.createPreset);

/**
 * @swagger
 * /widget-definitions/presets/{id}:
 *   put:
 *     summary: Update a widget preset
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Preset updated
 */
router.put('/presets/:id', requireRole('SUPER_ADMIN'), widgetController.updatePreset);

/**
 * @swagger
 * /widget-definitions/presets/{id}:
 *   delete:
 *     summary: Delete a widget preset
 *     tags: [Widget Definitions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Preset deleted
 */
router.delete('/presets/:id', requireRole('SUPER_ADMIN'), widgetController.deletePreset);

export default router;
