import pool from '../db';

export interface Device {
    id: number;
    organization_id: string;
    service_id?: string;
    device_code: string;
    api_key?: string;
    name?: string;
    type?: string;
    status: string;
    last_seen?: Date;
    metadata?: Record<string, any>;
    created_at: Date;
    updated_at: Date;
    // Joined fields
    service_name?: string;
    dept_name?: string;
}

export interface CreateDeviceInput {
    organization_id: string;
    device_code: string;
    name?: string;
    type?: string;
    api_key?: string;
    service_id?: string;
    metadata?: Record<string, any>;
}

export interface UpdateDeviceInput {
    name?: string;
    type?: string;
    service_id?: string | null;
    status?: string;
    last_seen?: Date;
    metadata?: Record<string, any>;
}

export class DeviceRepository {
    async findAll(organizationId?: string | null): Promise<Device[]> {
        let query = `
            SELECT 
                d.id, d.device_code, d.name, d.type, d.status, 
                d.last_seen, d.metadata, d.created_at, d.organization_id,
                s.name as service_name,
                dept.name as dept_name
            FROM sps_devices d
            LEFT JOIN sps_department_services ds ON d.service_id = ds.id
            LEFT JOIN sps_service_templates s ON ds.service_id = s.id
            LEFT JOIN sps_departments dept ON ds.department_id = dept.id
        `;
        const params: any[] = [];

        if (organizationId) {
            query += ' WHERE d.organization_id = $1';
            params.push(organizationId);
        }

        query += ' ORDER BY d.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    }

    async findById(id: string, organizationId?: string): Promise<Device | null> {
        let sql = `
            SELECT 
                d.*,
                s.name as service_name,
                dept.name as dept_name
            FROM sps_devices d
            LEFT JOIN sps_department_services ds ON d.service_id = ds.id
            LEFT JOIN sps_service_templates s ON ds.service_id = s.id
            LEFT JOIN sps_departments dept ON ds.department_id = dept.id
            WHERE d.id = $1
        `;
        const params: any[] = [id];

        if (organizationId) {
            sql += ' AND d.organization_id = $2';
            params.push(organizationId);
        }

        const result = await pool.query(sql, params);
        return result.rows[0] || null;
    }

    async findByDeviceCode(deviceCode: string): Promise<Device | null> {
        const result = await pool.query(
            'SELECT * FROM sps_devices WHERE device_code = $1',
            [deviceCode]
        );
        return result.rows[0] || null;
    }

    async findByApiKey(apiKey: string): Promise<Device | null> {
        const result = await pool.query(
            `SELECT d.*, o.id as org_id 
             FROM sps_devices d
             LEFT JOIN sps_organizations o ON d.organization_id = o.id
             WHERE d.api_key = $1 AND d.status != 'INACTIVE'`,
            [apiKey]
        );
        return result.rows[0] || null;
    }

    async findByOrganization(organizationId: string): Promise<Device[]> {
        const result = await pool.query(
            `SELECT d.*, s.name as service_name
             FROM sps_devices d
             LEFT JOIN sps_department_services ds ON d.service_id = ds.id
             LEFT JOIN sps_service_templates s ON ds.service_id = s.id
             WHERE d.organization_id = $1
             ORDER BY d.created_at DESC`,
            [organizationId]
        );
        return result.rows;
    }

    async findByService(serviceId: string): Promise<Device[]> {
        const result = await pool.query(
            `SELECT d.*
             FROM sps_devices d
             WHERE d.service_id = $1
             ORDER BY d.name`,
            [serviceId]
        );
        return result.rows;
    }

    async create(data: CreateDeviceInput): Promise<Device> {
        const result = await pool.query(
            `INSERT INTO sps_devices (
                organization_id, device_code, name, type, api_key, service_id, status, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, 'OFFLINE', $7)
            RETURNING *`,
            [
                data.organization_id,
                data.device_code,
                data.name || null,
                data.type || null,
                data.api_key || null,
                data.service_id || null,
                data.metadata ? JSON.stringify(data.metadata) : '{}',
            ]
        );
        return result.rows[0];
    }

    async update(id: string, data: UpdateDeviceInput): Promise<Device> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.type !== undefined) {
            fields.push(`type = $${paramIndex++}`);
            values.push(data.type);
        }
        if (data.service_id !== undefined) {
            fields.push(`service_id = $${paramIndex++}`);
            values.push(data.service_id);
        }
        if (data.status !== undefined) {
            fields.push(`status = $${paramIndex++}`);
            values.push(data.status);
        }
        if (data.last_seen !== undefined) {
            fields.push(`last_seen = $${paramIndex++}`);
            values.push(data.last_seen);
        }
        if (data.metadata !== undefined) {
            fields.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(data.metadata));
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
            `UPDATE sps_devices SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    async updateLastSeen(id: string | number): Promise<void> {
        await pool.query(
            `UPDATE sps_devices SET last_seen = NOW(), status = 'ACTIVE' WHERE id = $1`,
            [id]
        );
    }

    async assignToService(deviceId: string, serviceId: string | null): Promise<Device> {
        const result = await pool.query(
            `UPDATE sps_devices SET service_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [serviceId, deviceId]
        );
        return result.rows[0];
    }

    async delete(id: string): Promise<void> {
        await pool.query('DELETE FROM sps_devices WHERE id = $1', [id]);
    }

    async countByOrganization(organizationId: string): Promise<number> {
        const result = await pool.query(
            'SELECT COUNT(*) FROM sps_devices WHERE organization_id = $1',
            [organizationId]
        );
        return parseInt(result.rows[0].count);
    }

    async getDeviceStats(organizationId?: string): Promise<{
        total: number;
        active: number;
        offline: number;
    }> {
        let query = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
                COUNT(*) FILTER (WHERE status = 'OFFLINE') as offline
            FROM sps_devices
        `;
        const params: any[] = [];

        if (organizationId) {
            query += ' WHERE organization_id = $1';
            params.push(organizationId);
        }

        const result = await pool.query(query, params);
        return {
            total: parseInt(result.rows[0].total),
            active: parseInt(result.rows[0].active),
            offline: parseInt(result.rows[0].offline),
        };
    }
}
