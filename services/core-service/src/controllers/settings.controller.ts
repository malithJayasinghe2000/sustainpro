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
 * Public endpoint for login page
 */
export const getSecurity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await settingsService.getSecuritySettings();

        res.json({
            success: true,
            ...settings,
        });
    } catch (error) {
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
