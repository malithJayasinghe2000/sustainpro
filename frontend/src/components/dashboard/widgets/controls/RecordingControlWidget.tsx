'use client';

import React, { useState } from 'react';
import { Circle, Square, Clock, Play, Pause } from 'lucide-react';
import { WidgetConfig } from '@/types/dashboard';

interface RecordingControlWidgetProps {
    widget: WidgetConfig;
    isRecording?: boolean;
    recordingDuration?: number; // seconds
    isPreview?: boolean;
    onToggle?: (start: boolean) => void;
}

export default function RecordingControlWidget({ 
    widget, 
    isRecording = false,
    recordingDuration = 0,
    isPreview = false,
    onToggle 
}: RecordingControlWidgetProps) {
    const settings = widget.settings;
    const showDuration = settings.showDuration !== false;
    
    const [localRecording, setLocalRecording] = useState(isPreview ? true : isRecording);
    const [localDuration, setLocalDuration] = useState(isPreview ? 3725 : recordingDuration);

    // Format duration as HH:MM:SS
    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleToggle = () => {
        if (!isPreview) {
            const newState = !localRecording;
            setLocalRecording(newState);
            if (onToggle) onToggle(newState);
        }
    };

    return (
        <div className="h-full bg-card border border-border rounded-lg p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">{widget.title || 'Recording'}</h4>
                {localRecording && (
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        <span className="text-xs font-medium text-red-500">REC</span>
                    </div>
                )}
            </div>

            {/* Control Area */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                {/* Duration Display */}
                {showDuration && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono text-lg font-medium">
                            {localRecording ? formatDuration(localDuration) : '00:00:00'}
                        </span>
                    </div>
                )}

                {/* Control Button */}
                <button
                    onClick={handleToggle}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        localRecording 
                            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                            : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30'
                    }`}
                >
                    {localRecording ? (
                        <Square className="w-6 h-6 text-white" />
                    ) : (
                        <Circle className="w-6 h-6 text-white fill-white" />
                    )}
                    
                    {/* Pulse ring when recording */}
                    {localRecording && (
                        <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30"></span>
                    )}
                </button>

                {/* Status Text */}
                <p className="text-sm text-muted-foreground">
                    {localRecording ? 'Recording in progress...' : 'Click to start recording'}
                </p>
            </div>
        </div>
    );
}
