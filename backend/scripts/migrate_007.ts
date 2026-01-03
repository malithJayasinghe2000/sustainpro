import { query, closePool } from '../src/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
    try {
        console.log('🔄 Application Migration 007...');

        const sqlPath = path.join(__dirname, '../sql/migrations/007_enhanced_service_templates.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 Executing SQL:', sql);

        await query(sql);

        console.log('✅ Migration 007 applied successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await closePool();
    }
}

migrate();
