import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// ============================================
// GET /api/v1/images/:filename - Serve protected images (requires authentication)
// ============================================
router.get('/:filename', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        // Security: Prevent directory traversal attacks
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        // Construct file path
        const filepath = path.join(__dirname, '../../uploads', filename);

        // Check if file exists
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Serve the file with appropriate headers
        res.sendFile(filepath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to serve image' });
                }
            }
        });
    } catch (error) {
        console.error('Image serving error:', error);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

// ============================================
// GET /api/v1/images/public/:filename - Serve public images (no authentication required)
// For images that should be accessible to guests (e.g., site logo, public event posters)
// ============================================
router.get('/public/:filename', async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        // Security: Prevent directory traversal attacks
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        // Serve from public subdirectory
        const filepath = path.join(__dirname, '../../uploads/public', filename);

        // Check if file exists
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Serve the file
        res.sendFile(filepath, (err) => {
            if (err) {
                console.error('Error sending public file:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to serve image' });
                }
            }
        });
    } catch (error) {
        console.error('Public image serving error:', error);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

export default router;
