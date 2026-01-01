import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool, { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';
import { getCurrentSystemTime } from '../utils/timezone';
import { getSecuritySettings } from '../services/settings';

const router = Router();

// ============================================
// Helper: Fetch Security Settings
// ============================================
// Helper: Fetch Security Settings moved to src/services/settings.ts

// ============================================
// POST /api/v1/auth/login
// ============================================
router.post('/login',
    loginLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty()
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { email, password } = req.body;
            const settings = await getSecuritySettings();

            // 1. Fetch User (Joined with Org for name) 
            const userRes = await query(
                `SELECT u.id, u.email, u.password_hash, u.full_name, u.organization_id, u.is_active, u.is_super_admin, u.code,
                        u.failed_login_attempts, u.account_locked_until, u.timezone, 
                        o.name as org_name, o.logo_url, o.theme_config
                 FROM sps_users u
                 LEFT JOIN sps_organizations o ON u.organization_id = o.id
                 WHERE u.email = $1`,
                [email]
            );

            if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
            const user = userRes.rows[0];

            // 2. Security Checks
            if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

            if (user.account_locked_until) {
                const lockUntil = new Date(user.account_locked_until);
                if (lockUntil > new Date()) {
                    const minutesRemaining = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
                    return res.status(423).json({
                        error: `Account locked. Too many failed login attempts.`,
                        lockUntil: lockUntil.toISOString(),
                        minutesRemaining,
                        message: `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
                    });
                } else {
                    // Lock expired. Reset local counter so if they fail now, it restarts from 1
                    user.failed_login_attempts = 0;
                }
            }

            // 3. Verify Password
            const validPass = await argon2.verify(user.password_hash, password);
            if (!validPass) {
                const attempts = (user.failed_login_attempts || 0) + 1;
                let lockUntil = null;
                if (attempts >= settings.maxLoginAttempts) { // Fix: use settings object
                    lockUntil = new Date(Date.now() + settings.accountLockDurationMinutes * 60000);
                }

                await query('UPDATE sps_users SET failed_login_attempts = $1, account_locked_until = $2 WHERE id = $3',
                    [attempts, lockUntil, user.id]);

                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // 4. Success - Reset Counters
            await query('UPDATE sps_users SET failed_login_attempts = 0, account_locked_until = NULL, last_login = NOW() WHERE id = $1', [user.id]);

            // Reset IP rate limit
            if (req.ip) {
                loginLimiter.resetKey(req.ip);
            }

            // 5. Fetch Roles for Token
            const rolesRes = await query('SELECT role, org_id, event_id FROM sps_role_assignments WHERE user_id = $1', [user.id]);
            const rolesList = rolesRes.rows.map((r: any) => r.role);

            // 5b. Fetch Permissions
            const permsRes = await query(`
                SELECT DISTINCT rp.permission_code
                FROM sps_role_assignments ra
                JOIN sps_role_permissions rp ON ra.role = rp.role_code
                WHERE ra.user_id = $1
            `, [user.id]);
            const permissions = permsRes.rows.map((r: any) => r.permission_code);

            // 6. Generate Tokens
            // We use a refresh token strategy.
            const accessToken = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    organization_id: user.organization_id,
                    isSuperAdmin: user.is_super_admin,
                    roles: rolesList
                },
                process.env.JWT_SECRET!,
                { expiresIn: `${settings.tokenExpireMinutes}m` }
            );

            const refreshToken = jwt.sign(
                { id: user.id },
                process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!, // Ideally distinct
                { expiresIn: '7d' }
            );

            // 7. Set Refresh Cookie
            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // secure in prod
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                message: 'Login successful',
                token: accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    organization_id: user.organization_id,
                    org_name: user.org_name,
                    org_logo: user.logo_url,
                    theme_config: user.theme_config,
                    roles: rolesRes.rows,
                    permissions: permissions, // <--- Added
                    is_super_admin: user.is_super_admin,
                    code: user.code,
                    timezone: user.timezone
                }
            });

        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ error: 'Login failed' });
        }
    }
);

// ============================================
// POST /api/v1/auth/logout
// ============================================
router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ message: 'Logged out successfully' });
});

// ============================================
// POST /api/v1/auth/refresh
// ============================================
router.post('/refresh', async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }

    try {
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
        const decoded = jwt.verify(refreshToken, secret) as any;

        // Fetch fresh user data
        const userRes = await query(
            `SELECT id, email, organization_id, is_super_admin, is_active FROM sps_users WHERE id = $1`,
            [decoded.id]
        );

        if (userRes.rows.length === 0) return res.status(403).json({ error: 'User not found' });
        const user = userRes.rows[0];

        if (!user.is_active) return res.status(403).json({ error: 'User account disabled' });

        // Fetch Roles
        const rolesRes = await query('SELECT role FROM sps_role_assignments WHERE user_id = $1', [user.id]);
        const roles = rolesRes.rows.map((r: any) => r.role);

        const settings = await getSecuritySettings();

        // Issue new Access Token
        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                organization_id: user.organization_id,
                isSuperAdmin: user.is_super_admin,
                roles: roles
            },
            process.env.JWT_SECRET!,
            { expiresIn: `${settings.tokenExpireMinutes}m` }
        );

        res.json({ token: accessToken });

    } catch (err) {
        console.error("Refresh failed", err);
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
});

// ============================================
// POST /api/v1/auth/register (Admin Only)
// ============================================
router.post('/register',
    authenticateToken,
    // We allow ORG_ADMIN to register users for their org? 
    // For now, let's say only Super Admin or Org Admin can create users.
    // requireRole('ORG_ADMIN'), // TODO: specialized check needed
    async (req: Request, res: Response) => {
        // ... simplified registration logic for now ...
        // In a real multi-tenant app, usually you invite users by email.
        res.status(501).json({ message: 'Registration not implemented in this iteration' });
    });

// ============================================
// GET /api/v1/auth/me
// ============================================
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userRes = await query(
            `SELECT u.id, u.email, u.organization_id, u.is_super_admin, u.timezone, 
            o.name as org_name, o.logo_url, o.theme_config
             FROM sps_users u
             LEFT JOIN sps_organizations o ON u.organization_id = o.id
             WHERE u.id = $1`,
            [req.user!.id]
        );

        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const rolesRes = await query('SELECT role, org_id, event_id FROM sps_role_assignments WHERE user_id = $1', [req.user!.id]);

        const permsRes = await query(`
            SELECT DISTINCT rp.permission_code
            FROM sps_role_assignments ra
            JOIN sps_role_permissions rp ON ra.role = rp.role_code
            WHERE ra.user_id = $1
        `, [req.user!.id]);
        const permissions = permsRes.rows.map((r: any) => r.permission_code);

        res.json({
            user: {
                ...userRes.rows[0],
                roles: rolesRes.rows,
                permissions: permissions
            }
        });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Internal Error' });
    }
});

export default router;
