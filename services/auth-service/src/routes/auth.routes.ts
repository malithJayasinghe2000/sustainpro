import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticateToken } from '@sustainpro/shared-middleware';
import { authLimiter } from '@sustainpro/shared-middleware';

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     description: Authenticate user with email and password. May return 2FA challenge.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful or 2FA required
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account locked
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
 * @swagger
 * /auth/verify-2fa:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify 2FA code
 *     description: Complete login by verifying 2FA code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken, code]
 *             properties:
 *               tempToken:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA verification successful
 *       401:
 *         description: Invalid code
 */
router.post(
    '/verify-2fa',
    authLimiter,
    [
        body('tempToken').notEmpty().withMessage('Temporary token required'),
        body('code').notEmpty().isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit code required'),
    ],
    authController.verify2FA
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Revoke refresh token and end session
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout from all devices
 *     description: Revoke all refresh tokens for current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions terminated
 */
router.post('/logout-all', authenticateToken, authController.logoutAll);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Get new access token using refresh token
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user
 *     description: Get authenticated user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, authController.me);

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     tags: [Authentication]
 *     summary: Get active sessions
 *     description: Get list of active sessions/devices for current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved
 */
router.get('/sessions', authenticateToken, authController.getSessions);

/**
 * @swagger
 * /auth/sessions/{sessionId}:
 *   delete:
 *     tags: [Authentication]
 *     summary: Revoke a session
 *     description: Revoke a specific session by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked
 */
router.delete('/sessions/:sessionId', authenticateToken, authController.revokeSession);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change password
 *     description: Change current user's password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
router.post(
    '/change-password',
    authenticateToken,
    [
        body('currentPassword').notEmpty().withMessage('Current password required'),
        body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    ],
    authController.changePassword
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send password reset OTP to email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset code sent if email exists
 */
router.post(
    '/forgot-password',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    ],
    authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with OTP
 *     description: Reset password using OTP received via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired code
 */
router.post(
    '/reset-password',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('code').notEmpty().isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit code required'),
        body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    ],
    authController.resetPassword
);

/**
 * @swagger
 * /auth/request-email-verification:
 *   post:
 *     tags: [Authentication]
 *     summary: Request email verification
 *     description: Send email verification OTP
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Verification code sent
 */
router.post('/request-email-verification', authenticateToken, authController.requestEmailVerification);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email
 *     description: Verify email using OTP
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified
 */
router.post(
    '/verify-email',
    authenticateToken,
    [
        body('code').notEmpty().isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit code required'),
    ],
    authController.verifyEmail
);

/**
 * @swagger
 * /auth/2fa/enable:
 *   post:
 *     tags: [Authentication]
 *     summary: Enable 2FA
 *     description: Enable two-factor authentication for current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA enabled
 */
router.post('/2fa/enable', authenticateToken, authController.enable2FA);

/**
 * @swagger
 * /auth/2fa/disable:
 *   post:
 *     tags: [Authentication]
 *     summary: Disable 2FA
 *     description: Disable two-factor authentication (requires password)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA disabled
 */
router.post(
    '/2fa/disable',
    authenticateToken,
    [
        body('password').notEmpty().withMessage('Password required'),
    ],
    authController.disable2FA
);

export default router;
