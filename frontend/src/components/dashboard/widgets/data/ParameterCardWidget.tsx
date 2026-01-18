'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

interface ParameterCardWidgetProps {
    widget: WidgetConfig;
    value?: number | string;
    previousValue?: number;
    isPreview?: boolean;
}

export default function ParameterCardWidget({ 
    widget, 
    value, 
    previousValue,
    isPreview = false 
}: ParameterCardWidgetProps) {
    const settings = widget.settings;
    const unit = settings.unit || '';
    const decimals = settings.decimals ?? 1;
    const showTrend = settings.showTrend ?? true;
    const showSparkline = settings.showSparkline ?? false;
    const backgroundColor = settings.backgroundColor;
    const valueColor = settings.valueColor;
    const iconName = settings.iconName;
    const compactMode = settings.compactMode ?? false;

    // Preview values
    const previewValue = 75.8;
    const previewPreviousValue = 72.3;

    const displayValue = isPreview ? previewValue : (value ?? 0);
    const displayPrevious = isPreview ? previewPreviousValue : previousValue;

    // Calculate trend
    const trend = React.useMemo(() => {
        if (displayPrevious === undefined || typeof displayValue !== 'number') {
            return { direction: 'stable', percentage: 0, color: 'text-muted-foreground' };
        }
        const change = ((displayValue - displayPrevious) / displayPrevious) * 100;
        if (change > 1) {
            return { direction: 'up', percentage: change.toFixed(1), color: 'text-green-500' };
        } else if (change < -1) {
            return { direction: 'down', percentage: Math.abs(change).toFixed(1), color: 'text-red-500' };
        }
        return { direction: 'stable', percentage: 0, color: 'text-muted-foreground' };
    }, [displayValue, displayPrevious]);

    // Preview sparkline data
    const sparklineData = [45, 52, 48, 61, 58, 65, 72, 68, 75, displayValue as number];

    // Generate sparkline path
    const generateSparkline = () => {
        const width = 60;
        const height = 20;
        const padding = 2;
        const min = Math.min(...sparklineData) * 0.9;
        const max = Math.max(...sparklineData) * 1.1;
        const range = max - min || 1;

        const points = sparklineData.map((val, i) => {
            const x = padding + (i / (sparklineData.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((val - min) / range) * (height - 2 * padding);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        return points;
    };

    if (compactMode) {
        return (
            <div 
                className="h-full bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-2"
                style={{ backgroundColor }}
            >
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{widget.title || 'Parameter'}</p>
                    <div className="flex items-baseline gap-1">
                        <span 
                            className="text-lg font-bold"
                            style={{ color: valueColor }}
                        >
                            {typeof displayValue === 'number' ? displayValue.toFixed(decimals) : displayValue}
                        </span>
                        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
                    </div>
                </div>
                {showTrend && (
                    <div className={`flex items-center gap-0.5 ${trend.color}`}>
                        {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> :
                         trend.direction === 'down' ? <TrendingDown className="w-3 h-3" /> :
                         <Minus className="w-3 h-3" />}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div 
            className="h-full bg-card border border-border rounded-lg p-4 flex flex-col"
            style={{ backgroundColor }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">{widget.title || 'Parameter'}</h4>
                {showSparkline && (
                    <svg width="60" height="20" className="text-primary">
                        <path
                            d={generateSparkline()}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </div>

            {/* Value */}
            <div className="flex-1 flex items-center">
                <div className="flex items-baseline gap-2">
                    <span 
                        className="text-3xl font-bold"
                        style={{ color: valueColor }}
                    >
                        {typeof displayValue === 'number' ? displayValue.toFixed(decimals) : displayValue}
                    </span>
                    {unit && (
                        <span className="text-lg text-muted-foreground">{unit}</span>
                    )}
                </div>
            </div>

            {/* Trend */}
            {showTrend && displayPrevious !== undefined && (
                <div className={`flex items-center gap-1 mt-2 ${trend.color}`}>
                    {trend.direction === 'up' ? (
                        <TrendingUp className="w-4 h-4" />
                    ) : trend.direction === 'down' ? (
                        <TrendingDown className="w-4 h-4" />
                    ) : (
                        <Minus className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                        {trend.percentage}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs previous</span>
                </div>
            )}
        </div>
    );
}
