'use client';

import React, { useState } from 'react';
import { Sliders, Save, RotateCcw } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

interface ThresholdValue {
    paramKey: string;
    paramName: string;
    min?: number;
    max?: number;
    low?: number;
    high?: number;
    unit?: string;
}

interface ThresholdEditorWidgetProps {
    widget: WidgetConfig;
    thresholds?: ThresholdValue[];
    isPreview?: boolean;
    onSave?: (thresholds: ThresholdValue[]) => void;
    readOnly?: boolean;
}

export default function ThresholdEditorWidget({ 
    widget, 
    thresholds, 
    isPreview = false,
    onSave,
    readOnly = false 
}: ThresholdEditorWidgetProps) {
    const settings = widget.settings;
    const allowUserEdit = settings.allowUserEdit !== false && !readOnly;

    // Preview data
    const previewThresholds: ThresholdValue[] = [
        { paramKey: 'water_level', paramName: 'Water Level', min: 0, max: 100, low: 20, high: 80, unit: '%' },
        { paramKey: 'temperature', paramName: 'Temperature', min: -10, max: 50, low: 15, high: 35, unit: '°C' },
    ];

    const initialThresholds = isPreview ? previewThresholds : (thresholds || []);
    const [localThresholds, setLocalThresholds] = useState<ThresholdValue[]>(initialThresholds);
    const [hasChanges, setHasChanges] = useState(false);

    const handleValueChange = (index: number, field: 'low' | 'high', value: number) => {
        const updated = [...localThresholds];
        updated[index] = { ...updated[index], [field]: value };
        setLocalThresholds(updated);
        setHasChanges(true);
    };

    const handleSave = () => {
        if (onSave) {
            onSave(localThresholds);
            setHasChanges(false);
        }
    };

    const handleReset = () => {
        setLocalThresholds(initialThresholds);
        setHasChanges(false);
    };

    return (
        <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">{widget.title || 'Thresholds'}</h4>
                </div>
                {allowUserEdit && hasChanges && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleReset}
                            className="p-1.5 hover:bg-muted rounded transition-colors"
                            title="Reset"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                            onClick={handleSave}
                            className="p-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                            title="Save"
                        >
                            <Save className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Threshold Sliders */}
            <div className="flex-1 overflow-auto space-y-4">
                {localThresholds.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No parameters configured
                    </div>
                ) : (
                    localThresholds.map((threshold, index) => (
                        <div key={threshold.paramKey} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{threshold.paramName}</span>
                                <span className="text-xs text-muted-foreground">
                                    {threshold.low} - {threshold.high} {threshold.unit}
                                </span>
                            </div>
                            
                            {/* Dual range visualization */}
                            <div className="relative h-8 bg-muted/50 rounded-lg overflow-hidden">
                                {/* Range bar */}
                                <div 
                                    className="absolute h-full bg-gradient-to-r from-green-500/30 via-amber-500/30 to-red-500/30"
                                    style={{ 
                                        left: '0%',
                                        width: '100%'
                                    }}
                                />
                                
                                {/* Low threshold marker */}
                                <div 
                                    className="absolute h-full w-1 bg-amber-500"
                                    style={{ 
                                        left: `${((threshold.low || 0) - (threshold.min || 0)) / ((threshold.max || 100) - (threshold.min || 0)) * 100}%`
                                    }}
                                />
                                
                                {/* High threshold marker */}
                                <div 
                                    className="absolute h-full w-1 bg-red-500"
                                    style={{ 
                                        left: `${((threshold.high || 100) - (threshold.min || 0)) / ((threshold.max || 100) - (threshold.min || 0)) * 100}%`
                                    }}
                                />

                                {/* Labels */}
                                <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-muted-foreground">
                                    <span>{threshold.min}</span>
                                    <span>{threshold.max}</span>
                                </div>
                            </div>

                            {/* Input controls */}
                            {allowUserEdit && (
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Low</label>
                                        <input
                                            type="number"
                                            value={threshold.low || 0}
                                            onChange={(e) => handleValueChange(index, 'low', parseFloat(e.target.value))}
                                            min={threshold.min}
                                            max={threshold.high}
                                            className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">High</label>
                                        <input
                                            type="number"
                                            value={threshold.high || 100}
                                            onChange={(e) => handleValueChange(index, 'high', parseFloat(e.target.value))}
                                            min={threshold.low}
                                            max={threshold.max}
                                            className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
