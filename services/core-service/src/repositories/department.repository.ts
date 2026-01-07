import { query } from '../db';
import { Department, CreateDepartmentDto } from '@sustainpro/shared-types';

export interface DepartmentWithServices extends Department {
    services_count?: number;
    services?: any[];
}

export class DepartmentRepository {
    /**
     * Get departments by event
     */
    async findByEvent(eventId: string): Promise<DepartmentWithServices[]> {
        const result = await query<DepartmentWithServices>(
            `SELECT d.*,
                COUNT(ds.id)::int as services_count
             FROM sps_departments d
             LEFT JOIN sps_department_services ds ON d.id = ds.department_id
             WHERE d.event_id = $1
             GROUP BY d.id
             ORDER BY d.created_at DESC`,
            [eventId]
        );
        return result.rows;
    }

    /**
     * Get department by ID
     */
    async findById(id: string): Promise<DepartmentWithServices | null> {
        const result = await query<DepartmentWithServices>(
            `SELECT d.*,
                (SELECT COUNT(*)::int FROM sps_department_services ds WHERE ds.department_id = d.id) as services_count
             FROM sps_departments d
             WHERE d.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create department
     */
    async create(data: CreateDepartmentDto & {
        description?: string;
        icon?: string;
        color?: string;
        template_origin_id?: string;
    }): Promise<Department> {
        const result = await query<Department>(
            `INSERT INTO sps_departments (
                event_id, name, head_user_id, description, icon, color, template_origin_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                data.event_id,
                data.name,
                data.head_user_id || null,
                data.description || null,
                data.icon || 'Layers',
                data.color || '#3B82F6',
                data.template_origin_id || null,
            ]
        );
        return result.rows[0];
    }

    /**
     * Update department
     */
    async update(id: string, data: Partial<Department> & {
        description?: string;
        icon?: string;
        color?: string;
    }): Promise<Department | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.head_user_id !== undefined) {
            fields.push(`head_user_id = $${paramIndex++}`);
            values.push(data.head_user_id);
        }
        if ((data as any).description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push((data as any).description);
        }
        if ((data as any).icon !== undefined) {
            fields.push(`icon = $${paramIndex++}`);
            values.push((data as any).icon);
        }
        if ((data as any).color !== undefined) {
            fields.push(`color = $${paramIndex++}`);
            values.push((data as any).color);
        }

        if (fields.length === 0) return this.findById(id);

        values.push(id);

        const result = await query<Department>(
            `UPDATE sps_departments SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    /**
     * Delete department
     */
    async delete(id: string): Promise<boolean> {
        const result = await query('DELETE FROM sps_departments WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Check if template already exists in event
     */
    async templateExistsInEvent(eventId: string, templateId: string): Promise<boolean> {
        const result = await query(
            `SELECT id FROM sps_departments WHERE event_id = $1 AND template_origin_id = $2`,
            [eventId, templateId]
        );
        return result.rows.length > 0;
    }

    /**
     * Get department with services
     */
    async getWithServices(id: string): Promise<DepartmentWithServices | null> {
        const dept = await this.findById(id);
        if (!dept) return null;

        const servicesResult = await query(
            `SELECT ds.*, st.name as template_name, st.description as template_description
             FROM sps_department_services ds
             LEFT JOIN sps_service_templates st ON ds.service_template_id = st.id
             WHERE ds.department_id = $1
             ORDER BY ds.created_at`,
            [id]
        );

        return { ...dept, services: servicesResult.rows };
    }
}
