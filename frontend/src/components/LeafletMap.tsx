'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import { Search, Loader2, MapPin, Move, MousePointer2 } from 'lucide-react';

export interface MapPolygon {
    id: string;
    points: [number, number][];
    color: string;
    name: string;
    onClick?: () => void;
}

interface LeafletMapProps {
    lat: number;
    lng: number;
    onLocationSelect?: (lat: number, lng: number, locationName?: string) => void;
    drawingMode?: boolean;
    onPolygonChange?: (points: [number, number][]) => void;
    initialPolygonPoints?: [number, number][];
    readOnly?: boolean;
    polygons?: MapPolygon[];
    className?: string;
}

export default function LeafletMap({ lat, lng, onLocationSelect, drawingMode, onPolygonChange, initialPolygonPoints, readOnly, polygons = [], className }: LeafletMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerInstance = useRef<any>(null);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Initial Coordinates (Default to Dubai)
    const defaultLat = 25.2048;
    const defaultLng = 55.2708;

    // Use props if available, otherwise default
    const initialLat = lat || defaultLat;
    const initialLng = lng || defaultLng;

    // Reverse geocoding function
    const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
        setIsReverseGeocoding(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`
            );
            const data = await response.json();
            if (data.display_name) {
                if (onLocationSelect) onLocationSelect(latitude, longitude, data.display_name);
                setSearchQuery(data.display_name.split(',')[0]);
            } else {
                if (onLocationSelect) onLocationSelect(latitude, longitude);
            }
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            if (onLocationSelect) onLocationSelect(latitude, longitude);
        } finally {
            setIsReverseGeocoding(false);
        }
    }, [onLocationSelect]);

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced Search Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length > 2) {
                fetchSuggestions(searchQuery);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchSuggestions = async (query: string) => {
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en&limit=5`);
            const data = await response.json();
            setSuggestions(data);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Map search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (!scriptsLoaded || !mapRef.current || !(window as any).L) return;

        // Prevent duplicate initialization
        if (mapInstance.current) {
            // Check if map container is still valid
            if (!mapRef.current) return;

            // Map already exists, ensure it resizes correctly
            setTimeout(() => {
                if (mapInstance.current) {
                    mapInstance.current.invalidateSize();
                }
            }, 200);
            return;
        }

        const L = (window as any).L;

        try {
            // Initialize Map
            mapInstance.current = L.map(mapRef.current).setView([initialLat, initialLng], 13);

            // Add Tile Layer (CartoDB Voyager - Faster & Cleaner)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstance.current);

            // Create custom icon for better visibility
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 3px solid white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: grab;
                    ">
                        <div style="
                            width: 12px;
                            height: 12px;
                            background: white;
                            border-radius: 50%;
                            transform: rotate(45deg);
                        "></div>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 40],
            });

            // Initial Marker - DRAGGABLE
            markerInstance.current = L.marker([initialLat, initialLng], {
                draggable: true,
                icon: customIcon,
                autoPan: true,
            }).addTo(mapInstance.current);

            // Add tooltip to marker
            markerInstance.current.bindTooltip('Drag me to select location', {
                permanent: false,
                direction: 'top',
                offset: [0, -45],
                className: 'marker-tooltip'
            });

            // Marker DRAG END event - performs reverse geocoding
            markerInstance.current.on('dragend', function (e: any) {
                const position = e.target.getLatLng();
                reverseGeocode(position.lat, position.lng);
            });

            // Click Event on Map to Add/Move Marker
            mapInstance.current.on('click', (e: any) => {
                const { lat, lng } = e.latlng;
                if (markerInstance.current) {
                    markerInstance.current.setLatLng([lat, lng]);
                }
                reverseGeocode(lat, lng);
            });

            // Add custom styles for the marker
            const style = document.createElement('style');
            style.textContent = `
                .custom-marker {
                    background: transparent !important;
                    border: none !important;
                }
                .marker-tooltip {
                    background: rgba(0, 0, 0, 0.8) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 6px !important;
                    padding: 6px 12px !important;
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
                }
                .marker-tooltip::before {
                    border-top-color: rgba(0, 0, 0, 0.8) !important;
                }
                .leaflet-marker-icon {
                    transition: transform 0.15s ease;
                }
                .leaflet-marker-icon:hover {
                    transform: scale(1.1);
                }
                .leaflet-marker-draggable {
                    cursor: grab !important;
                }
                .leaflet-marker-draggable:active {
                    cursor: grabbing !important;
                }
            `;
            document.head.appendChild(style);

        } catch (error) {
            console.error('Map initialization failed:', error);
        }



        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
                markerInstance.current = null;
            }
        };
    }, [scriptsLoaded, initialLat, initialLng, reverseGeocode]);

    // Force map resize when visibility or mode changes
    useEffect(() => {
        if (mapInstance.current) {
            setTimeout(() => {
                mapInstance.current.invalidateSize();
            }, 100);
        }
    }, [drawingMode, scriptsLoaded]);

    // Update marker when props change
    useEffect(() => {
        if (mapInstance.current && lat && lng) {
            if (markerInstance.current) {
                markerInstance.current.setLatLng([lat, lng]);
            }
            mapInstance.current.panTo([lat, lng]);
        }
    }, [lat, lng]);

    const handleSelectLocation = (result: any) => {
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);

        if (!mapInstance.current) {
            console.warn('Map not yet initialized');
            return;
        }

        if (drawingMode) {
            // In drawing mode, search selection creates a new point or centers map
            mapInstance.current.setView([newLat, newLng], 18);
            return;
        }

        if (markerInstance.current) {
            markerInstance.current.setLatLng([newLat, newLng]);
        }
        mapInstance.current.setView([newLat, newLng], 15);

        const locationName = result.display_name;
        if (onLocationSelect) onLocationSelect(newLat, newLng, locationName);

        setSearchQuery(result.display_name.split(',')[0]);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    // Drawing Mode Logic
    useEffect(() => {
        if (!mapInstance.current || !drawingMode) return;

        const L = (window as any).L;
        const map = mapInstance.current;

        // Clear existing markers if any (optional, but cleaner)
        if (markerInstance.current) {
            markerInstance.current.remove();
            markerInstance.current = null;
        }

        const handleMapClick = (e: any) => {
            const { lat, lng } = e.latlng;

            // Add point
            setPolygonPoints(prev => {
                const newPoints = [...prev, [lat, lng]] as [number, number][];
                if (onPolygonChangeRef.current) onPolygonChangeRef.current(newPoints);
                return newPoints;
            });
        };

        map.on('click', handleMapClick);

        return () => {
            map.off('click', handleMapClick);
        };
    }, [mapInstance.current, drawingMode]);

    // Polygon Rendering (Single - Editable)
    const polygonLayerRef = useRef<any>(null);
    const [polygonPoints, setPolygonPoints] = useState<[number, number][]>(initialPolygonPoints || []);
    const onPolygonChangeRef = useRef(onPolygonChange);
    const skipLayerUpdateRef = useRef(false);

    // Keep ref in sync
    useEffect(() => {
        onPolygonChangeRef.current = onPolygonChange;
    }, [onPolygonChange]);

    // Sync if props change - ONLY if local state is empty to prevent overwriting user edits on parent re-render
    useEffect(() => {
        if (initialPolygonPoints && initialPolygonPoints.length > 0 && polygonPoints.length === 0) {
            setPolygonPoints(initialPolygonPoints);
        }
    }, [initialPolygonPoints]);

    useEffect(() => {
        if (!mapInstance.current || !(window as any).L) return;

        // Skip updating layers if the change came from an internal drag event
        if (skipLayerUpdateRef.current) {
            skipLayerUpdateRef.current = false;
            return;
        }

        const L = (window as any).L;
        const map = mapInstance.current;

        // Ensure layer group exists
        if (!polygonLayerRef.current) {
            polygonLayerRef.current = L.featureGroup().addTo(map);
        } else if (!map.hasLayer(polygonLayerRef.current)) {
            polygonLayerRef.current.addTo(map);
        }

        const layerGroup = polygonLayerRef.current;
        layerGroup.clearLayers();

        // MODE 1: Viewing Multiple Polygons (Read Only)
        if (polygons && polygons.length > 0) {
            polygons.forEach(poly => {
                if (!poly.points || poly.points.length === 0) return;

                const polygonLayer = L.polygon(poly.points, {
                    color: poly.color || '#3B82F6',
                    weight: 2,
                    opacity: 0.8,
                    fillColor: poly.color || '#3B82F6',
                    fillOpacity: 0.2, // Lighter fill
                    lineJoin: 'round'
                }).addTo(layerGroup);

                // Add Tooltip
                polygonLayer.bindTooltip(poly.name, {
                    permanent: false,
                    direction: 'center',
                    className: 'polygon-tooltip'
                });

                // Add Popup
                polygonLayer.bindPopup(`
                    <div class="text-sm font-semibold">${poly.name}</div>
                `);

                // Click Handler
                if (poly.onClick) {
                    polygonLayer.on('click', (e: any) => {
                        L.DomEvent.stopPropagation(e);
                        poly.onClick?.();
                    });
                }
            });

            // If not drawing, fit bounds to show all polygons if they exist
            if (!drawingMode && polygons.length > 0) {
                try {
                    const bounds = layerGroup.getBounds();
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [50, 50] });
                    }
                } catch (e) {
                    // Ignore bounds error
                }
            }

            return; // Skip editable polygon logic if we are just showing polygons
        }


        // MODE 2: Editable Single Polygon (Drawing Mode)
        if (!drawingMode) return;

        // 1. Draw the Polygon (Fill & Stroke)
        let polygon: any = null;
        if (polygonPoints.length > 0) {
            polygon = L.polygon(polygonPoints, {
                color: '#10B981',      // Emerald-500
                weight: 4,
                opacity: 0.8,
                fillColor: '#10B981',
                fillOpacity: 0.3,
                lineJoin: 'round'
            }).addTo(layerGroup);
        }

        // 2. Draw Draggable Vertex Markers
        const vertexIcon = L.divIcon({
            className: 'custom-vertex-marker',
            html: `
                <div style="
                    width: 24px;
                    height: 24px;
                    background: white;
                    border: 4px solid #10B981; 
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    cursor: move;
                "></div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });

        const markers: any[] = [];

        polygonPoints.forEach((point, index) => {
            const marker = L.marker(point, {
                icon: vertexIcon,
                draggable: true
            }).addTo(layerGroup);

            markers.push(marker);

            // Handle Dragging - IMPERATIVE UPDATE ONLY
            marker.on('drag', (e: any) => {
                if (polygon) {
                    // Get all current marker positions
                    const newLatLngs = markers.map(m => m.getLatLng());
                    // Update the polygon shape visually immediately, without triggering React state update
                    polygon.setLatLngs(newLatLngs);
                }
            });

            marker.on('dragend', (e: any) => {
                // Finalize the change
                const newLatLngs = markers.map(m => m.getLatLng());
                const newPoints = newLatLngs.map((ll: any) => [ll.lat, ll.lng]);

                // Signal the effect to skip regenerating layers since they are already in place
                skipLayerUpdateRef.current = true;

                // Update react state once drag is done
                setPolygonPoints(newPoints as [number, number][]);
                if (onPolygonChangeRef.current) onPolygonChangeRef.current(newPoints as [number, number][]);
            });

            // Context menu to remove point
            marker.on('contextmenu', (e: any) => {
                L.DomEvent.stopPropagation(e);
                const newPoints = polygonPoints.filter((_, i) => i !== index);
                setPolygonPoints(newPoints);
                if (onPolygonChangeRef.current) onPolygonChangeRef.current(newPoints);
            });
        });

    }, [polygonPoints, drawingMode, scriptsLoaded, polygons]);

    return (
        <div className={`relative w-full bg-slate-100 rounded-lg overflow-hidden border border-border z-0 group ${className || 'h-[400px]'}`}>
            {/* Leaflet CSS */}
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                crossOrigin=""
            />

            {/* Leaflet JS */}
            <Script
                src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                crossOrigin=""
                onLoad={() => setScriptsLoaded(true)}
            />

            {/* Search Overlay - Only show if not readOnly */}
            {!readOnly && (
                <div ref={searchRef} className="absolute top-3 left-12 right-3 z-[400] max-w-md">
                    <div className="relative shadow-lg rounded-lg bg-white">
                        <input
                            type="text"
                            placeholder={!scriptsLoaded ? "Loading map..." : "Search location (e.g. Dubai Marina, Burj Khalifa)"}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent border border-gray-200 rounded-lg hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all save-autofill disabled:opacity-50 disabled:cursor-not-allowed"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                            disabled={!scriptsLoaded}
                        />
                        <div className="absolute left-3 top-3 text-gray-400">
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </div>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                {suggestions.map((item, index) => (
                                    <button
                                        key={index}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-gray-50 last:border-0 transition-colors flex items-start gap-3 group"
                                        onClick={() => handleSelectLocation(item)}
                                    >
                                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors shrink-0" />
                                        <span className="line-clamp-2 text-foreground/80 group-hover:text-foreground">
                                            {item.display_name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Instructions Overlay */}
            <div className="absolute bottom-3 left-3 right-3 z-[400] flex items-center justify-center gap-4 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg flex items-center gap-6 text-xs text-muted-foreground border border-border/50">
                    <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-primary" />
                        <span>Search location</span>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-2">
                        <MousePointer2 className="w-3.5 h-3.5 text-primary" />
                        <span>Click on map</span>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-2">
                        <Move className="w-3.5 h-3.5 text-primary" />
                        <span>Drag marker</span>
                    </div>
                </div>
            </div>

            {/* Reverse Geocoding Indicator */}
            {isReverseGeocoding && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[400] bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg flex items-center gap-2 text-sm text-muted-foreground border border-border/50">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Getting location details...</span>
                </div>
            )}

            <div ref={mapRef} className="w-full h-full z-10" />

            {!scriptsLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-muted-foreground gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">Loading Map...</span>
                </div>
            )}
        </div>
    );
}
