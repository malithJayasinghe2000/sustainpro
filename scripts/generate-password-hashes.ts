import bcrypt from 'bcryptjs';

/**
 * Generate bcrypt password hashes for sample users
 * Run this to get the correct password hashes for sample_data.sql
 */

const passwords = {
  'Admin@123': 'admin@acme.com',
  'Manager@123': 'manager@acme.com',
  'Operator@123': 'operator@acme.com',
};

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║         SustainPro Password Hash Generator               ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

async function generateHashes() {
  const saltRounds = 10;
  
  console.log('Generating password hashes...\n');
  
  for (const [password, email] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`${email}:`);
    console.log(`  Password: ${password}`);
    console.log(`  Hash:     ${hash}`);
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Copy these hashes into backend/sql/sample_data.sql');
  console.log('Replace the placeholder hashes in the INSERT INTO sps_users');
  console.log('═══════════════════════════════════════════════════════════\n');
}

generateHashes().catch(console.error);
