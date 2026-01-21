'use client';

import React from 'react';
import { WidgetConfig } from '@/types/dashboard';

interface ContainerWidgetProps {
    widget: WidgetConfig;
    children?: React.ReactNode;
    isPreview?: boolean;
}

export default function ContainerWidget({ widget, children, isPreview = false }: ContainerWidgetProps) {
    const settings = widget.settings;
    const backgroundColor = settings.backgroundColor || 'transparent';
    const borderColor = settings.borderColor;
    const borderWidth = settings.borderWidth || 0;
    const borderRadius = settings.borderRadius || 8;
    const padding = settings.padding || 16;
    const shadow = settings.shadow; // 'none' | 'sm' | 'md' | 'lg' | 'xl'
    const showTitle = settings.showTitle ?? false;
    const titlePosition = settings.titlePosition || 'top'; // 'top' | 'bottom'

    const getShadowClass = () => {
        switch (shadow) {
            case 'sm': return 'shadow-sm';
            case 'md': return 'shadow-md';
            case 'lg': return 'shadow-lg';
            case 'xl': return 'shadow-xl';
            default: return '';
        }
    };

    return (
        <div 
            className={`h-full w-full flex flex-col ${getShadowClass()}`}
            style={{
                backgroundColor,
                borderColor,
                borderWidth: borderWidth > 0 ? borderWidth : undefined,
                borderStyle: borderWidth > 0 ? 'solid' : undefined,
                borderRadius,
                padding,
            }}
        >
            {/* Title (top) */}
            {showTitle && titlePosition === 'top' && widget.title && (
                <h4 
                    className="text-sm font-medium mb-2"
                    style={{ color: settings.titleColor }}
                >
                    {widget.title}
                </h4>
            )}

            {/* Content */}
            <div className="flex-1 min-h-0">
                {children || (
                    isPreview && (
                        <div className="h-full border-2 border-dashed border-border rounded flex items-center justify-center text-muted-foreground text-sm">
                            Container - Drop widgets here
                        </div>
                    )
                )}
            </div>

            {/* Title (bottom) */}
            {showTitle && titlePosition === 'bottom' && widget.title && (
                <h4 
                    className="text-sm font-medium mt-2"
                    style={{ color: settings.titleColor }}
                >
                    {widget.title}
                </h4>
            )}
        </div>
    );
}
