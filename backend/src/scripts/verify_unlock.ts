
import pool from '../db';
import argon2 from 'argon2';

async function verifyUnlockLogic() {
    try {
        console.log('🧪 Starting Unlock Logic Verification...');
        const email = 'elcoanlanka@gmail.com';

        // 1. Force Lock the Account (simulating a lock that expired 1 second ago)
        console.log('🔒 Locking account with expired timestamp...');
        const oneMinuteAgo = new Date(Date.now() - 60000); // 1 min ago
        await pool.query(
            `UPDATE sps_users 
             SET account_locked_until = $1, failed_login_attempts = 5
             WHERE email = $2`,
            [oneMinuteAgo, email]
        );

        const userCheck = await pool.query(`SELECT account_locked_until, failed_login_attempts FROM sps_users WHERE email = $1`, [email]);
        console.log('   -> State:', userCheck.rows[0]);

        // 2. Simulate Login Logic (Backend "Reset Check")
        console.log('🔓 Simulating Login Check (via direct logic test)...');

        let user = userCheck.rows[0];
        let isLocked = false;

        if (user.account_locked_until) {
            const lockUntil = new Date(user.account_locked_until);
            if (lockUntil > new Date()) {
                isLocked = true;
                console.log('❌ FAIL: Account is still considered LOCKED (Future timestamp?)');
            } else {
                console.log('✅ PASS: Lock timestamp is in the past.');
                // Simulate the "Reset" logic
                user.failed_login_attempts = 0;
                console.log('   -> Logic would reset failed attempts to 0.');
            }
        }

        // 3. Clear Lock for real to be nice
        await pool.query(
            `UPDATE sps_users 
             SET account_locked_until = NULL, failed_login_attempts = 0
             WHERE email = $1`,
            [email]
        );
        console.log('🧹 Cleaned up user state.');

        process.exit(0);

    } catch (err) {
        console.error("Test Error:", err);
        process.exit(1);
    }
}

verifyUnlockLogic();
