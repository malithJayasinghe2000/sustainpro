/**
 * Telemetry data types
 */
export interface TelemetryData {
    device_code: string;
    organization_id?: string;
    timestamp: string;
    data: Record<string, any>;
}

export interface LiveDataEntry {
    data: Record<string, any>;
    timestamp: Date;
    device_id: number;
    device_code: string;
}

export interface TelemetryPayload {
    device_code: string;
    device_id: number;
    timestamp: string;
    data: Record<string, any>;
    status: 'online' | 'offline';
    stats?: DashboardStats;
}

export interface DashboardStats {
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    active_alerts: number;
}

export interface SystemStats {
    total_organizations: number;
    total_events: number;
    total_users: number;
    total_devices: number;
}
