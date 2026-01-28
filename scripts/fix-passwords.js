const argon2 = require('argon2');
const { Pool } = require('pg');

async function fixPasswords() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://sustainpro:sustainpro_dev@localhost:5433/sustainpro'
    });

    try {
        // Generate fresh hash for Admin@123
        const hash = await argon2.hash('Admin@123');
        console.log('Generated hash:', hash);

        // Update all users
        const result = await pool.query(
            'UPDATE sps_users SET password_hash = $1 RETURNING email',
            [hash]
        );
        console.log('Updated users:', result.rows.map(r => r.email));

        // Verify the hash works
        const verify = await argon2.verify(hash, 'Admin@123');
        console.log('Hash verification:', verify);

        console.log('\n All passwords set to: Admin@123');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixPasswords();
