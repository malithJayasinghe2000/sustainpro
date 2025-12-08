import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// ============================================
// GET /api/v1/users - Get all users
// ============================================
router.get('/', async (req: Request, res: Response) => {
    try {
        // TODO: Add your SQL query here
        const sql = `
      SELECT 
        id, user_id, username, email, is_active, roles, 
        created_at, last_login_at
      FROM sps_users
      ORDER BY created_at DESC
    `;

        const result = await query(sql);
        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

// ============================================
// GET /api/v1/users/:id - Get user by ID
// ============================================
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // TODO: Add your SQL query here
        const sql = `
      SELECT 
        u.id, u.user_id, u.username, u.email, u.is_active, u.roles,
        u.created_at, u.last_login_at,
        p.first_name, p.last_name, p.city, p.country, p.timezone
      FROM sps_users u
      LEFT JOIN sps_user_profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `;

        const result = await query(sql, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
});

// ============================================
// POST /api/v1/users - Create new user
// ============================================
router.post('/', async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        // TODO: Add password hashing with bcrypt
        // const hashedPassword = await bcrypt.hash(password, 10);

        // TODO: Add your SQL query here
        const sql = `
      INSERT INTO sps_users (username, email, hashed_password)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, username, email, created_at
    `;

        // For now, use plain password (NOT SECURE - implement hashing!)
        const result = await query(sql, [username, email, password]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user'
        });
    }
});

// ============================================
// PUT /api/v1/users/:id - Update user
// ============================================
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { username, email, is_active } = req.body;

        // TODO: Add your SQL query here
        const sql = `
      UPDATE sps_users
      SET username = COALESCE($1, username),
          email = COALESCE($2, email),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, username, email, is_active, updated_at
    `;

        const result = await query(sql, [username, email, is_active, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});

// ============================================
// DELETE /api/v1/users/:id - Delete user
// ============================================
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // TODO: Add your SQL query here
        const sql = `
      DELETE FROM sps_users
      WHERE id = $1
      RETURNING id
    `;

        const result = await query(sql, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});

export default router;
