'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import { Search, Loader2, MapPin, Move, MousePointer2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface MapPolygon {
    id: string;
    points: [number, number][]; // [lat, lng]
    color: string;
    name: string;
    onClick?: () => void;
}

interface GoogleMapProps {
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

const GOOGLE_MAPS_API_KEY = 'AIzaSyCk9z3k8cz8shoHoAt0MiHnuwnT_bGf4Ac'; // Provided by user

declare global {
    interface Window {
        google: any;
        initMap: () => void;
    }
}

export default function GoogleMap({
    lat,
    lng,
    onLocationSelect,
    drawingMode,
    onPolygonChange,
    initialPolygonPoints,
    readOnly,
    polygons = [],
    className
}: GoogleMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerInstance = useRef<any>(null);
    const drawingManagerInstance = useRef<any>(null);
    const polygonInstances = useRef<any[]>([]);
    const currentDrawingPolygon = useRef<any>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const autocompleteInstance = useRef<any>(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Default to Dubai if lat/lng are 0 or missing
    const defaultLat = 25.2048;
    const defaultLng = 55.2708;

    // Ensure valid coordinates
    const initialLat = lat || defaultLat;
    const initialLng = lng || defaultLng;

    // Load Google Maps Script
    useEffect(() => {
        if (window.google && window.google.maps) {
            setIsLoaded(true);
            return;
        }

        // Define callback
        window.initMap = () => {
            setIsLoaded(true);
        };
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!isLoaded || !mapRef.current) return;

        // Prevent double init
        if (mapInstance.current) {
            // Update center if needed, but don't re-init
            return;
        }

        try {
            const google = window.google;

            const mapOptions = {
                center: { lat: initialLat, lng: initialLng },
                zoom: 13,
                mapTypeControl: false,
                fullscreenControl: false,
                streetViewControl: false,
                styles: [
                    {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                    }
                ]
            };

            mapInstance.current = new google.maps.Map(mapRef.current, mapOptions);

            // Initialize Marker (if not drawing mode, or maybe always?)
            // Usually if selecting a location (center), we need a marker.
            if (!drawingMode) {
                const markerOptions: any = {
                    position: { lat: initialLat, lng: initialLng },
                    map: mapInstance.current,
                    draggable: !readOnly,
                    animation: google.maps.Animation.DROP,
                };

                markerInstance.current = new google.maps.Marker(markerOptions);

                // Marker drag events
                if (!readOnly) {
                    markerInstance.current.addListener('dragend', () => {
                        const position = markerInstance.current.getPosition();
                        const newLat = position.lat();
                        const newLng = position.lng();
                        handleLocationChange(newLat, newLng);
                    });
                }
            }

            // Map click event (move marker)
            if (!readOnly && !drawingMode) {
                mapInstance.current.addListener('click', (e: any) => {
                    const newLat = e.latLng.lat();
                    const newLng = e.latLng.lng();

                    if (markerInstance.current) {
                        markerInstance.current.setPosition({ lat: newLat, lng: newLng });
                    }
                    handleLocationChange(newLat, newLng);
                });
            }

            // Initialize Search (Autocomplete)
            if (searchInputRef.current && !readOnly) {
                autocompleteInstance.current = new google.maps.places.Autocomplete(searchInputRef.current, {
                    fields: ["formatted_address", "geometry", "name"],
                });

                autocompleteInstance.current.bindTo("bounds", mapInstance.current);

                autocompleteInstance.current.addListener("place_changed", () => {
                    const place = autocompleteInstance.current.getPlace();

                    if (!place.geometry || !place.geometry.location) {
                        toast.error("No details available for input: '" + place.name + "'");
                        return;
                    }

                    const newLat = place.geometry.location.lat();
                    const newLng = place.geometry.location.lng();

                    // If user selects a place, update map center and marker
                    if (mapInstance.current) {
                        mapInstance.current.setCenter(place.geometry.location);
                        mapInstance.current.setZoom(15);
                    }

                    if (markerInstance.current) {
                        markerInstance.current.setPosition(place.geometry.location);
                        markerInstance.current.setVisible(true);
                    }

                    setSearchQuery(place.formatted_address || place.name);

                    // Call callback directly with the place details
                    if (onLocationSelect) {
                        onLocationSelect(newLat, newLng, place.formatted_address || place.name);
                    }
                });
            }

        } catch (error) {
            console.error("Error initializing Google Map:", error);
        }
    }, [isLoaded]);

    // Handle Location Change (Reverse Geocode)
    const handleLocationChange = useCallback((latitude: number, longitude: number) => {
        if (!window.google || !window.google.maps) return;

        setIsReverseGeocoding(true);
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: any) => {
            setIsReverseGeocoding(false);
            if (status === "OK" && results[0]) {
                const address = results[0].formatted_address;
                setSearchQuery(address); // Update local search input
                if (onLocationSelect) {
                    onLocationSelect(latitude, longitude, address);
                }
            } else {
                console.warn("Geocoder failed due to: " + status);
                if (onLocationSelect) {
                    onLocationSelect(latitude, longitude);
                }
            }
        });
    }, [onLocationSelect]);


    // Sync props with map (Update marker position if props change externally)
    useEffect(() => {
        if (mapInstance.current && lat && lng) {
            // If we are significantly different from current center, pan
            const currentCenter = mapInstance.current.getCenter();
            if (currentCenter && (Math.abs(currentCenter.lat() - lat) > 0.0001 || Math.abs(currentCenter.lng() - lng) > 0.0001)) {
                mapInstance.current.panTo({ lat, lng });
            }

            if (markerInstance.current) {
                markerInstance.current.setPosition({ lat, lng });
            }
        }
    }, [lat, lng]);


    // Drawing Manager (Polygons)
    useEffect(() => {
        if (!mapInstance.current || !drawingMode || !window.google) return;

        // If already initialized, just ensure it's on map

        const google = window.google;

        if (!drawingManagerInstance.current) {
            drawingManagerInstance.current = new google.maps.drawing.DrawingManager({
                drawingMode: google.maps.drawing.OverlayType.POLYGON,
                drawingControl: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER,
                    drawingModes: [google.maps.drawing.OverlayType.POLYGON],
                },
                polygonOptions: {
                    fillColor: "#10B981",
                    fillOpacity: 0.3,
                    strokeWeight: 2,
                    strokeColor: "#10B981",
                    clickable: true,
                    editable: true,
                    zIndex: 1,
                },
            });

            drawingManagerInstance.current.setMap(mapInstance.current);

            // Event: Polygon Complete
            google.maps.event.addListener(drawingManagerInstance.current, 'overlaycomplete', function (event: any) {
                if (event.type === google.maps.drawing.OverlayType.POLYGON) {

                    // Remove previous polygon if exists (we only allow one in this mode for now, based on Leaflet implementation)
                    if (currentDrawingPolygon.current) {
                        currentDrawingPolygon.current.setMap(null);
                    }

                    const newPolygon = event.overlay;
                    currentDrawingPolygon.current = newPolygon;

                    // Switch out of drawing mode to avoid drawing multiple
                    drawingManagerInstance.current.setDrawingMode(null);

                    // Add listeners for edit (setPath triggers when vertices change)
                    const path = newPolygon.getPath();

                    // Initial save
                    updatePolygonPath(path);

                    google.maps.event.addListener(path, 'set_at', () => updatePolygonPath(path));
                    google.maps.event.addListener(path, 'insert_at', () => updatePolygonPath(path));
                    google.maps.event.addListener(path, 'remove_at', () => updatePolygonPath(path));
                }
            });
        } else {
            drawingManagerInstance.current.setMap(mapInstance.current);
            drawingManagerInstance.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        }

        return () => {
            if (drawingManagerInstance.current) {
                drawingManagerInstance.current.setMap(null);
            }
        };

    }, [isLoaded, drawingMode]);

    // Helper to extract points and call parent
    const updatePolygonPath = (path: any) => {
        const points: [number, number][] = [];
        const length = path.getLength();
        for (let i = 0; i < length; i++) {
            const pt = path.getAt(i);
            points.push([pt.lat(), pt.lng()]);
        }

        if (onPolygonChange) {
            onPolygonChange(points);
        }
    };

    // Load Initial Polygon (Editable)
    useEffect(() => {
        if (!mapInstance.current || !isLoaded || !drawingMode) return;

        // If we have points but no polygon drawn yet
        if (initialPolygonPoints && initialPolygonPoints.length > 0 && !currentDrawingPolygon.current) {
            const google = window.google;
            const paths = initialPolygonPoints.map(p => ({ lat: p[0], lng: p[1] }));

            const polygon = new google.maps.Polygon({
                paths: paths,
                strokeColor: "#10B981",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#10B981",
                fillOpacity: 0.35,
                editable: true,
                draggable: false
            });

            polygon.setMap(mapInstance.current);
            currentDrawingPolygon.current = polygon;

            // Add listeners
            const path = polygon.getPath();
            google.maps.event.addListener(path, 'set_at', () => updatePolygonPath(path));
            google.maps.event.addListener(path, 'insert_at', () => updatePolygonPath(path));
            google.maps.event.addListener(path, 'remove_at', () => updatePolygonPath(path));

            // Center map on polygon
            const bounds = new google.maps.LatLngBounds();
            paths.forEach((p: any) => bounds.extend(p));
            mapInstance.current.fitBounds(bounds);
        }
    }, [isLoaded, initialPolygonPoints, drawingMode]);


    // Display Read-Only Polygons (Multiple)
    useEffect(() => {
        if (!mapInstance.current || !isLoaded) return;

        // Clear existing
        polygonInstances.current.forEach(p => p.setMap(null));
        polygonInstances.current = [];

        if (polygons && polygons.length > 0) {
            const google = window.google;
            const bounds = new google.maps.LatLngBounds();

            polygons.forEach(p => {
                const paths = p.points.map(pt => ({ lat: pt[0], lng: pt[1] }));
                paths.forEach((pt: any) => bounds.extend(pt));

                const polygon = new google.maps.Polygon({
                    paths: paths,
                    strokeColor: p.color || "#3B82F6",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: p.color || "#3B82F6",
                    fillOpacity: 0.2,
                });

                polygon.setMap(mapInstance.current);

                // Add click listener
                if (p.onClick) {
                    polygon.addListener('click', p.onClick);
                }

                // Add hover text (simple title ?) Google Maps polygons don't have tooltips natively like Leaflet
                // We can use InfoWindow on click/hover

                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="color:black; font-weight:bold;">${p.name}</div>`,
                    disableAutoPan: true
                });

                polygon.addListener('mouseover', (e: any) => {
                    infoWindow.setPosition(e.latLng);
                    infoWindow.open(mapInstance.current);
                });

                polygon.addListener('mouseout', () => {
                    infoWindow.close();
                });

                polygonInstances.current.push(polygon);
            });

            // Fit bounds if not drawing mode and we have polygons
            if (!drawingMode) {
                mapInstance.current.fitBounds(bounds);
            }
        }

    }, [isLoaded, polygons, drawingMode]);


    return (
        <div className={`relative w-full bg-slate-100 rounded-lg overflow-hidden border border-border z-0 group ${className || 'h-[400px]'}`}>
            {/* Google Maps Script */}
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,drawing&callback=initMap`}
                strategy="afterInteractive"
            />

            {/* Search Overlay - Only show if not readOnly */}
            {!readOnly && (
                <div className="absolute top-3 left-3 right-12 z-10 max-w-md sm:left-3 sm:right-auto sm:w-80">
                    <div className="relative shadow-lg rounded-lg bg-white">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={!isLoaded ? "Loading maps..." : "Search location in Google Maps"}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent border border-gray-200 rounded-lg hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={!isLoaded}
                        />
                        <div className="absolute left-3 top-3 text-gray-400">
                            {isReverseGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </div>
                    </div>
                </div>
            )}

            {/* Map Container */}
            <div ref={mapRef} className="w-full h-full" />

            {!isLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-muted-foreground gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">Loading Google Maps...</span>
                </div>
            )}
        </div>
    );
}
