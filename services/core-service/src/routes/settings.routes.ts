import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { authenticateToken, requireSuperAdmin } from '@sustainpro/shared-middleware';

const router = Router();

// =========================================================================
// PUBLIC ROUTES (No authentication required)
// =========================================================================

/**
 * @swagger
 * /settings/public:
 *   get:
 *     tags: [Settings]
 *     summary: Get public settings
 *     description: Get public settings for branding (no authentication required)
 */
router.get('/public', settingsController.getPublicSettings);

/**
 * @swagger
 * /settings/security:
 *   get:
 *     tags: [Settings]
 *     summary: Get security settings
 *     description: Get security settings for login page (no authentication required)
 */
router.get('/security', settingsController.getSecuritySettings);

// =========================================================================
// PROTECTED ROUTES (Super Admin only)
// =========================================================================

/**
 * @swagger
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get all settings
 *     description: Get all system configuration settings (Super Admin only)
 */
router.get('/', authenticateToken, requireSuperAdmin, settingsController.getAllSettings);

// -------------------------------------------------------------------------
// SYSTEM SETTINGS
// -------------------------------------------------------------------------

/**
 * @swagger
 * /settings/system:
 *   get:
 *     tags: [Settings]
 *     summary: Get system settings
 */
router.get('/system', authenticateToken, requireSuperAdmin, settingsController.getSystemSettings);

/**
 * @swagger
 * /settings/system:
 *   put:
 *     tags: [Settings]
 *     summary: Update system settings
 */
router.put('/system', authenticateToken, requireSuperAdmin, settingsController.updateSystemSettings);

// -------------------------------------------------------------------------
// PASSWORD POLICIES
// -------------------------------------------------------------------------

/**
 * @swagger
 * /settings/password-policies:
 *   get:
 *     tags: [Settings]
 *     summary: Get password policies
 */
router.get('/password-policies', authenticateToken, requireSuperAdmin, settingsController.getPasswordPolicies);

/**
 * @swagger
 * /settings/password-policies:
 *   put:
 *     tags: [Settings]
 *     summary: Update password policies
 */
router.put('/password-policies', authenticateToken, requireSuperAdmin, settingsController.updatePasswordPolicies);

// -------------------------------------------------------------------------
// SESSION POLICIES
// -------------------------------------------------------------------------

/**
 * @swagger
 * /settings/session-policies:
 *   get:
 *     tags: [Settings]
 *     summary: Get session policies
 */
router.get('/session-policies', authenticateToken, requireSuperAdmin, settingsController.getSessionPolicies);

/**
 * @swagger
 * /settings/session-policies:
 *   put:
 *     tags: [Settings]
 *     summary: Update session policies
 */
router.put('/session-policies', authenticateToken, requireSuperAdmin, settingsController.updateSessionPolicies);

// -------------------------------------------------------------------------
// LOGIN POLICIES
// -------------------------------------------------------------------------

/**
 * @swagger
 * /settings/login-policies:
 *   get:
 *     tags: [Settings]
 *     summary: Get login policies
 */
router.get('/login-policies', authenticateToken, requireSuperAdmin, settingsController.getLoginPolicies);

/**
 * @swagger
 * /settings/login-policies:
 *   put:
 *     tags: [Settings]
 *     summary: Update login policies
 */
router.put('/login-policies', authenticateToken, requireSuperAdmin, settingsController.updateLoginPolicies);

// -------------------------------------------------------------------------
// TWO-FACTOR AUTHENTICATION
// -------------------------------------------------------------------------

/**
 * @swagger
 * /settings/two-factor:
 *   get:
 *     tags: [Settings]
 *     summary: Get 2FA configuration
 */
router.get('/two-factor', authenticateToken, requireSuperAdmin, settingsController.getTwoFactorConfig);

/**
 * @swagger
 * /settings/two-factor:
 *   put:
 *     tags: [Settings]
 *     summary: Update 2FA configuration
 */
router.put('/two-factor', authenticateToken, requireSuperAdmin, settingsController.updateTwoFactorConfig);

// -------------------------------------------------------------------------
// API SECURITY
// -------------------------------------------------------------------------

/**
 * @swagger
 * /settings/api-security:
 *   get:
 *     tags: [Settings]
 *     summary: Get API security configuration
 */
router.get('/api-security', authenticateToken, requireSuperAdmin, settingsController.getApiSecurityConfig);

/**
 * @swagger
 * /settings/api-security:
 *   put:
 *     tags: [Settings]
 *     summary: Update API security configuration
 */
router.put('/api-security', authenticateToken, requireSuperAdmin, settingsController.updateApiSecurityConfig);

// -------------------------------------------------------------------------
// SMTP SETTINGS
// -------------------------------------------------------------------------

/**
 * @swagger
 * /settings/smtp:
 *   get:
 *     tags: [Settings]
 *     summary: Get SMTP settings
 */
router.get('/smtp', authenticateToken, requireSuperAdmin, settingsController.getSmtpSettings);

/**
 * @swagger
 * /settings/smtp:
 *   put:
 *     tags: [Settings]
 *     summary: Update SMTP settings
 */
router.put('/smtp', authenticateToken, requireSuperAdmin, settingsController.updateSmtpSettings);

// -------------------------------------------------------------------------
// NOTIFICATION SETTINGS
// -------------------------------------------------------------------------

/**
 * @swagger
 * /settings/notifications:
 *   get:
 *     tags: [Settings]
 *     summary: Get notification settings
 */
router.get('/notifications', authenticateToken, requireSuperAdmin, settingsController.getNotificationSettings);

/**
 * @swagger
 * /settings/notifications:
 *   put:
 *     tags: [Settings]
 *     summary: Update notification settings
 */
router.put('/notifications', authenticateToken, requireSuperAdmin, settingsController.updateNotificationSettings);

// -------------------------------------------------------------------------
// EMAIL TEMPLATES
// -------------------------------------------------------------------------

/**
 * @swagger
 * /settings/email-templates:
 *   get:
 *     tags: [Settings]
 *     summary: Get all email templates
 */
router.get('/email-templates', authenticateToken, requireSuperAdmin, settingsController.getEmailTemplates);

/**
 * @swagger
 * /settings/email-templates:
 *   post:
 *     tags: [Settings]
 *     summary: Create a new email template
 */
router.post('/email-templates', authenticateToken, requireSuperAdmin, settingsController.createEmailTemplate);

/**
 * @swagger
 * /settings/email-templates/:code:
 *   get:
 *     tags: [Settings]
 *     summary: Get a specific email template
 */
router.get('/email-templates/:code', authenticateToken, requireSuperAdmin, settingsController.getEmailTemplate);

/**
 * @swagger
 * /settings/email-templates/:code:
 *   put:
 *     tags: [Settings]
 *     summary: Update an email template
 */
router.put('/email-templates/:code', authenticateToken, requireSuperAdmin, settingsController.updateEmailTemplate);

/**
 * @swagger
 * /settings/email-templates/:code:
 *   delete:
 *     tags: [Settings]
 *     summary: Delete an email template
 */
router.delete('/email-templates/:code', authenticateToken, requireSuperAdmin, settingsController.deleteEmailTemplate);

export default router;
