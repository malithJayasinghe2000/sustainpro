import pool from '../db';

async function checkRBAC() {
    try {
        // Check ORG_ADMIN permissions
        const res = await pool.query(
            'SELECT * FROM sps_role_permissions WHERE role_code = $1',
            ['ORG_ADMIN']
        );

        console.log('ORG_ADMIN has', res.rows.length, 'permissions:');
        console.log(res.rows.map(r => r.permission_code).join(', '));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkRBAC();
