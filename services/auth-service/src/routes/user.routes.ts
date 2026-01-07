import { Router } from 'express';
import { body } from 'express-validator';
import * as userController from '../controllers/user.controller';
import { authenticateToken, requireMinRole } from '@sustainpro/shared-middleware';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/users
 * Returns users based on caller's permissions
 */
router.get('/', userController.getAll);

/**
 * GET /api/v1/users/managers/candidates
 * Returns users who can be assigned as managers
 */
router.get('/managers/candidates', userController.getManagerCandidates);

/**
 * GET /api/v1/users/:id
 */
router.get('/:id', userController.getById);

/**
 * POST /api/v1/users
 * Create new user - requires ORG_ADMIN or higher
 */
router.post(
    '/',
    requireMinRole('ORG_ADMIN'),
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('full_name').notEmpty().withMessage('Full name required'),
    ],
    userController.create
);

/**
 * PUT /api/v1/users/:id
 * Update user
 */
router.put('/:id', userController.update);

/**
 * DELETE /api/v1/users/:id
 * Delete user - requires ORG_ADMIN or higher
 */
router.delete('/:id', requireMinRole('ORG_ADMIN'), userController.remove);

export default router;
