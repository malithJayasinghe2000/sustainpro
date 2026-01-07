import { query, getClient } from '../db';
import { Organization, CreateOrganizationDto, UpdateOrganizationDto } from '@sustainpro/shared-types';

export class OrganizationRepository {
    /**
     * Get all organizations
     */
    async findAll(organizationId?: string | null): Promise<Organization[]> {
        let sql = `SELECT * FROM sps_organizations`;
        const params: any[] = [];

        if (organizationId) {
            sql += ` WHERE id = $1`;
            params.push(organizationId);
        }

        sql += ` ORDER BY created_at DESC`;

        const result = await query<Organization>(sql, params);
        return result.rows;
    }

    /**
     * Get organization by ID
     */
    async findById(id: string): Promise<Organization | null> {
        const result = await query<Organization>(
            `SELECT * FROM sps_organizations WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get organization by slug
     */
    async findBySlug(slug: string): Promise<Organization | null> {
        const result = await query<Organization>(
            `SELECT * FROM sps_organizations WHERE slug = $1`,
            [slug]
        );
        return result.rows[0] || null;
    }

    /**
     * Create a new organization
     */
    async create(data: CreateOrganizationDto & { code: string }): Promise<Organization> {
        const result = await query<Organization>(
            `INSERT INTO sps_organizations (
                name, slug, code, type, description, industry, timezone, contact_email
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                data.name,
                data.slug || this.generateSlug(data.name),
                data.code,
                data.type || 'CLIENT',
                data.description || null,
                data.industry || null,
                data.timezone || 'UTC',
                data.contact_email || null,
            ]
        );
        return result.rows[0];
    }

    /**
     * Update organization
     */
    async update(id: string, data: UpdateOrganizationDto): Promise<Organization | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const allowedFields: (keyof UpdateOrganizationDto)[] = [
            'name', 'description', 'industry', 'website', 'logo_url',
            'timezone', 'address', 'city', 'country', 'phone',
            'contact_email', 'theme_config'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIndex++}`);
                values.push(field === 'theme_config' ? JSON.stringify(data[field]) : data[field]);
            }
        }

        if (fields.length === 0) return this.findById(id);

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await query<Organization>(
            `UPDATE sps_organizations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    /**
     * Delete organization
     */
    async delete(id: string): Promise<boolean> {
        const result = await query('DELETE FROM sps_organizations WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Generate next organization code
     */
    async generateCode(): Promise<string> {
        const result = await query<{ code: string }>(
            `SELECT code FROM sps_organizations WHERE code LIKE 'SPS-ORG-%' ORDER BY code DESC LIMIT 1`
        );

        let nextId = 1;
        if (result.rows.length > 0) {
            const lastCode = result.rows[0].code;
            const parts = lastCode.split('-');
            const lastNum = parseInt(parts[2]);
            if (!isNaN(lastNum)) {
                nextId = lastNum + 1;
            }
        }

        return `SPS-ORG-${nextId.toString().padStart(3, '0')}`;
    }

    /**
     * Get organization with full structure (events, departments)
     */
    async getFullStructure(id: string): Promise<any> {
        const org = await this.findById(id);
        if (!org) return null;

        // Get events
        const eventsResult = await query(
            `SELECT * FROM sps_events WHERE organization_id = $1 ORDER BY created_at DESC`,
            [id]
        );

        // Get departments for each event
        const events = await Promise.all(
            eventsResult.rows.map(async (event: any) => {
                const deptsResult = await query(
                    `SELECT d.*, 
                        (SELECT COUNT(*) FROM sps_department_services ds WHERE ds.department_id = d.id)::int as services_count
                     FROM sps_departments d WHERE d.event_id = $1`,
                    [event.id]
                );
                return { ...event, departments: deptsResult.rows };
            })
        );

        // Get user count
        const userCountResult = await query(
            `SELECT COUNT(*)::int as count FROM sps_users WHERE organization_id = $1`,
            [id]
        );

        // Get device count
        const deviceCountResult = await query(
            `SELECT COUNT(*)::int as count FROM sps_devices WHERE organization_id = $1`,
            [id]
        );

        return {
            ...org,
            events,
            user_count: userCountResult.rows[0]?.count || 0,
            device_count: deviceCountResult.rows[0]?.count || 0,
        };
    }

    /**
     * Generate slug from name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
