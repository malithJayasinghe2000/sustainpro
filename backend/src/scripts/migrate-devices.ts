
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load Env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    console.log("Starting Migration...");
    try {
        const client = await pool.connect();
        try {
            console.log("Creating sps_devices table...");
            await client.query(`
                CREATE TABLE IF NOT EXISTS sps_devices (
                    id SERIAL PRIMARY KEY,
                    device_code VARCHAR(50) UNIQUE NOT NULL,
                    api_key VARCHAR(100) UNIQUE, 
                    
                    name VARCHAR(100),
                    type VARCHAR(50),      
                    model VARCHAR(50),     
                    serial_number VARCHAR(100) UNIQUE, 
                    
                    user_id VARCHAR(50) REFERENCES sps_users(id), 
                    status VARCHAR(50) DEFAULT 'offline', 
                    location VARCHAR(100),
                    
                    battery_level INTEGER,
                    last_seen TIMESTAMPTZ,
                    
                    metadata JSONB DEFAULT '{}'::jsonb,
                    
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `);

            console.log("Creating Indices...");
            await client.query(`CREATE INDEX IF NOT EXISTS idx_devices_user ON sps_devices(user_id);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_devices_serial ON sps_devices(serial_number);`);

            console.log("Migration Complete! ✅");
        } finally {
            client.release();
        }
    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        await pool.end();
    }
}

migrate();
