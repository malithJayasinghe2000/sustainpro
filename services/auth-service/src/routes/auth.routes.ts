import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticateToken } from '@sustainpro/shared-middleware';
import { authLimiter } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Public - Rate limited
 */
router.post(
    '/login',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').notEmpty().withMessage('Password required'),
    ],
    authController.login
);

/**
 * POST /api/v1/auth/logout
 * Public
 */
router.post('/logout', authController.logout);

/**
 * POST /api/v1/auth/refresh
 * Public - Uses HTTP-only cookie
 */
router.post('/refresh', authController.refresh);

/**
 * GET /api/v1/auth/me
 * Protected - Returns current user profile
 */
router.get('/me', authenticateToken, authController.me);

export default router;
