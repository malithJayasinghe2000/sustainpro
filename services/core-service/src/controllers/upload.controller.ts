import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/upload.service';
import { AppError, createLogger } from '@sustainpro/shared-utils';

const uploadService = new UploadService();
const logger = createLogger({ service: 'upload-controller' });

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

        logger.info('Upload request received', { 
            filename: req.file.originalname, 
            size: req.file.size, 
            mimetype: req.file.mimetype,
            folder 
        });

        const result = await uploadService.upload(req.file, folder, organizationId);

        res.json({
            success: true,
            message: 'Upload successful',
            url: result.url,
            key: result.key,
        });
    } catch (error: any) {
        logger.error('Upload failed', { 
            error: error.message, 
            stack: error.stack,
            filename: req.file?.originalname 
        });
        
        if (error instanceof AppError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        
        // Return a proper error message instead of 500
        res.status(500).json({
            success: false,
            error: error.message || 'Upload failed - please try again',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
