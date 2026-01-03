
import pool from '../db';

async function run() {
    try {
        console.log('Fixing FK constraint...');

        await pool.query(`
            ALTER TABLE sps_devices DROP CONSTRAINT IF EXISTS sps_devices_service_id_fkey;
        `);

        // Check if there are any IDs in service_id that don't exist in sps_department_services
        // If so, set them to NULL to avoid violations
        await pool.query(`
            UPDATE sps_devices 
            SET service_id = NULL 
            WHERE service_id IS NOT NULL 
            AND service_id NOT IN (SELECT id FROM sps_department_services);
        `);

        await pool.query(`
            ALTER TABLE sps_devices 
            ADD CONSTRAINT sps_devices_service_id_fkey 
            FOREIGN KEY (service_id) REFERENCES sps_department_services(id) ON DELETE SET NULL;
        `);

        console.log('FK Constraint Fixed!');
        process.exit(0);
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

run();
