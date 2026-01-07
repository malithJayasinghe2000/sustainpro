import { Router } from 'express';
import multer from 'multer';
import * as uploadController from '../controllers/upload.controller';
import { config } from '../config';

const router = Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.upload.maxFileSize,
    },
    fileFilter: (req, file, cb) => {
        if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype}`));
        }
    },
});

/**
 * POST /api/v1/upload
 * Upload a file
 */
router.post('/', upload.single('file'), uploadController.upload);

/**
 * DELETE /api/v1/upload
 * Delete a file
 */
router.delete('/', uploadController.remove);

export default router;
