import fs from 'fs/promises';
import path from 'path';

/**
 * Delete a single image file from the uploads directory
 * @param imageUrl - The URL or path of the image (e.g., "/uploads/image.jpg" or "http://domain.com/uploads/image.jpg")
 */
export async function deleteImageFile(imageUrl: string | null | undefined): Promise<void> {
    if (!imageUrl) return;

    try {
        // Extract filename from URL (e.g., /uploads/image.jpg -> image.jpg)
        // Handle both relative paths and full URLs
        const urlParts = imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1];

        if (!filename || filename.includes('..')) {
            console.warn('Invalid image filename:', imageUrl);
            return;
        }

        // Construct the full path to the file
        const filepath = path.join(__dirname, '../../uploads', filename);

        // Delete the file
        await fs.unlink(filepath);
        console.log(`✓ Deleted image: ${filename}`);
    } catch (error: any) {
        // Don't fail the deletion if the image doesn't exist (already deleted or never uploaded)
        if (error.code === 'ENOENT') {
            console.log(`Image file not found (already deleted): ${imageUrl}`);
        } else {
            console.error('Error deleting image:', error.message);
        }
    }
}

/**
 * Delete multiple image files from the uploads directory
 * @param imageUrls - Array of image URLs/paths to delete
 */
export async function deleteMultipleImages(imageUrls: (string | null | undefined)[]): Promise<void> {
    const validUrls = imageUrls.filter(Boolean) as string[];

    if (validUrls.length === 0) return;

    console.log(`Deleting ${validUrls.length} image(s)...`);

    // Use Promise.allSettled to continue even if some deletions fail
    const results = await Promise.allSettled(
        validUrls.map(url => deleteImageFile(url))
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
        console.warn(`Failed to delete ${failed} image(s)`);
    }
}
