import fs from 'fs';
import path from 'path';
import { query, closePool } from '../db';

async function runMigrations() {
    try {
        const migrations = [
            'fix_department_templates_nullable.sql',
            'enhance_departments_table.sql'
        ];

        for (const migration of migrations) {
            const filePath = path.join(__dirname, '../../sql/migrations', migration);
            console.log(`Running migration: ${migration}...`);

            if (fs.existsSync(filePath)) {
                const sql = fs.readFileSync(filePath, 'utf8');
                await query(sql);
                console.log(`✅ Successfully applied ${migration}`);
            } else {
                console.error(`❌ File not found: ${filePath}`);
            }
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await closePool();
    }
}

runMigrations();
