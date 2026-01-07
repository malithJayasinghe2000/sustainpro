import pool from '../db';

export interface Device {
    id: string;
    device_code: string;
    device_model_id: string;
    organization_id: string;
    department_service_id?: string;
    name: string;
    description?: string;
    status: 'INACTIVE' | 'ACTIVE' | 'PROVISIONED' | 'OFFLINE' | 'ERROR';
    api_key_hash?: string;
    aws_thing_name?: string;
    aws_certificate_arn?: string;
    mqtt_topics?: {
        telemetry: string;
        status: string;
        commands: string;
    };
    firmware_version?: string;
    last_seen_at?: Date;
    metadata?: Record<string, any>;
    created_at: Date;
    updated_at: Date;
}

export interface CreateDeviceInput {
    device_code: string;
    device_model_id: string;
    organization_id: string;
    department_service_id?: string;
    name: string;
    description?: string;
    api_key_hash: string;
    metadata?: Record<string, any>;
}

export interface UpdateDeviceInput {
    name?: string;
    description?: string;
    department_service_id?: string;
    status?: Device['status'];
    aws_thing_name?: string;
    aws_certificate_arn?: string;
    mqtt_topics?: Device['mqtt_topics'];
    firmware_version?: string;
    last_seen_at?: Date;
    metadata?: Record<string, any>;
}

export class DeviceRepository {
    async findAll(organizationId?: string | null): Promise<Device[]> {
        let query = `
            SELECT d.*, dm.name as model_name, dm.manufacturer,
                   o.name as organization_name
            FROM devices d
            LEFT JOIN device_models dm ON d.device_model_id = dm.id
            LEFT JOIN organizations o ON d.organization_id = o.id
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

    async findById(id: string): Promise<Device | null> {
        const result = await pool.query(
            `SELECT d.*, dm.name as model_name, dm.manufacturer, dm.model_number,
                    o.name as organization_name,
                    ds.name as service_name
             FROM devices d
             LEFT JOIN device_models dm ON d.device_model_id = dm.id
             LEFT JOIN organizations o ON d.organization_id = o.id
             LEFT JOIN department_services ds ON d.department_service_id = ds.id
             WHERE d.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async findByDeviceCode(deviceCode: string): Promise<Device | null> {
        const result = await pool.query(
            'SELECT * FROM devices WHERE device_code = $1',
            [deviceCode]
        );
        return result.rows[0] || null;
    }

    async findByApiKeyHash(apiKeyHash: string): Promise<Device | null> {
        const result = await pool.query(
            `SELECT d.*, o.id as org_id 
             FROM devices d
             LEFT JOIN organizations o ON d.organization_id = o.id
             WHERE d.api_key_hash = $1 AND d.status != 'INACTIVE'`,
            [apiKeyHash]
        );
        return result.rows[0] || null;
    }

    async findByOrganization(organizationId: string): Promise<Device[]> {
        const result = await pool.query(
            `SELECT d.*, dm.name as model_name, dm.manufacturer
             FROM devices d
             LEFT JOIN device_models dm ON d.device_model_id = dm.id
             WHERE d.organization_id = $1
             ORDER BY d.created_at DESC`,
            [organizationId]
        );
        return result.rows;
    }

    async findByDepartmentService(departmentServiceId: string): Promise<Device[]> {
        const result = await pool.query(
            `SELECT d.*, dm.name as model_name
             FROM devices d
             LEFT JOIN device_models dm ON d.device_model_id = dm.id
             WHERE d.department_service_id = $1
             ORDER BY d.name`,
            [departmentServiceId]
        );
        return result.rows;
    }

    async create(data: CreateDeviceInput): Promise<Device> {
        const result = await pool.query(
            `INSERT INTO devices (
                device_code, device_model_id, organization_id, department_service_id,
                name, description, api_key_hash, status, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'INACTIVE', $8)
            RETURNING *`,
            [
                data.device_code,
                data.device_model_id,
                data.organization_id,
                data.department_service_id || null,
                data.name,
                data.description || null,
                data.api_key_hash,
                data.metadata ? JSON.stringify(data.metadata) : null,
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
        if (data.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(data.description);
        }
        if (data.department_service_id !== undefined) {
            fields.push(`department_service_id = $${paramIndex++}`);
            values.push(data.department_service_id);
        }
        if (data.status !== undefined) {
            fields.push(`status = $${paramIndex++}`);
            values.push(data.status);
        }
        if (data.aws_thing_name !== undefined) {
            fields.push(`aws_thing_name = $${paramIndex++}`);
            values.push(data.aws_thing_name);
        }
        if (data.aws_certificate_arn !== undefined) {
            fields.push(`aws_certificate_arn = $${paramIndex++}`);
            values.push(data.aws_certificate_arn);
        }
        if (data.mqtt_topics !== undefined) {
            fields.push(`mqtt_topics = $${paramIndex++}`);
            values.push(JSON.stringify(data.mqtt_topics));
        }
        if (data.firmware_version !== undefined) {
            fields.push(`firmware_version = $${paramIndex++}`);
            values.push(data.firmware_version);
        }
        if (data.last_seen_at !== undefined) {
            fields.push(`last_seen_at = $${paramIndex++}`);
            values.push(data.last_seen_at);
        }
        if (data.metadata !== undefined) {
            fields.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(data.metadata));
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
            `UPDATE devices SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    async updateLastSeen(id: string): Promise<void> {
        await pool.query(
            `UPDATE devices SET last_seen_at = NOW(), status = 'ACTIVE' WHERE id = $1`,
            [id]
        );
    }

    async delete(id: string): Promise<void> {
        await pool.query('DELETE FROM devices WHERE id = $1', [id]);
    }

    async countByOrganization(organizationId: string): Promise<number> {
        const result = await pool.query(
            'SELECT COUNT(*) FROM devices WHERE organization_id = $1',
            [organizationId]
        );
        return parseInt(result.rows[0].count);
    }

    async getDeviceStats(organizationId?: string): Promise<{
        total: number;
        active: number;
        offline: number;
        provisioned: number;
    }> {
        let query = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
                COUNT(*) FILTER (WHERE status = 'OFFLINE') as offline,
                COUNT(*) FILTER (WHERE status = 'PROVISIONED') as provisioned
            FROM devices
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
            provisioned: parseInt(result.rows[0].provisioned),
        };
    }
}
