'use client';

import React from 'react';
import { WidgetConfig } from '@/types/dashboard';
import Image from 'next/image';

interface LogoWidgetProps {
    widget: WidgetConfig;
    isPreview?: boolean;
}

export default function LogoWidget({ widget, isPreview = false }: LogoWidgetProps) {
    const settings = widget.settings;
    
    const logoUrl = settings.logoUrl || '/logo.svg';
    const logoSize = settings.logoSize || 80;
    const logoFit = settings.logoFit || 'contain';
    const backgroundColor = settings.backgroundColor || 'transparent';
    const padding = settings.padding ?? 8;
    const borderRadius = settings.borderRadius ?? 8;

    return (
        <div 
            className="h-full flex items-center justify-center overflow-hidden"
            style={{
                backgroundColor,
                padding: `${padding}px`,
                borderRadius: `${borderRadius}px`,
            }}
        >
            {logoUrl ? (
                <div 
                    className="relative"
                    style={{ 
                        width: logoSize, 
                        height: logoSize,
                    }}
                >
                    <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-full h-full"
                        style={{
                            objectFit: logoFit,
                        }}
                    />
                </div>
            ) : (
                <div 
                    className="flex items-center justify-center bg-muted rounded-lg text-muted-foreground"
                    style={{ width: logoSize, height: logoSize }}
                >
                    <span className="text-xs">Logo</span>
                </div>
            )}
        </div>
    );
}
