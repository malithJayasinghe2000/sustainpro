
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Configure Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Save to public subdirectory for publicly accessible images (logos, etc.)
        const uploadDir = path.join(__dirname, '../../uploads/public');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Unique filename: timestamp-original
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// POST /api/v1/upload
// Only requires authentication - any logged-in user can upload
router.post('/', authenticateToken, upload.single('file'), (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Construct public API URL (no authentication required for public images)
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/api/v1/images/public/${req.file.filename}`;

    res.json({
        message: 'Upload successful',
        url: fileUrl,
        filename: req.file.filename
    });
});

export default router;
