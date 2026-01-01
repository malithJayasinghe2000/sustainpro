import argon2 from 'argon2';
import pool from '../db';


async function createAdminUser() {
    try {
        const email = 'elcoanlanka@gmail.com';
        const password = 'Avtm!998';
        const orgName = 'Sustain Pro';

        console.log('🚀 Starting Admin Account Creation...');

        // 1. Create/Get Provider Organization
        console.log('🏢 ensuring organization exists...');
        // We try to find it first, or insert
        let orgId: string;

        const orgRes = await pool.query(`SELECT id FROM sps_organizations WHERE name = $1`, [orgName]);

        if (orgRes.rows.length > 0) {
            orgId = orgRes.rows[0].id;
            console.log('   -> Found existing org:', orgId);
        } else {
            const newOrgRes = await pool.query(
                `INSERT INTO sps_organizations (name, slug, code, type) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id`,
                [orgName, 'sustain-pro', 'SPS-ORG-000', 'PROVIDER']
            );
            orgId = newOrgRes.rows[0].id;
            console.log('   -> Created new org:', orgId);
        }

        // 2. Hash Password
        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
            // standard config
        });

        // 3. Create/Update User
        console.log('👤 creating user...');
        let userId: string;

        // Check availability
        const userCheck = await pool.query(`SELECT id FROM sps_users WHERE email = $1`, [email]);

        if (userCheck.rows.length > 0) {
            userId = userCheck.rows[0].id;
            console.log('   -> User exists, updating password...');
            await pool.query(
                `UPDATE sps_users SET password_hash = $1, is_active = true, is_super_admin = true, organization_id = $2
                 WHERE id = $3`,
                [passwordHash, orgId, userId]
            );
        } else {
            const newUserRes = await pool.query(
                `INSERT INTO sps_users (
                    organization_id, email, password_hash, full_name, is_super_admin, code, timezone
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id`,
                [orgId, email, passwordHash, 'System Administrator', true, 'SPS-USR-ADMIN', 'Asia/Colombo']
            );
            userId = newUserRes.rows[0].id;
            console.log('   -> Created new user:', userId);
        }

        // 4. Assign Role
        console.log('🛡️  assigning roles...');
        // Clean existing roles for this user to be safe
        await pool.query(`DELETE FROM sps_role_assignments WHERE user_id = $1`, [userId]);

        await pool.query(
            `INSERT INTO sps_role_assignments (user_id, role, org_id) VALUES ($1, $2, $3)`,
            [userId, 'SUPER_ADMIN', orgId]
        );

        console.log('\n✅ Admin Account Setup Complete!');
        console.log(`- Email: ${email}`);
        console.log(`- Role: SUPER_ADMIN (Platform Owner/Super Admin)`);
        console.log(`- Org: ${orgName}`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
