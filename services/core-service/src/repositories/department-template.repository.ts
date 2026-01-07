import pool from '../db';

export interface DepartmentTemplate {
    id: string;
    organization_id: string | null;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    suggested_services: any[];
    required_roles: string[];
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateDepartmentTemplateInput {
    organization_id?: string | null;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    suggested_services?: any[];
    required_roles?: string[];
}

export interface UpdateDepartmentTemplateInput {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    suggested_services?: any[];
    required_roles?: string[];
    is_active?: boolean;
}

export class DepartmentTemplateRepository {
    async findAll(organizationId?: string): Promise<DepartmentTemplate[]> {
        const result = await pool.query(
            `SELECT * FROM sps_department_templates 
             WHERE (organization_id IS NULL OR organization_id = $1) 
             AND is_active = true 
             ORDER BY organization_id NULLS FIRST, name ASC`,
            [organizationId]
        );
        return result.rows;
    }

    async findById(id: string): Promise<DepartmentTemplate | null> {
        const result = await pool.query(
            'SELECT * FROM sps_department_templates WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async findByName(name: string, organizationId?: string | null): Promise<DepartmentTemplate | null> {
        if (organizationId) {
            const result = await pool.query(
                `SELECT * FROM sps_department_templates 
                 WHERE organization_id = $1 AND LOWER(name) = LOWER($2)`,
                [organizationId, name]
            );
            return result.rows[0] || null;
        } else {
            const result = await pool.query(
                `SELECT * FROM sps_department_templates 
                 WHERE organization_id IS NULL AND LOWER(name) = LOWER($1)`,
                [name]
            );
            return result.rows[0] || null;
        }
    }

    async create(data: CreateDepartmentTemplateInput): Promise<DepartmentTemplate> {
        const result = await pool.query(
            `INSERT INTO sps_department_templates 
             (organization_id, name, description, icon, color, suggested_services, required_roles)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                data.organization_id || null,
                data.name,
                data.description || null,
                data.icon || null,
                data.color || null,
                JSON.stringify(data.suggested_services || []),
                JSON.stringify(data.required_roles || []),
            ]
        );
        return result.rows[0];
    }

    async update(id: string, data: UpdateDepartmentTemplateInput): Promise<DepartmentTemplate> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(data.description);
        }
        if (data.icon !== undefined) {
            fields.push(`icon = $${paramIndex++}`);
            values.push(data.icon);
        }
        if (data.color !== undefined) {
            fields.push(`color = $${paramIndex++}`);
            values.push(data.color);
        }
        if (data.suggested_services !== undefined) {
            fields.push(`suggested_services = $${paramIndex++}`);
            values.push(JSON.stringify(data.suggested_services));
        }
        if (data.required_roles !== undefined) {
            fields.push(`required_roles = $${paramIndex++}`);
            values.push(JSON.stringify(data.required_roles));
        }
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${paramIndex++}`);
            values.push(data.is_active);
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
            `UPDATE sps_department_templates SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    async delete(id: string): Promise<void> {
        // Soft delete
        await pool.query(
            'UPDATE sps_department_templates SET is_active = false, updated_at = NOW() WHERE id = $1',
            [id]
        );
    }
}
