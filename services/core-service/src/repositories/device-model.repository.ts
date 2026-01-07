import pool from '../db';

// Actual schema:
// id VARCHAR(50) PRIMARY KEY
// name VARCHAR(100) NOT NULL
// description TEXT
// parameters JSONB DEFAULT '[]'
// created_by VARCHAR(50)
// created_at, updated_at

export interface DeviceModel {
    id: string;
    name: string;
    description?: string;
    parameters: Record<string, any>[];
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateDeviceModelInput {
    id: string;
    name: string;
    description?: string;
    parameters?: Record<string, any>[];
    created_by?: string;
}

export interface UpdateDeviceModelInput {
    name?: string;
    description?: string;
    parameters?: Record<string, any>[];
}

export class DeviceModelRepository {
    async findAll(): Promise<DeviceModel[]> {
        const result = await pool.query(
            'SELECT * FROM sps_device_models ORDER BY name'
        );
        return result.rows;
    }

    async findById(id: string): Promise<DeviceModel | null> {
        const result = await pool.query(
            'SELECT * FROM sps_device_models WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async create(data: CreateDeviceModelInput): Promise<DeviceModel> {
        const result = await pool.query(
            `INSERT INTO sps_device_models (id, name, description, parameters, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                data.id,
                data.name,
                data.description || null,
                JSON.stringify(data.parameters || []),
                data.created_by || null,
            ]
        );
        return result.rows[0];
    }

    async update(id: string, data: UpdateDeviceModelInput): Promise<DeviceModel> {
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
        if (data.parameters !== undefined) {
            fields.push(`parameters = $${paramIndex++}`);
            values.push(JSON.stringify(data.parameters));
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
            `UPDATE sps_device_models SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    async delete(id: string): Promise<void> {
        await pool.query('DELETE FROM sps_device_models WHERE id = $1', [id]);
    }

    async count(): Promise<number> {
        const result = await pool.query('SELECT COUNT(*) FROM sps_device_models');
        return parseInt(result.rows[0].count);
    }
}
