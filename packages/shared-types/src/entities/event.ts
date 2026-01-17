/**
 * Event entity and related types
 */
export interface Event {
    id: string;
    organization_id: string;
    name: string;
    code: string | null;
    location: string | null;
    start_date: Date | null;
    end_date: Date | null;
    status: EventStatus;
    description: string | null;
    event_type: string | null;
    image_url: string | null;
    coordinates: { lat: number; lng: number } | null;
    end_requested: boolean | null;
    end_requested_by: string | null;
    end_requested_at: Date | null;
    created_at: Date;
}

export type EventStatus = 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'END';

export interface CreateEventDto {
    organization_id: string;
    name: string;
    location?: string;
    start_date?: Date;
    end_date?: Date;
    description?: string;
    event_type?: string;
    image_url?: string;
    coordinates?: { lat: number; lng: number };
}

export interface UpdateEventDto {
    name?: string;
    location?: string;
    start_date?: Date;
    end_date?: Date;
    status?: EventStatus;
    description?: string;
    event_type?: string;
    image_url?: string;
    coordinates?: { lat: number; lng: number };
}
