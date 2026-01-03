'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Search, Loader2, MapPin } from 'lucide-react';

interface LeafletMapProps {
    lat: number;
    lng: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

export default function LeafletMap({ lat, lng, onLocationSelect }: LeafletMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerInstance = useRef<any>(null);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);

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
            // Map already exists, just ensure it's visible
            setTimeout(() => {
                if (mapInstance.current) {
                    mapInstance.current.invalidateSize();
                }
            }, 100);
            return;
        }

        const L = (window as any).L;

        try {
            // Initialize Map
            mapInstance.current = L.map(mapRef.current).setView([initialLat, initialLng], 13);

            // Add Tile Layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(mapInstance.current);

            // Initial Marker
            markerInstance.current = L.marker([initialLat, initialLng]).addTo(mapInstance.current);

            // Click Event on Map to Add/Move Marker
            mapInstance.current.on('click', (e: any) => {
                const { lat, lng } = e.latlng;
                updateMarker(lat, lng);
                onLocationSelect(lat, lng);
            });
        } catch (error) {
            console.error('Map initialization failed:', error);
        }

        // Cleanup function
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
                markerInstance.current = null;
            }
        };
    }, [scriptsLoaded, initialLat, initialLng]);

    // Update marker when props change
    useEffect(() => {
        if (mapInstance.current && lat && lng) {
            updateMarker(lat, lng);
            mapInstance.current.panTo([lat, lng]);
        }
    }, [lat, lng]);

    const updateMarker = (latitude: number, longitude: number) => {
        if (!(window as any).L || !mapInstance.current) return;
        const L = (window as any).L;

        if (markerInstance.current) {
            markerInstance.current.setLatLng([latitude, longitude]);
        } else {
            markerInstance.current = L.marker([latitude, longitude]).addTo(mapInstance.current);
        }
    };

    const handleSelectLocation = (result: any) => {
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);

        // Guard: Ensure map is loaded before proceeding
        if (!mapInstance.current) {
            console.warn('Map not yet initialized');
            return;
        }

        updateMarker(newLat, newLng);
        mapInstance.current.setView([newLat, newLng], 15);
        onLocationSelect(newLat, newLng);

        setSearchQuery(result.display_name.split(',')[0]); // Set simplified name
        setShowSuggestions(false);
        setSuggestions([]);
    };

    return (
        <div className="relative w-full h-[400px] bg-slate-100 rounded-lg overflow-hidden border border-border z-0 group">
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

            {/* Search Overlay */}
            <div ref={searchRef} className="absolute top-3 left-12 right-3 z-[400] max-w-sm">
                <div className="relative shadow-lg rounded-lg bg-white">
                    <input
                        type="text"
                        placeholder={!mapInstance.current ? "Loading map..." : "Search location (e.g. Dubai Marina)"}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-200 rounded-lg hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all save-autofill disabled:opacity-50 disabled:cursor-not-allowed"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                            if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        disabled={!mapInstance.current}
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
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
                                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                                    <span className="line-clamp-2 text-foreground/80 group-hover:text-foreground">
                                        {item.display_name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div ref={mapRef} className="w-full h-full z-10" />

            {!scriptsLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-muted-foreground">
                    Loading Map...
                </div>
            )}
        </div>
    );
}
