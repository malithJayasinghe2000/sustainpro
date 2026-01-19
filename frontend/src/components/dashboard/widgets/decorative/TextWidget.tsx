'use client';

import React from 'react';
import { WidgetConfig } from '@/types/dashboard';

interface TextWidgetProps {
    widget: WidgetConfig;
    isPreview?: boolean;
}

export default function TextWidget({ widget, isPreview = false }: TextWidgetProps) {
    const settings = widget.settings;
    
    const text = settings.text || widget.title || 'Sample Text';
    const fontSize = settings.fontSize || 16;
    const fontWeight = settings.fontWeight || 'normal';
    const fontColor = settings.fontColor || 'inherit';
    const fontFamily = settings.fontFamily || 'inherit';
    const textAlign = settings.textAlign || 'left';
    const backgroundColor = settings.backgroundColor || 'transparent';
    const padding = settings.padding ?? 16;
    const borderRadius = settings.borderRadius ?? 8;

    return (
        <div 
            className="h-full flex items-center overflow-hidden"
            style={{
                backgroundColor,
                padding: `${padding}px`,
                borderRadius: `${borderRadius}px`,
                textAlign: textAlign as any,
            }}
        >
            <p
                style={{
                    fontSize: `${fontSize}px`,
                    fontWeight,
                    color: fontColor,
                    fontFamily,
                    width: '100%',
                    margin: 0,
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                }}
            >
                {text}
            </p>
        </div>
    );
}
