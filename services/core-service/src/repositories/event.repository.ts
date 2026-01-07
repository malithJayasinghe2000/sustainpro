import { query } from '../db';
import { Event, CreateEventDto, UpdateEventDto } from '@sustainpro/shared-types';

export class EventRepository {
    /**
     * Get all events (for super admin)
     */
    async findAll(): Promise<Event[]> {
        const result = await query<Event>(
            `SELECT e.*, o.name as organization_name
             FROM sps_events e
             LEFT JOIN sps_organizations o ON e.organization_id = o.id
             ORDER BY e.created_at DESC`
        );
        return result.rows;
    }

    /**
     * Get events by organization
     */
    async findByOrganization(organizationId: string): Promise<Event[]> {
        const result = await query<Event>(
            `SELECT * FROM sps_events WHERE organization_id = $1 ORDER BY created_at DESC`,
            [organizationId]
        );
        return result.rows;
    }

    /**
     * Get event by ID
     */
    async findById(id: string): Promise<Event | null> {
        const result = await query<Event>(
            `SELECT e.*, o.name as organization_name
             FROM sps_events e
             LEFT JOIN sps_organizations o ON e.organization_id = o.id
             WHERE e.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create a new event
     */
    async create(data: CreateEventDto & { code: string }): Promise<Event> {
        const result = await query<Event>(
            `INSERT INTO sps_events (
                organization_id, name, location, start_date, end_date, 
                description, event_type, code, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PLANNING')
            RETURNING *`,
            [
                data.organization_id,
                data.name,
                data.location || null,
                data.start_date || null,
                data.end_date || null,
                data.description || null,
                data.event_type || null,
                data.code,
            ]
        );
        return result.rows[0];
    }

    /**
     * Update event
     */
    async update(id: string, data: UpdateEventDto): Promise<Event | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const allowedFields: (keyof UpdateEventDto)[] = [
            'name', 'location', 'start_date', 'end_date',
            'status', 'description', 'event_type', 'image_url'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIndex++}`);
                values.push(data[field]);
            }
        }

        if (fields.length === 0) return this.findById(id);

        values.push(id);

        const result = await query<Event>(
            `UPDATE sps_events SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    /**
     * Delete event
     */
    async delete(id: string): Promise<boolean> {
        const result = await query('DELETE FROM sps_events WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Update event status
     */
    async updateStatus(id: string, status: string): Promise<Event | null> {
        const result = await query<Event>(
            `UPDATE sps_events SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Generate next event code
     */
    async generateCode(): Promise<string> {
        const result = await query<{ max_id: number }>(
            `SELECT MAX(CAST(SUBSTRING(code FROM 9) AS INTEGER)) as max_id 
             FROM sps_events 
             WHERE code LIKE 'SPS-EVT-%'`
        );

        const nextId = (result.rows[0]?.max_id || 0) + 1;
        return `SPS-EVT-${String(nextId).padStart(3, '0')}`;
    }

    /**
     * Get event with full details (departments, services)
     */
    async getFullDetails(id: string): Promise<any> {
        const event = await this.findById(id);
        if (!event) return null;

        // Get departments with services
        const deptsResult = await query(
            `SELECT d.*,
                COALESCE(
                    (SELECT json_agg(ds.*) FROM sps_department_services ds WHERE ds.department_id = d.id),
                    '[]'::json
                ) as services
             FROM sps_departments d
             WHERE d.event_id = $1
             ORDER BY d.created_at`,
            [id]
        );

        return {
            ...event,
            departments: deptsResult.rows,
        };
    }
}
