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
 * @swagger
 * /upload:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload file
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded
 */
router.post('/', upload.single('file'), uploadController.upload);

/**
 * @swagger
 * /upload:
 *   delete:
 *     tags: [Uploads]
 *     summary: Delete file
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: File deleted
 */
router.delete('/', uploadController.remove);

export default router;
