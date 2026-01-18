'use client';

import React from 'react';
import { WidgetConfig, DEFAULT_GAUGE_COLORS } from '@/types/dashboard';

interface CircularGaugeWidgetProps {
    widget: WidgetConfig;
    value?: number;
    isPreview?: boolean;
}

export default function CircularGaugeWidget({ widget, value, isPreview = false }: CircularGaugeWidgetProps) {
    const settings = widget.settings;
    const minValue = settings.minValue ?? 0;
    const maxValue = settings.maxValue ?? 100;
    const gaugeType = settings.gaugeType || 'circular';
    const showValue = settings.showValue !== false;
    const showNeedle = settings.showNeedle !== false;
    const colors = settings.colors || DEFAULT_GAUGE_COLORS;

    // Calculate percentage
    const displayValue = isPreview ? 72 : (value ?? 0);
    const percentage = Math.min(100, Math.max(0, ((displayValue - minValue) / (maxValue - minValue)) * 100));

    // Determine color based on percentage
    const getColor = () => {
        if (percentage <= 33) return colors.low;
        if (percentage <= 66) return colors.mid;
        return colors.high;
    };

    // SVG parameters based on gauge type
    const getGaugeParams = () => {
        switch (gaugeType) {
            case 'semi-circular':
                return { startAngle: 180, endAngle: 360, cx: 50, cy: 50 };
            case 'arc':
                return { startAngle: 135, endAngle: 405, cx: 50, cy: 55 };
            default: // circular
                return { startAngle: 0, endAngle: 360, cx: 50, cy: 50 };
        }
    };

    const params = getGaugeParams();
    const radius = 40;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    
    // For partial gauges, calculate the arc length
    const arcRange = params.endAngle - params.startAngle;
    const arcLength = (arcRange / 360) * circumference;
    const filledLength = (percentage / 100) * arcLength;

    // Convert angle to SVG arc path
    const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
        const rad = (angle - 90) * Math.PI / 180;
        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad)
        };
    };

    const createArc = (startAngle: number, endAngle: number) => {
        const start = polarToCartesian(params.cx, params.cy, radius, startAngle);
        const end = polarToCartesian(params.cx, params.cy, radius, endAngle);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    };

    // Needle angle calculation
    const needleAngle = params.startAngle + (percentage / 100) * arcRange;

    return (
        <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-muted-foreground truncate">{widget.title}</h4>
            </div>

            {/* Gauge */}
            <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full max-w-[150px] aspect-square">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Background track */}
                        <path
                            d={createArc(params.startAngle, params.endAngle)}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            className="text-muted opacity-20"
                        />

                        {/* Filled arc */}
                        <path
                            d={createArc(params.startAngle, params.startAngle + (percentage / 100) * arcRange)}
                            fill="none"
                            stroke={getColor()}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            className="transition-all duration-700 ease-out"
                        />

                        {/* Needle */}
                        {showNeedle && (
                            <g transform={`rotate(${needleAngle - 90}, ${params.cx}, ${params.cy})`} className="transition-transform duration-700 ease-out">
                                <line
                                    x1={params.cx}
                                    y1={params.cy}
                                    x2={params.cx}
                                    y2={params.cy - radius + 10}
                                    stroke={getColor()}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <circle cx={params.cx} cy={params.cy} r="4" fill={getColor()} />
                            </g>
                        )}

                        {/* Center value */}
                        {showValue && (
                            <text
                                x={params.cx}
                                y={gaugeType === 'semi-circular' ? params.cy + 5 : params.cy + 4}
                                textAnchor="middle"
                                className="fill-foreground text-lg font-bold"
                            >
                                {Math.round(displayValue)}
                            </text>
                        )}

                        {/* Min/Max labels */}
                        {gaugeType !== 'circular' && (
                            <>
                                <text
                                    x={polarToCartesian(params.cx, params.cy, radius + 12, params.startAngle).x}
                                    y={polarToCartesian(params.cx, params.cy, radius + 12, params.startAngle).y}
                                    textAnchor="middle"
                                    className="fill-muted-foreground text-[8px]"
                                >
                                    {minValue}
                                </text>
                                <text
                                    x={polarToCartesian(params.cx, params.cy, radius + 12, params.endAngle).x}
                                    y={polarToCartesian(params.cx, params.cy, radius + 12, params.endAngle).y}
                                    textAnchor="middle"
                                    className="fill-muted-foreground text-[8px]"
                                >
                                    {maxValue}
                                </text>
                            </>
                        )}
                    </svg>
                </div>
            </div>

            {/* Unit */}
            {settings.showUnit && (
                <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">
                    {settings.suffix || 'unit'}
                </div>
            )}
        </div>
    );
}
