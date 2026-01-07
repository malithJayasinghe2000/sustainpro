import { query } from '../db';

export interface ServiceTemplate {
    id: string;
    name: string;
    description: string | null;
    scope: string;
    config: Record<string, any>;
    is_public_dashboard_supported: boolean;
    created_by: string;
    created_at: Date;
    device_models?: any[];
}

export interface DepartmentService {
    id: string;
    department_id: string;
    service_template_id: string;
    name: string | null;
    config: Record<string, any>;
    status: string;
    assigned_supervisor_id: string | null;
    created_at: Date;
}

export class ServiceRepository {
    /**
     * Get all service templates
     */
    async findAllTemplates(scope?: string): Promise<ServiceTemplate[]> {
        let sql = `
            SELECT st.*, 
                COALESCE(
                    json_agg(
                        json_build_object('device_model_id', sdm.device_model_id, 'role', sdm.role)
                    ) FILTER (WHERE sdm.device_model_id IS NOT NULL),
                    '[]'::json
                ) as device_models
            FROM sps_service_templates st
            LEFT JOIN sps_service_device_models sdm ON st.id = sdm.service_id
        `;
        const params: any[] = [];

        if (scope) {
            sql += ` WHERE st.scope = $1`;
            params.push(scope);
        }

        sql += ` GROUP BY st.id ORDER BY st.created_at DESC`;

        const result = await query<ServiceTemplate>(sql, params);
        return result.rows;
    }

    /**
     * Get service template by ID
     */
    async findTemplateById(id: string): Promise<ServiceTemplate | null> {
        const result = await query<ServiceTemplate>(
            `SELECT st.*,
                COALESCE(
                    (SELECT jsonb_agg(
                        jsonb_build_object(
                            'device_model_id', sdm.device_model_id, 
                            'role', sdm.role,
                            'min_count', sdm.min_count,
                            'max_count', sdm.max_count
                        )
                    ) FROM sps_service_device_models sdm WHERE sdm.service_id = st.id),
                    '[]'::jsonb
                ) as device_models
             FROM sps_service_templates st
             WHERE st.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create service template
     */
    async createTemplate(data: {
        name: string;
        description?: string;
        scope: string;
        config?: Record<string, any>;
        is_public_dashboard_supported?: boolean;
        created_by: string;
        main_dashboard_layout?: any[];
        public_dashboard_layout?: any[];
    }): Promise<ServiceTemplate> {
        const result = await query<ServiceTemplate>(
            `INSERT INTO sps_service_templates (
                name, description, scope, config, is_public_dashboard_supported, 
                created_by, main_dashboard_layout, public_dashboard_layout
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                data.name,
                data.description || null,
                data.scope,
                data.config || {},
                data.is_public_dashboard_supported || false,
                data.created_by,
                data.main_dashboard_layout || [],
                data.public_dashboard_layout || [],
            ]
        );
        return result.rows[0];
    }

    /**
     * Update service template
     */
    async updateTemplate(id: string, data: Partial<ServiceTemplate>): Promise<ServiceTemplate | null> {
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
        if (data.scope !== undefined) {
            fields.push(`scope = $${paramIndex++}`);
            values.push(data.scope);
        }
        if (data.config !== undefined) {
            fields.push(`config = $${paramIndex++}`);
            values.push(JSON.stringify(data.config));
        }

        if (fields.length === 0) return this.findTemplateById(id);

        values.push(id);

        const result = await query<ServiceTemplate>(
            `UPDATE sps_service_templates SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    /**
     * Delete service template
     */
    async deleteTemplate(id: string): Promise<boolean> {
        const result = await query('DELETE FROM sps_service_templates WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Get services by department
     */
    async findByDepartment(departmentId: string): Promise<DepartmentService[]> {
        const result = await query<DepartmentService>(
            `SELECT ds.*, st.name as template_name, st.description as template_description
             FROM sps_department_services ds
             LEFT JOIN sps_service_templates st ON ds.service_template_id = st.id
             WHERE ds.department_id = $1
             ORDER BY ds.created_at`,
            [departmentId]
        );
        return result.rows;
    }

    /**
     * Add service to department
     */
    async addToDepartment(data: {
        department_id: string;
        service_template_id: string;
        name?: string;
        config?: Record<string, any>;
        assigned_supervisor_id?: string;
    }): Promise<DepartmentService> {
        const result = await query<DepartmentService>(
            `INSERT INTO sps_department_services (
                department_id, service_template_id, name, config, status, assigned_supervisor_id
            ) VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
            RETURNING *`,
            [
                data.department_id,
                data.service_template_id,
                data.name || null,
                data.config || {},
                data.assigned_supervisor_id || null,
            ]
        );
        return result.rows[0];
    }

    /**
     * Remove service from department
     */
    async removeFromDepartment(id: string): Promise<boolean> {
        const result = await query('DELETE FROM sps_department_services WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
