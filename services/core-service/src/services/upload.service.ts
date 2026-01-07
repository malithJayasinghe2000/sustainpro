import { uploadToS3, deleteFromS3, generateS3Key, isS3Configured } from '../storage/s3';
import { BadRequestError, createLogger } from '@sustainpro/shared-utils';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

const logger = createLogger({ service: 'core-service' });

// For local fallback storage
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'public');

export class UploadService {
    /**
     * Upload file (to S3 or local)
     */
    async upload(
        file: Express.Multer.File,
        folder: string,
        organizationId?: string
    ): Promise<{ url: string; key: string }> {
        // Validate file
        if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestError(`File type not allowed: ${file.mimetype}`);
        }

        if (file.size > config.upload.maxFileSize) {
            throw new BadRequestError(`File too large. Maximum size: ${config.upload.maxFileSize} bytes`);
        }

        // Try S3 first
        if (isS3Configured()) {
            const key = generateS3Key(folder, file.originalname, organizationId);
            const url = await uploadToS3(file.buffer, key, file.mimetype);
            
            logger.info('File uploaded to S3', { key, size: file.size });
            
            return { url, key };
        }

        // Fallback to local storage
        return this.uploadLocal(file, folder);
    }

    /**
     * Upload to local storage (fallback)
     */
    private async uploadLocal(
        file: Express.Multer.File,
        folder: string
    ): Promise<{ url: string; key: string }> {
        const uploadDir = path.join(LOCAL_UPLOAD_DIR, folder);
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const filename = `img-${uniqueSuffix}${ext}`;
        const filepath = path.join(uploadDir, filename);

        fs.writeFileSync(filepath, file.buffer);

        const key = `${folder}/${filename}`;
        // URL will be served by the application
        const url = `/api/v1/images/public/${folder}/${filename}`;

        logger.info('File uploaded locally', { key, size: file.size });

        return { url, key };
    }

    /**
     * Delete file
     */
    async delete(key: string): Promise<void> {
        if (isS3Configured()) {
            await deleteFromS3(key);
            logger.info('File deleted from S3', { key });
            return;
        }

        // Local deletion
        const filepath = path.join(LOCAL_UPLOAD_DIR, key);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            logger.info('File deleted locally', { key });
        }
    }
}
