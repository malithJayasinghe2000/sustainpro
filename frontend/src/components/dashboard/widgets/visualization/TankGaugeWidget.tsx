'use client';

import React from 'react';
import { Droplet, AlertTriangle, CheckCircle } from 'lucide-react';
import { WidgetConfig, TANK_COLORS } from '@/types/dashboard';

interface TankGaugeWidgetProps {
    widget: WidgetConfig;
    value?: number;
    isPreview?: boolean;
}

export default function TankGaugeWidget({ widget, value, isPreview = false }: TankGaugeWidgetProps) {
    const settings = widget.settings;
    const tankType = settings.tankType || 'water';
    const minValue = settings.minValue ?? 0;
    const maxValue = settings.maxValue ?? 100;
    const showBubbles = settings.showBubbles !== false;
    const showPercentage = settings.showPercentage !== false;
    const thresholds = settings.thresholds || { low: 20, high: 80 };

    // Calculate fill percentage
    const displayValue = isPreview ? 65 : (value ?? 0);
    const percentage = Math.min(100, Math.max(0, ((displayValue - minValue) / (maxValue - minValue)) * 100));

    // Get colors based on tank type
    const colors = TANK_COLORS[tankType] || TANK_COLORS.water;

    // Determine status based on thresholds
    const getStatus = () => {
        if (percentage <= (thresholds.low || 20)) return 'low';
        if (percentage >= (thresholds.high || 80)) return 'high';
        return 'normal';
    };
    const status = getStatus();

    return (
        <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">{widget.title}</h4>
                <div className={`p-1.5 rounded-lg ${status === 'low' ? 'bg-red-100 text-red-600' : status === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    {status === 'low' ? <AlertTriangle className="w-4 h-4" /> : <Droplet className="w-4 h-4" />}
                </div>
            </div>

            {/* Tank Visualization */}
            <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full max-w-[120px] aspect-[3/4]">
                    {/* Tank outline */}
                    <svg viewBox="0 0 100 140" className="w-full h-full">
                        {/* Tank body - rounded rectangle */}
                        <rect
                            x="10"
                            y="20"
                            width="80"
                            height="110"
                            rx="10"
                            ry="10"
                            fill="none"
                            stroke={colors.border}
                            strokeWidth="3"
                            className="opacity-30"
                        />
                        
                        {/* Tank top */}
                        <rect
                            x="30"
                            y="5"
                            width="40"
                            height="20"
                            rx="4"
                            fill="none"
                            stroke={colors.border}
                            strokeWidth="2"
                            className="opacity-30"
                        />

                        {/* Fill area with clip path */}
                        <defs>
                            <clipPath id={`tank-clip-${widget.id}`}>
                                <rect
                                    x="12"
                                    y="22"
                                    width="76"
                                    height="106"
                                    rx="8"
                                />
                            </clipPath>
                        </defs>

                        {/* Liquid fill */}
                        <g clipPath={`url(#tank-clip-${widget.id})`}>
                            <rect
                                x="12"
                                y={22 + (106 * (1 - percentage / 100))}
                                width="76"
                                height={106 * (percentage / 100)}
                                fill={colors.fill}
                                className="transition-all duration-700 ease-out"
                            />
                            
                            {/* Wave animation */}
                            <path
                                d={`M 12 ${22 + (106 * (1 - percentage / 100))} 
                                    Q 30 ${22 + (106 * (1 - percentage / 100)) - 5} 50 ${22 + (106 * (1 - percentage / 100))}
                                    T 88 ${22 + (106 * (1 - percentage / 100))}
                                    L 88 128 L 12 128 Z`}
                                fill={colors.wave}
                                className="animate-pulse opacity-60"
                            />

                            {/* Bubbles */}
                            {showBubbles && percentage > 10 && (
                                <>
                                    <circle cx="30" cy={100 - percentage * 0.3} r="3" fill="white" className="opacity-40 animate-bounce" style={{ animationDelay: '0s' }} />
                                    <circle cx="50" cy={110 - percentage * 0.5} r="2" fill="white" className="opacity-30 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    <circle cx="70" cy={95 - percentage * 0.4} r="2.5" fill="white" className="opacity-35 animate-bounce" style={{ animationDelay: '0.4s' }} />
                                </>
                            )}
                        </g>

                        {/* Level markers */}
                        <line x1="5" y1="50" x2="10" y2="50" stroke={colors.border} strokeWidth="1" className="opacity-40" />
                        <line x1="5" y1="75" x2="10" y2="75" stroke={colors.border} strokeWidth="1" className="opacity-40" />
                        <line x1="5" y1="100" x2="10" y2="100" stroke={colors.border} strokeWidth="1" className="opacity-40" />
                    </svg>

                    {/* Percentage overlay */}
                    {showPercentage && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold text-white drop-shadow-lg">
                                {Math.round(percentage)}%
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer with value */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {tankType}
                </span>
                <span className="text-sm font-semibold">
                    {displayValue.toLocaleString()} / {maxValue.toLocaleString()}
                </span>
            </div>
        </div>
    );
}
