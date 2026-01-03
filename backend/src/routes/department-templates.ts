import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Protect all routes
router.use(authenticateToken);

// ============================================
// GET /api/v1/department-templates
// Get all department templates for user's organization
// ============================================
router.get('/', async (req: Request, res: Response) => {
    try {
        const user = req.user as any;

        // Super Admins can filter by organization
        const targetOrgId = user.isSuperAdmin && req.query.organization_id
            ? req.query.organization_id
            : user.organization_id;

        // Fetch templates: Global (org_id = NULL) + Org-specific
        const result = await query(
            `SELECT * FROM sps_department_templates 
             WHERE (organization_id IS NULL OR organization_id = $1) 
             AND is_active = true 
             ORDER BY organization_id NULLS FIRST, name ASC`,
            [targetOrgId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching department templates:', error);
        res.status(500).json({ error: 'Failed to fetch department templates' });
    }
});

// ============================================
// GET /api/v1/department-templates/:id
// Get a specific department template
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as any;

        const result = await query(
            `SELECT * FROM sps_department_templates WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = result.rows[0];

        // Permission check
        if (!user.isSuperAdmin && template.organization_id !== user.organization_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

// ============================================
// POST /api/v1/department-templates
// Create a new department template
// ============================================
router.post('/', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const {
            name,
            description,
            icon,
            color,
            suggested_services,
            required_roles
        } = req.body;
        const user = req.user as any;

        // Debug: Inspect user object
        console.log('DEBUG: User object in POST /department-templates:', {
            isSuperAdmin: user.isSuperAdmin,
            organization_id: user.organization_id,
            hasOrgId: !!user.organization_id,
            userKeys: Object.keys(user)
        });

        // Validation
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Determine target organization
        // Super Admins can create global templates (organization_id = NULL) or org-specific
        // Standard users create for their organization only
        let targetOrgId = null;

        if (user.isSuperAdmin) {
            // Super Admin: use provided org_id, or NULL for global template
            targetOrgId = req.body.organization_id || null;
        } else if (user.organization_id) {
            // Standard user: must use their organization
            targetOrgId = user.organization_id;
        } else {
            // User has no organization - cannot create template
            return res.status(400).json({
                error: 'Your account must be associated with an organization to create templates.'
            });
        }

        // Check for duplicate name
        // Global templates (org_id = NULL): Check against other global templates
        // Org-specific: Check against same org's templates
        const duplicateCheckQuery = targetOrgId
            ? `SELECT id FROM sps_department_templates 
               WHERE organization_id = $1 AND LOWER(name) = LOWER($2)`
            : `SELECT id FROM sps_department_templates 
               WHERE organization_id IS NULL AND LOWER(name) = LOWER($1)`;

        const duplicateCheckParams = targetOrgId ? [targetOrgId, name] : [name];
        const existingCheck = await query(duplicateCheckQuery, duplicateCheckParams);

        if (existingCheck.rows.length > 0) {
            return res.status(400).json({
                error: targetOrgId
                    ? 'A template with this name already exists in your organization'
                    : 'A global template with this name already exists'
            });
        }

        const result = await query(
            `INSERT INTO sps_department_templates 
             (organization_id, name, description, icon, color, suggested_services, required_roles)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                targetOrgId,
                name,
                description || null,
                icon || null,
                color || null,
                JSON.stringify(suggested_services || []),
                JSON.stringify(required_roles || [])
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error creating template:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Template name must be unique within organization' });
        }
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// ============================================
// PUT /api/v1/department-templates/:id
// Update a department template
// ============================================
router.put('/:id', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            icon,
            color,
            suggested_services,
            required_roles
        } = req.body;
        const user = req.user as any;

        // Check ownership
        const templateCheck = await query(
            `SELECT organization_id FROM sps_department_templates WHERE id = $1`,
            [id]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (!user.isSuperAdmin && templateCheck.rows[0].organization_id !== user.organization_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await query(
            `UPDATE sps_department_templates 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 icon = COALESCE($3, icon),
                 color = COALESCE($4, color),
                 suggested_services = COALESCE($5, suggested_services),
                 required_roles = COALESCE($6, required_roles),
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                name,
                description,
                icon,
                color,
                suggested_services ? JSON.stringify(suggested_services) : null,
                required_roles ? JSON.stringify(required_roles) : null,
                id
            ]
        );

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating template:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Template name must be unique within organization' });
        }
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// ============================================
// DELETE /api/v1/department-templates/:id
// Delete (soft delete) a department template
// ============================================
router.delete('/:id', requireRole('ORG_ADMIN'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as any;

        // Check ownership
        const templateCheck = await query(
            `SELECT organization_id FROM sps_department_templates WHERE id = $1`,
            [id]
        );

        if (templateCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (!user.isSuperAdmin && templateCheck.rows[0].organization_id !== user.organization_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Soft delete
        await query(
            `UPDATE sps_department_templates SET is_active = false WHERE id = $1`,
            [id]
        );

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

export default router;
