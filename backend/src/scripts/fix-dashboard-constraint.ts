
import pool from '../db';

async function run() {
    try {
        console.log('Adding UNIQUE constraint to sps_dashboard_templates(service_id)...');
        // We use a DO block to adding it only if it doesn't exist, preventing errors
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'sps_dashboard_templates_service_id_key'
                ) THEN
                    ALTER TABLE sps_dashboard_templates 
                    ADD CONSTRAINT sps_dashboard_templates_service_id_key UNIQUE (service_id);
                    RAISE NOTICE 'Constraint added';
                ELSE
                    RAISE NOTICE 'Constraint already exists';
                END IF;
            END $$;
        `);
        console.log('Constraint check/creation completed.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

run();
