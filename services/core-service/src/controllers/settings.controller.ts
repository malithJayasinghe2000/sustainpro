import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { AppError } from '@sustainpro/shared-utils';

const settingsService = new SettingsService();

/**
 * GET /api/v1/settings
 */
export const get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.get();

        res.json({
            success: true,
            settings,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * GET /api/v1/settings/security
 * Get full security settings (authenticated)
 */
export const getSecurity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.getFullSecuritySettings();

        res.json({
            success: true,
            settings,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/v1/settings/security
 * Update security settings (Super Admin only)
 */
export const updateSecurity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.updateSecuritySettings(req.body);

        res.json({
            success: true,
            settings,
            message: 'Security settings updated',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};

/**
 * GET /api/v1/settings/public
 * Public endpoint for site config
 */
export const getPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.getPublicSettings();

        res.json({
            success: true,
            settings,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/v1/settings
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.update(req.body);

        res.json({
            success: true,
            settings,
            message: 'Settings updated',
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
};
