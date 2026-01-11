import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { AppError } from '@sustainpro/shared-utils';

const settingsService = new SettingsService();

// Helper function for error handling
const handleError = (error: any, res: Response, next: NextFunction) => {
    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            success: false,
            error: error.message,
        });
        return;
    }
    next(error);
};

// =========================================================================
// SYSTEM SETTINGS
// =========================================================================

export const getSystemSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.getSystemSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const updateSystemSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.updateSystemSettings(req.body);
        res.json({ success: true, data: settings, message: 'System settings updated' });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getPublicSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.getPublicSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        handleError(error, res, next);
    }
};

// =========================================================================
// PASSWORD POLICIES
// =========================================================================

export const getPasswordPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policies = await settingsService.getPasswordPolicies();
        res.json({ success: true, data: policies });
    } catch (error) {
        handleError(error, res, next);
    }
};

/**
 * Get password policies for public frontend validation
 * Returns only the validation rules without sensitive info
 */
export const getPublicPasswordPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policies = await settingsService.getPasswordPolicies();
        // Only return validation-related fields
        const publicPolicies = {
            min_length: policies?.min_length || 8,
            max_length: policies?.max_length || 128,
            require_uppercase: policies?.require_uppercase ?? true,
            require_lowercase: policies?.require_lowercase ?? true,
            require_numbers: policies?.require_numbers ?? true,
            require_special_chars: policies?.require_special_chars ?? true,
            special_chars_allowed: policies?.special_chars_allowed || '!@#$%^&*()_+-=[]{}|;:,.<>?',
        };
        res.json({ success: true, data: publicPolicies });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const updatePasswordPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policies = await settingsService.updatePasswordPolicies(req.body);
        res.json({ success: true, data: policies, message: 'Password policies updated' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// =========================================================================
// SESSION POLICIES
// =========================================================================

export const getSessionPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policies = await settingsService.getSessionPolicies();
        res.json({ success: true, data: policies });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const updateSessionPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policies = await settingsService.updateSessionPolicies(req.body);
        res.json({ success: true, data: policies, message: 'Session policies updated' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// =========================================================================
// LOGIN POLICIES
// =========================================================================

export const getLoginPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policies = await settingsService.getLoginPolicies();
        res.json({ success: true, data: policies });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const updateLoginPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const policies = await settingsService.updateLoginPolicies(req.body);
        res.json({ success: true, data: policies, message: 'Login policies updated' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// =========================================================================
// TWO-FACTOR CONFIG
// =========================================================================

export const getTwoFactorConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const config = await settingsService.getTwoFactorConfig();
        res.json({ success: true, data: config });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const updateTwoFactorConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const config = await settingsService.updateTwoFactorConfig(req.body);
        res.json({ success: true, data: config, message: '2FA configuration updated' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// =========================================================================
// API SECURITY CONFIG
// =========================================================================

export const getApiSecurityConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const config = await settingsService.getApiSecurityConfig();
        res.json({ success: true, data: config });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const updateApiSecurityConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const config = await settingsService.updateApiSecurityConfig(req.body);
        res.json({ success: true, data: config, message: 'API security configuration updated' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// =========================================================================
// SMTP SETTINGS
// =========================================================================

export const getSmtpSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.getSmtpSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const updateSmtpSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.updateSmtpSettings(req.body);
        res.json({ success: true, data: settings, message: 'SMTP settings updated' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// =========================================================================
// NOTIFICATION SETTINGS
// =========================================================================

export const getNotificationSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.getNotificationSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const updateNotificationSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.updateNotificationSettings(req.body);
        res.json({ success: true, data: settings, message: 'Notification settings updated' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// =========================================================================
// EMAIL TEMPLATES
// =========================================================================

export const getEmailTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const templates = await settingsService.getEmailTemplates();
        res.json({ success: true, data: templates });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getEmailTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const template = await settingsService.getEmailTemplate(req.params.code);
        res.json({ success: true, data: template });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const updateEmailTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const template = await settingsService.updateEmailTemplate(req.params.code, req.body);
        res.json({ success: true, data: template, message: 'Email template updated' });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const createEmailTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const template = await settingsService.createEmailTemplate(req.body);
        res.status(201).json({ success: true, data: template, message: 'Email template created' });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const deleteEmailTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await settingsService.deleteEmailTemplate(req.params.code);
        res.json({ success: true, message: 'Email template deleted' });
    } catch (error) {
        handleError(error, res, next);
    }
};

// =========================================================================
// COMBINED ENDPOINTS
// =========================================================================

export const getAllSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.getAllSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        handleError(error, res, next);
    }
};

export const getSecuritySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.getSecuritySettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        handleError(error, res, next);
    }
};
