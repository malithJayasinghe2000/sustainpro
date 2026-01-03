// Migration script to create sps_device_models table
import pool from '../db';

async function createDeviceModelsTable() {
    const client = await pool.connect();
    try {
        console.log('Creating sps_device_models table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS sps_device_models (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_by VARCHAR(50) REFERENCES sps_users(id),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
            );
        `);

        console.log('✓ Table created successfully');

        // Create index for faster JSON searching
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_device_models_parameters 
            ON sps_device_models USING GIN (parameters);
        `);

        console.log('✓ Index created successfully');

        // Add comments
        await client.query(`
            COMMENT ON TABLE sps_device_models IS 
            'Defines the schema/template for devices, including their data parameters.';
        `);

        await client.query(`
            COMMENT ON COLUMN sps_device_models.parameters IS 
            'JSON array defining the data points this model reports (key, unit, type, etc.)';
        `);

        console.log('✓ Comments added successfully');
        console.log('Migration completed! Device models table is ready.');

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createDeviceModelsTable()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
