'use client';

import React, { useState } from 'react';
import { Settings, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

interface ConfigField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'toggle' | 'range';
    value: string | number | boolean;
    options?: { value: string; label: string }[];
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
}

interface DeviceConfigWidgetProps {
    widget: WidgetConfig;
    fields?: ConfigField[];
    isPreview?: boolean;
    onSave?: (config: Record<string, string | number | boolean>) => void;
    isEditing?: boolean;
}

export default function DeviceConfigWidget({ 
    widget, 
    fields, 
    isPreview = false,
    onSave,
    isEditing = false
}: DeviceConfigWidgetProps) {
    const settings = widget.settings;
    const collapsible = settings.collapsible ?? true;
    
    const [isExpanded, setIsExpanded] = useState(!collapsible);
    const [localValues, setLocalValues] = useState<Record<string, string | number | boolean>>({});
    const [isDirty, setIsDirty] = useState(false);

    // Preview fields
    const previewFields: ConfigField[] = [
        { key: 'sampling_rate', label: 'Sampling Rate', type: 'select', value: '5', options: [
            { value: '1', label: '1 second' },
            { value: '5', label: '5 seconds' },
            { value: '30', label: '30 seconds' },
            { value: '60', label: '1 minute' },
        ]},
        { key: 'alert_enabled', label: 'Enable Alerts', type: 'toggle', value: true },
        { key: 'threshold_low', label: 'Low Threshold', type: 'range', value: 20, min: 0, max: 100, unit: '%' },
        { key: 'threshold_high', label: 'High Threshold', type: 'range', value: 80, min: 0, max: 100, unit: '%' },
        { key: 'device_name', label: 'Device Name', type: 'text', value: 'Tank Sensor 01' },
    ];

    const displayFields = isPreview ? previewFields : (fields || []);

    // Initialize local values from fields
    React.useEffect(() => {
        const initial: Record<string, string | number | boolean> = {};
        displayFields.forEach(field => {
            initial[field.key] = field.value;
        });
        setLocalValues(initial);
        setIsDirty(false);
    }, [displayFields]);

    const handleValueChange = (key: string, value: string | number | boolean) => {
        setLocalValues(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
    };

    const handleSave = () => {
        onSave?.(localValues);
        setIsDirty(false);
    };

    const handleReset = () => {
        const initial: Record<string, string | number | boolean> = {};
        displayFields.forEach(field => {
            initial[field.key] = field.value;
        });
        setLocalValues(initial);
        setIsDirty(false);
    };

    const renderField = (field: ConfigField) => {
        const value = localValues[field.key] ?? field.value;

        switch (field.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={value as string}
                        onChange={(e) => handleValueChange(field.key, e.target.value)}
                        disabled={!isEditing && !isPreview}
                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={value as number}
                        min={field.min}
                        max={field.max}
                        step={field.step || 1}
                        onChange={(e) => handleValueChange(field.key, parseFloat(e.target.value))}
                        disabled={!isEditing && !isPreview}
                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                );

            case 'select':
                return (
                    <select
                        value={value as string}
                        onChange={(e) => handleValueChange(field.key, e.target.value)}
                        disabled={!isEditing && !isPreview}
                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                        {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );

            case 'toggle':
                return (
                    <button
                        onClick={() => (isEditing || isPreview) && handleValueChange(field.key, !value)}
                        disabled={!isEditing && !isPreview}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                            value ? 'bg-primary' : 'bg-muted'
                        } disabled:opacity-50`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            value ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                );

            case 'range':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            value={value as number}
                            min={field.min || 0}
                            max={field.max || 100}
                            step={field.step || 1}
                            onChange={(e) => handleValueChange(field.key, parseFloat(e.target.value))}
                            disabled={!isEditing && !isPreview}
                            className="flex-1 accent-primary disabled:opacity-50"
                        />
                        <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                            {value}{field.unit || ''}
                        </span>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div 
                onClick={() => collapsible && setIsExpanded(!isExpanded)}
                className={`flex items-center justify-between p-4 ${collapsible ? 'cursor-pointer hover:bg-muted/50' : ''} border-b border-border`}
            >
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">{widget.title || 'Device Configuration'}</h4>
                </div>
                <div className="flex items-center gap-2">
                    {isDirty && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
                    )}
                    {collapsible && (
                        isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                </div>
            </div>

            {/* Config Fields */}
            {(isExpanded || !collapsible) && (
                <>
                    <div className="flex-1 overflow-auto p-4 space-y-4">
                        {displayFields.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Settings className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">No configuration fields</p>
                            </div>
                        ) : (
                            displayFields.map(field => (
                                <div key={field.key} className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        {field.label}
                                    </label>
                                    {renderField(field)}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Actions */}
                    {(isEditing || isPreview) && displayFields.length > 0 && (
                        <div className="flex items-center gap-2 p-4 border-t border-border bg-muted/30">
                            <button
                                onClick={handleReset}
                                disabled={!isDirty}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-muted-foreground bg-background border border-border rounded hover:bg-muted transition-colors disabled:opacity-50"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!isDirty}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-primary-foreground bg-primary rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                <Save className="w-3 h-3" />
                                Save
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
