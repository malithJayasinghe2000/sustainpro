import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/upload.service';
import { AppError } from '@sustainpro/shared-utils';

const uploadService = new UploadService();

/**
 * POST /api/v1/upload
 */
export const upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
            return;
        }

        const folder = (req.query.folder as string) || 'general';
        const organizationId = req.user?.organization_id || undefined;

        const result = await uploadService.upload(req.file, folder, organizationId);

        res.json({
            success: true,
            message: 'Upload successful',
            url: result.url,
            key: result.key,
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
 * DELETE /api/v1/upload
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { key } = req.body;

        if (!key) {
            res.status(400).json({
                success: false,
                error: 'File key required',
            });
            return;
        }

        await uploadService.delete(key);

        res.json({
            success: true,
            message: 'File deleted',
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
