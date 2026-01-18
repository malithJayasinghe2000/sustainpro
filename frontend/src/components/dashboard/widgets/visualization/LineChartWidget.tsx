'use client';

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

interface DataPoint {
    timestamp: string | Date;
    value: number;
}

interface LineChartWidgetProps {
    widget: WidgetConfig;
    data?: DataPoint[];
    isPreview?: boolean;
}

export default function LineChartWidget({ widget, data, isPreview = false }: LineChartWidgetProps) {
    const settings = widget.settings;
    const lineColor = settings.lineColor || '#3b82f6';
    const fillColor = settings.fillColor || 'rgba(59, 130, 246, 0.1)';
    const showGrid = settings.showGrid !== false;
    const showDots = settings.showDots ?? true;
    const showTrend = settings.showTrend ?? true;
    const unit = settings.unit || '';
    const decimals = settings.decimals ?? 1;

    // Generate preview data if needed
    const previewData: DataPoint[] = useMemo(() => {
        const now = new Date();
        return Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(now.getTime() - (23 - i) * 3600000).toISOString(),
            value: 50 + Math.sin(i * 0.5) * 20 + Math.random() * 10
        }));
    }, []);

    const displayData = isPreview ? previewData : (data || []);

    // Calculate chart dimensions
    const chartHeight = 120;
    const chartWidth = 280;
    const padding = { top: 10, right: 10, bottom: 20, left: 10 };

    // Calculate min/max for scaling
    const values = displayData.map(d => d.value);
    const minValue = Math.min(...values) * 0.9;
    const maxValue = Math.max(...values) * 1.1;
    const valueRange = maxValue - minValue || 1;

    // Generate path
    const points = displayData.map((d, i) => {
        const x = padding.left + (i / (displayData.length - 1 || 1)) * (chartWidth - padding.left - padding.right);
        const y = chartHeight - padding.bottom - ((d.value - minValue) / valueRange) * (chartHeight - padding.top - padding.bottom);
        return { x, y, value: d.value };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;

    // Calculate trend
    const trend = useMemo(() => {
        if (displayData.length < 2) return { direction: 'stable', percentage: 0 };
        const firstHalf = displayData.slice(0, Math.floor(displayData.length / 2));
        const secondHalf = displayData.slice(Math.floor(displayData.length / 2));
        const avgFirst = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;
        const change = ((avgSecond - avgFirst) / avgFirst) * 100;
        return {
            direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
            percentage: Math.abs(change).toFixed(1)
        };
    }, [displayData]);

    // Current value
    const currentValue = displayData[displayData.length - 1]?.value ?? 0;

    return (
        <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground">{widget.title || 'Line Chart'}</h4>
                {showTrend && (
                    <div className={`flex items-center gap-1 text-xs ${
                        trend.direction === 'up' ? 'text-green-500' : 
                        trend.direction === 'down' ? 'text-red-500' : 
                        'text-muted-foreground'
                    }`}>
                        {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : 
                         trend.direction === 'down' ? <TrendingDown className="w-3 h-3" /> : 
                         <Minus className="w-3 h-3" />}
                        <span>{trend.percentage}%</span>
                    </div>
                )}
            </div>

            {/* Current Value */}
            <div className="mb-2">
                <span className="text-2xl font-bold text-foreground">
                    {currentValue.toFixed(decimals)}
                </span>
                {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
                    {/* Grid Lines */}
                    {showGrid && (
                        <g className="text-border">
                            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                                const y = padding.top + ratio * (chartHeight - padding.top - padding.bottom);
                                return (
                                    <line
                                        key={ratio}
                                        x1={padding.left}
                                        y1={y}
                                        x2={chartWidth - padding.right}
                                        y2={y}
                                        stroke="currentColor"
                                        strokeWidth="0.5"
                                        strokeDasharray="4 4"
                                        opacity={0.3}
                                    />
                                );
                            })}
                        </g>
                    )}

                    {/* Area Fill */}
                    {displayData.length > 0 && (
                        <path
                            d={areaPath}
                            fill={fillColor}
                        />
                    )}

                    {/* Line */}
                    {displayData.length > 0 && (
                        <path
                            d={linePath}
                            fill="none"
                            stroke={lineColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Dots */}
                    {showDots && points.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r="3"
                            fill={lineColor}
                            className="opacity-0 hover:opacity-100 transition-opacity"
                        />
                    ))}

                    {/* Last Point Highlight */}
                    {points.length > 0 && (
                        <g>
                            <circle
                                cx={points[points.length - 1].x}
                                cy={points[points.length - 1].y}
                                r="4"
                                fill={lineColor}
                            />
                            <circle
                                cx={points[points.length - 1].x}
                                cy={points[points.length - 1].y}
                                r="6"
                                fill={lineColor}
                                opacity={0.3}
                            />
                        </g>
                    )}
                </svg>
            </div>

            {/* Time Range */}
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>24h ago</span>
                <span>Now</span>
            </div>
        </div>
    );
}
