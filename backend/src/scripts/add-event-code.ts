import pool from '../db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Running Event Code Migration...');
        const sqlPath = path.join(__dirname, '../../migrations/add-event-code.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ Event Code Migration applied successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
