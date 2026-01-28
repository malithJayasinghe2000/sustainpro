/**
 * Script to fix production user passwords after TimescaleDB migration
 * 
 * This generates argon2id password hashes that are compatible with the auth service.
 * 
 * Usage on production server:
 * 1. SSH into the server
 * 2. docker compose -f docker/docker-compose.production.yml exec auth-service sh
 * 3. cd /app/packages/shared-database
 * 4. Run: node -e "$(cat)" <<< "$(cat /app/scripts/fix-production-passwords.ts | npx esbuild --loader=ts)"
 * 
 * OR simpler approach - just get the hash and run SQL manually:
 * 1. npx ts-node /path/to/this/script.ts
 * 2. Copy the hash
 * 3. Run SQL: UPDATE sps_users SET password_hash = '<hash>' WHERE email = 'your@email.com';
 */

import argon2 from 'argon2';

const PASSWORD_TO_HASH = 'Admin@123'; // Change this to your desired password

async function generatePasswordHash() {
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║         SustainPro Production Password Fix                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log('Generating argon2id hash for password:', PASSWORD_TO_HASH);
    console.log('');

    const hash = await argon2.hash(PASSWORD_TO_HASH, {
        type: argon2.argon2id,
        memoryCost: 65536,      // 64 MB
        timeCost: 3,            // 3 iterations
        parallelism: 4          // 4 parallel threads
    });

    console.log('Generated hash:');
    console.log(hash);
    console.log('');
    console.log('Hash starts with:', hash.substring(0, 20) + '...');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('To update a user password in production, run this SQL:');
    console.log('');
    console.log(`UPDATE sps_users SET password_hash = '${hash}' WHERE email = 'user@example.com';`);
    console.log('');
    console.log('Or to update ALL seeded users:');
    console.log('');
    console.log(`UPDATE sps_users SET password_hash = '${hash}' WHERE email IN (
  'superadmin@sustainpro.io',
  'admin@acme.com',
  'manager@acme.com',
  'operator@acme.com'
);`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════\n');
}

generatePasswordHash().catch(console.error);
