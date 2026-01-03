import fs from 'fs';
import path from 'path';
import pool from '../db';

async function initServices() {
    const client = await pool.connect();
    try {
        console.log('Initializing Service Models Schema...');

        const sqlPath = path.join(__dirname, '../../sql/init-services.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Service Models tables created successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

initServices();
