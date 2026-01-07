import pool from '../db';

export interface DeviceModel {
    id: string;
    name: string;
    manufacturer: string;
    model_number: string;
    description?: string;
    category: 'SENSOR' | 'DISPLAY' | 'CONTROLLER' | 'GATEWAY' | 'OTHER';
    specifications?: Record<string, any>;
    firmware_versions?: string[];
    image_url?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateDeviceModelInput {
    name: string;
    manufacturer: string;
    model_number: string;
    description?: string;
    category: DeviceModel['category'];
    specifications?: Record<string, any>;
    firmware_versions?: string[];
    image_url?: string;
}

export interface UpdateDeviceModelInput {
    name?: string;
    manufacturer?: string;
    model_number?: string;
    description?: string;
    category?: DeviceModel['category'];
    specifications?: Record<string, any>;
    firmware_versions?: string[];
    image_url?: string;
    is_active?: boolean;
}

export class DeviceModelRepository {
    async findAll(includeInactive: boolean = false): Promise<DeviceModel[]> {
        let query = 'SELECT * FROM device_models';
        if (!includeInactive) {
            query += ' WHERE is_active = true';
        }
        query += ' ORDER BY manufacturer, name';

        const result = await pool.query(query);
        return result.rows;
    }

    async findById(id: string): Promise<DeviceModel | null> {
        const result = await pool.query(
            'SELECT * FROM device_models WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async findByModelNumber(modelNumber: string): Promise<DeviceModel | null> {
        const result = await pool.query(
            'SELECT * FROM device_models WHERE model_number = $1',
            [modelNumber]
        );
        return result.rows[0] || null;
    }

    async findByCategory(category: DeviceModel['category']): Promise<DeviceModel[]> {
        const result = await pool.query(
            'SELECT * FROM device_models WHERE category = $1 AND is_active = true ORDER BY name',
            [category]
        );
        return result.rows;
    }

    async create(data: CreateDeviceModelInput): Promise<DeviceModel> {
        const result = await pool.query(
            `INSERT INTO device_models (
                name, manufacturer, model_number, description, category,
                specifications, firmware_versions, image_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                data.name,
                data.manufacturer,
                data.model_number,
                data.description || null,
                data.category,
                data.specifications ? JSON.stringify(data.specifications) : null,
                data.firmware_versions || null,
                data.image_url || null,
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
        if (data.manufacturer !== undefined) {
            fields.push(`manufacturer = $${paramIndex++}`);
            values.push(data.manufacturer);
        }
        if (data.model_number !== undefined) {
            fields.push(`model_number = $${paramIndex++}`);
            values.push(data.model_number);
        }
        if (data.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(data.description);
        }
        if (data.category !== undefined) {
            fields.push(`category = $${paramIndex++}`);
            values.push(data.category);
        }
        if (data.specifications !== undefined) {
            fields.push(`specifications = $${paramIndex++}`);
            values.push(JSON.stringify(data.specifications));
        }
        if (data.firmware_versions !== undefined) {
            fields.push(`firmware_versions = $${paramIndex++}`);
            values.push(data.firmware_versions);
        }
        if (data.image_url !== undefined) {
            fields.push(`image_url = $${paramIndex++}`);
            values.push(data.image_url);
        }
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${paramIndex++}`);
            values.push(data.is_active);
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
            `UPDATE device_models SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    async delete(id: string): Promise<void> {
        // Soft delete - just mark as inactive
        await pool.query(
            'UPDATE device_models SET is_active = false, updated_at = NOW() WHERE id = $1',
            [id]
        );
    }

    async getUsageCount(id: string): Promise<number> {
        const result = await pool.query(
            'SELECT COUNT(*) FROM devices WHERE device_model_id = $1',
            [id]
        );
        return parseInt(result.rows[0].count);
    }
}
