
import pool from '../db';

async function run() {
    try {
        console.log('FORCE Adding UNIQUE constraint...');
        await pool.query('ALTER TABLE sps_dashboard_templates ADD CONSTRAINT sps_dashboard_templates_service_id_key UNIQUE (service_id)');
        console.log('SUCCESS: Constraint added.');
        process.exit(0);
    } catch (e: any) {
        if (e.code === '42710') { // duplicate_object
            console.log('Constraint already exists (caught error 42710).');
            process.exit(0);
        }
        console.error('FAILED:', e);
        process.exit(1);
    }
}

run();
