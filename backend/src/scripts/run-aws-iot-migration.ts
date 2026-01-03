import pool, { closePool } from '../db';
import fs from 'fs';
import path from 'path';

async function runAwsIotMigration() {
    try {
        console.log('🚀 Running AWS IoT migration...');

        const migrationPath = path.join(__dirname, '../../sql/migrations/006_add_aws_iot_fields.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await pool.query(migrationSQL);

        console.log('✅ AWS IoT migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await closePool();
    }
}

runAwsIotMigration();
