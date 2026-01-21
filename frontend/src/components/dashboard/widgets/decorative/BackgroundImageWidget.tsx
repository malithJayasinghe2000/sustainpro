'use client';

import React from 'react';
import Image from 'next/image';
import { WidgetConfig } from '@/types/dashboard';

interface BackgroundImageWidgetProps {
    widget: WidgetConfig;
    isPreview?: boolean;
    children?: React.ReactNode;
}

export default function BackgroundImageWidget({ 
    widget, 
    isPreview = false, 
    children 
}: BackgroundImageWidgetProps) {
    const settings = widget.settings;
    const imageUrl = settings.imageUrl || '';
    const objectFit = settings.objectFit || 'cover'; // 'cover' | 'contain' | 'fill' | 'none'
    const objectPosition = settings.objectPosition || 'center'; // 'center' | 'top' | 'bottom' | 'left' | 'right'
    const opacity = settings.opacity ?? 1;
    const overlay = settings.overlay; // optional color overlay
    const overlayOpacity = settings.overlayOpacity ?? 0.5;
    const blur = settings.blur || 0; // blur amount in px
    const borderRadius = settings.borderRadius || 8;

    // Preview placeholder
    const previewPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJhY2tncm91bmQgSW1hZ2U8L3RleHQ+PC9zdmc+';

    const displayUrl = isPreview && !imageUrl ? previewPlaceholder : imageUrl;

    if (!displayUrl) {
        return (
            <div 
                className="h-full bg-muted/30 border border-dashed border-border rounded-lg flex items-center justify-center"
                style={{ borderRadius }}
            >
                <span className="text-sm text-muted-foreground">No image set</span>
            </div>
        );
    }

    return (
        <div 
            className="h-full w-full relative overflow-hidden"
            style={{ borderRadius }}
        >
            {/* Background Image */}
            <div 
                className="absolute inset-0"
                style={{ 
                    opacity,
                    filter: blur > 0 ? `blur(${blur}px)` : undefined,
                }}
            >
                {displayUrl.startsWith('data:') ? (
                    // For data URLs, use regular img tag
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={displayUrl}
                        alt="Background"
                        className="w-full h-full"
                        style={{
                            objectFit: objectFit as React.CSSProperties['objectFit'],
                            objectPosition,
                        }}
                    />
                ) : (
                    // For regular URLs, use Next.js Image
                    <Image
                        src={displayUrl}
                        alt="Background"
                        fill
                        className="object-cover"
                        style={{
                            objectFit: objectFit as React.CSSProperties['objectFit'],
                            objectPosition,
                        }}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized={displayUrl.startsWith('http')}
                    />
                )}
            </div>

            {/* Overlay */}
            {overlay && (
                <div 
                    className="absolute inset-0"
                    style={{ 
                        backgroundColor: overlay,
                        opacity: overlayOpacity,
                    }}
                />
            )}

            {/* Content */}
            {children && (
                <div className="relative z-10 h-full w-full">
                    {children}
                </div>
            )}
        </div>
    );
}
