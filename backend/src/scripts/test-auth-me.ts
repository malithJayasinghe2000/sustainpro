import pool from '../db';

async function testAuthMe() {
    try {
        // Get a sample ORG_ADMIN user
        const userRes = await pool.query(`
            SELECT u.id 
            FROM sps_users u
            JOIN sps_role_assignments ra ON u.id = ra.user_id
            WHERE ra.role = 'ORG_ADMIN'
            LIMIT 1
        `);

        if (userRes.rows.length === 0) {
            console.log('No ORG_ADMIN user found!');
            await pool.end();
            return;
        }

        const userId = userRes.rows[0].id;
        console.log('Testing with user ID:', userId);

        // Simulate what /auth/me does
        const permsRes = await pool.query(`
            SELECT DISTINCT rp.permission_code
            FROM sps_role_assignments ra
            JOIN sps_role_permissions rp ON ra.role = rp.role_code
            WHERE ra.user_id = $1
        `, [userId]);

        const permissions = permsRes.rows.map((r: any) => r.permission_code);

        console.log('\nPermissions for this user:');
        console.log(permissions);
        console.log('\nHas events:view?', permissions.includes('events:view'));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testAuthMe();
