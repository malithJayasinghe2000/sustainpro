// Entity exports
export * from './entities/user';
export * from './entities/organization';
export * from './entities/event';
export * from './entities/department';
export * from './entities/device';
export * from './entities/telemetry';

/**
 * Common API response types
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    total: number;
    page: number;
    limit: number;
}

/**
 * System settings
 */
export interface SystemSettings {
    id: string;
    category: string;
    site_title: string;
    site_logo: string | null;
    maintenance_mode: boolean;
    default_timezone: string;
    account_lock_duration_minutes: number;
    token_expire_minutes: number;
    max_login_attempts: number;
    session_timeout_enabled: boolean;
    support_email: string | null;
    support_phone: string | null;
    global_alert_message: string | null;
    device_api_url: string | null;
    updated_at: Date;
}
