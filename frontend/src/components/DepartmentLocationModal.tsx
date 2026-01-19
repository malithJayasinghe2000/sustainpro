'use client';

import { useState, useCallback } from 'react';
import { Layers, MapPin, Check, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import departmentsApi from '@/lib/api'; // Ensure this path is correct based on your project structure

import dynamic from 'next/dynamic';

// Dynamically import Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { ssr: false });

interface DepartmentTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
}

interface DepartmentLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: DepartmentTemplate;
    eventLocation: { lat: number; lng: number };
    onConfirm: (coords: any[], locationName: string) => void;
}

export default function DepartmentLocationModal({ isOpen, onClose, template, eventLocation, onConfirm }: DepartmentLocationModalProps) {
    const [locationName, setLocationName] = useState('');

    // Restore missing state and handlers
    const defaultBox = [
        [(eventLocation?.lat || 25.2048) + 0.002, (eventLocation?.lng || 55.2708) - 0.002],
        [(eventLocation?.lat || 25.2048) + 0.002, (eventLocation?.lng || 55.2708) + 0.002],
        [(eventLocation?.lat || 25.2048) - 0.002, (eventLocation?.lng || 55.2708) + 0.002],
        [(eventLocation?.lat || 25.2048) - 0.002, (eventLocation?.lng || 55.2708) - 0.002]
    ] as [number, number][];

    const [polygonPoints, setPolygonPoints] = useState<[number, number][]>(defaultBox);

    const handlePolygonUpdate = useCallback((points: [number, number][]) => {
        setPolygonPoints(points);
    }, []);

    const handleLocationSelect = useCallback(() => { }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-4xl rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200">
                            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div>
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <span className="text-muted-foreground">Add:</span> {template.name}
                            </h2>
                            <p className="text-sm text-muted-foreground">Define the department's area on the map</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">
                            Click points to draw area
                        </span>
                    </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative min-h-[400px]">
                    <LeafletMap
                        lat={eventLocation?.lat || 25.2048}
                        lng={eventLocation?.lng || 55.2708}
                        onLocationSelect={handleLocationSelect}
                        drawingMode={true}
                        initialPolygonPoints={
                            // Default to a box around location if no existing selection
                            [
                                [(eventLocation?.lat || 25.2048) + 0.002, (eventLocation?.lng || 55.2708) - 0.002],
                                [(eventLocation?.lat || 25.2048) + 0.002, (eventLocation?.lng || 55.2708) + 0.002],
                                [(eventLocation?.lat || 25.2048) - 0.002, (eventLocation?.lng || 55.2708) + 0.002],
                                [(eventLocation?.lat || 25.2048) - 0.002, (eventLocation?.lng || 55.2708) - 0.002]
                            ] as [number, number][]
                        }
                        onPolygonChange={handlePolygonUpdate}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex-1 w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Enter zone/location name (e.g., North Wing)"
                            className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                        />
                        <div className="text-xs text-muted-foreground mt-1 ml-1">
                            {polygonPoints.length === 0
                                ? "Click on map to draw area"
                                : `${polygonPoints.length} points selected`
                            }
                        </div>
                    </div>

                    <div className="flex gap-3 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 hover:bg-muted text-foreground rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(polygonPoints, locationName)}
                            disabled={polygonPoints.length < 3 || !locationName.trim()}
                            className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Confirm & Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
