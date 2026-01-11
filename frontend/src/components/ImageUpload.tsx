'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { uploadApi } from '@/lib/api';
import toast from 'react-hot-toast';

/**
 * Helper to get full image URL from relative path
 * Handles both deployment and local environment
 */
const getFullImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    // If already a full URL (starts with http/https or data:), return as-is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }

    // Get API base URL from environment and strip /api/v1 suffix if present
    // NEXT_PUBLIC_API_URL is typically http://localhost:8080/api/v1
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1')
        .replace(/\/api\/v1\/?$/, ''); // Remove /api/v1 suffix to get base host

    // Prepend base URL to relative paths
    if (url.startsWith('/')) {
        return `${apiBaseUrl}${url}`;
    }

    return url;
};

interface ImageUploadProps {
    label: string;
    value: string | null | undefined;
    onChange: (url: string) => void;
    placeholder?: string;
    folder?: string;
}

export default function ImageUpload({
    label,
    value,
    onChange,
    placeholder = 'Upload an image',
    folder = 'logos'
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [imageLoadError, setImageLoadError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update preview when value changes
    useEffect(() => {
        const fullUrl = getFullImageUrl(value);
        setPreview(fullUrl);
        setImageLoadError(false); // Reset error state when value changes
    }, [value]);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        try {
            setIsUploading(true);

            // Create preview from file
            const reader = new FileReader();
            reader.onload = (event) => {
                setPreview(event.target?.result as string);
            };
            reader.readAsDataURL(file);

            // Upload file
            const result = await uploadApi.uploadImage(file);

            if (result.success && result.url) {
                // Store the relative URL in state (for DB), but display full URL
                onChange(result.url);
                setPreview(getFullImageUrl(result.url));
                toast.success('Image uploaded successfully');
            } else {
                toast.error(result.error || 'Failed to upload image');
                setPreview(getFullImageUrl(value));
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.error || 'Failed to upload image');
            setPreview(getFullImageUrl(value));
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{label}</label>

            <div className="border-2 border-dashed border-border rounded-lg p-4 transition-colors hover:border-primary/50">
                {preview && !imageLoadError ? (
                    <div className="relative">
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-h-32 mx-auto object-contain rounded-lg"
                            onError={() => setImageLoadError(true)}
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-0 right-0 -mt-2 -mr-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : value && imageLoadError ? (
                    // Show error state with URL when image fails to load
                    <div className="text-center py-4">
                        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <X className="w-7 h-7 text-red-500" />
                        </div>
                        <p className="text-sm text-red-500 mb-2">Failed to load image</p>
                        <p className="text-xs text-muted-foreground break-all">{preview}</p>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="mt-2 px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center py-6 cursor-pointer"
                    >
                        {isUploading ? (
                            <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                        ) : (
                            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                <ImageIcon className="w-7 h-7 text-primary" />
                            </div>
                        )}
                        <p className="text-sm font-medium text-foreground">
                            {isUploading ? 'Uploading...' : placeholder}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, SVG up to 2MB
                        </p>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading}
                />
            </div>

            {/* Optional: Allow manual URL input as fallback */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Or enter URL:</span>
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setPreview(getFullImageUrl(e.target.value));
                    }}
                    placeholder="https://..."
                    className="flex-1 px-2 py-1 bg-background border border-input rounded text-xs focus:ring-1 focus:ring-primary/20 focus:border-primary"
                />
            </div>
        </div>
    );
}

// Export the helper for use in other components
export { getFullImageUrl };
