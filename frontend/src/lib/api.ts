import axios from 'axios';

// API Gateway URL - single entry point for all microservices
// In development: http://localhost:8080/api/v1
// In production: https://api.sustainpro.io/api/v1
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Send cookies with every request
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle auth errors and token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, AND not a login attempt
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
            originalRequest._retry = true;

            // Don't attempt refresh if we don't have a token (e.g., after logout)
            const currentToken = localStorage.getItem('auth_token');
            if (!currentToken) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                localStorage.removeItem('userTimezone');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            try {
                // Attempt to refresh token
                // We use raw axios to avoid infinite loop/interceptor mess if this fails
                const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });

                const newToken = refreshResponse.data.token;

                if (newToken) {
                    // Update local storage
                    localStorage.setItem('auth_token', newToken);

                    // Update header for future requests
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

                    // Update header for THIS request
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed - clean up and redirect
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                localStorage.removeItem('userTimezone');
                // Only redirect if we are not already on login
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }

        if (error.response?.status === 403) {
            // Permission denied
            console.error("Access Forbidden", error);
        }

        return Promise.reject(error);
    }
);

export default apiClient;

/**
 * Get full image URL for images stored on the API server
 * Handles both relative paths (/api/v1/images/...) and absolute URLs
 */
export const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    // If it's already a full URL (http/https), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // If it's a relative API path, prefix with API base (without /api/v1)
    if (url.startsWith('/api/')) {
        const apiOrigin = API_BASE_URL.replace('/api/v1', '');
        return `${apiOrigin}${url}`;
    }

    // For other relative paths, use the full base URL
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Auth API functions
export const authApi = {
    login: async (email: string, password: string) => {
        const response = await apiClient.post('/auth/login', { email, password });
        return response.data;
    },

    logout: async () => {
        const response = await apiClient.post('/auth/logout');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        return response.data;
    },

    getProfile: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        const response = await apiClient.post('/auth/change-password', {
            currentPassword,
            newPassword,
        });
        return response.data;
    },

    updateProfile: async (data: { timezone?: string }) => {
        const response = await apiClient.put('/auth/me/profile', data);
        return response.data;
    },
};

export const simulationApi = {
    injectTelemetry: async (topic: string, message: any) => {
        const response = await apiClient.post('/simulation/telemetry', { topic, message });
        return response.data;
    },
};

// Users API functions
export const usersApi = {
    getAll: async (params?: { page?: number; limit?: number; search?: string; role?: string; organization_id?: string; event_id?: string; department_id?: string }) => {
        const response = await apiClient.get('/users', { params });
        return response.data;
    },

    getManagerCandidates: async (organizationId?: string) => {
        const url = organizationId
            ? `/users/managers/candidates?organization_id=${organizationId}`
            : '/users/managers/candidates';
        const response = await apiClient.get(url);
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/users/${id}`);
        return response.data;
    },

    create: async (userData: any) => {
        // Use the protected POST /users endpoint
        const response = await apiClient.post('/users', userData);
        return response.data;
    },

    update: async (id: string, userData: any) => {
        const response = await apiClient.put(`/users/${id}`, userData);
        return response.data;
    },

    delete: async (id: string, adminPassword?: string) => {
        const config = adminPassword ? { data: { adminPassword } } : {};
        const response = await apiClient.delete(`/users/${id}`, config);
        return response.data;
    },
};

// Settings API functions - System Configuration
export interface SystemSettings {
    id: string;
    system_name: string;
    site_title: string;
    site_tagline: string | null;
    site_logo: string | null;
    site_favicon: string | null;
    primary_color: string;
    secondary_color: string;
    default_timezone: string;
    default_language: string;
    date_format: string;
    time_format: string;
    datetime_format: string;
    first_day_of_week: number;
    maintenance_mode: boolean;
    maintenance_message: string | null;
    global_alert_message: string | null;
    global_alert_type: string;
    support_email: string | null;
    support_phone: string | null;
    support_url: string | null;
    meta_description: string | null;
    meta_keywords: string | null;
    updated_at: string;
}

export interface PasswordPolicies {
    id: string;
    min_length: number;
    max_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    special_chars_allowed: string;
    password_expires: boolean;
    password_expiry_days: number;
    expiry_warning_days: number;
    prevent_reuse: boolean;
    reuse_prevention_count: number;
    require_change_on_first_login: boolean;
    min_password_age_hours: number;
}

export interface SessionPolicies {
    id: string;
    session_timeout_enabled: boolean;
    session_timeout_minutes: number;
    idle_timeout_enabled: boolean;
    idle_timeout_minutes: number;
    max_concurrent_sessions: number;
    enforce_single_session: boolean;
    access_token_expire_minutes: number;
    refresh_token_expire_days: number;
    remember_me_expire_days: number;
    bind_session_to_ip: boolean;
    bind_session_to_user_agent: boolean;
    regenerate_session_on_login: boolean;
}

export interface LoginPolicies {
    id: string;
    max_login_attempts: number;
    lockout_duration_minutes: number;
    progressive_lockout: boolean;
    progressive_lockout_multiplier: number;
    max_lockout_duration_minutes: number;
    enable_captcha: boolean;
    captcha_after_attempts: number;
    captcha_provider: string;
    captcha_site_key: string | null;
    captcha_secret_key: string | null;
    enable_ip_blocking: boolean;
    ip_block_threshold: number;
    ip_block_duration_minutes: number;
    notify_on_lockout: boolean;
    notify_on_new_device_login: boolean;
    notify_on_password_change: boolean;
}

export interface TwoFactorConfig {
    id: string;
    enabled: boolean;
    enforce_globally: boolean;
    enforce_for_admins: boolean;
    grace_period_days: number;
    email_method_enabled: boolean;
    sms_method_enabled: boolean;
    totp_method_enabled: boolean;
    email_otp_length: number;
    email_otp_expiry_minutes: number;
    email_otp_max_attempts: number;
    sms_otp_length: number;
    sms_otp_expiry_minutes: number;
    sms_otp_max_attempts: number;
    totp_issuer: string;
    totp_digits: number;
    totp_period: number;
    recovery_codes_enabled: boolean;
    recovery_codes_count: number;
}

export interface ApiSecurityConfig {
    id: string;
    rate_limit_enabled: boolean;
    rate_limit_requests: number;
    rate_limit_window_minutes: number;
    rate_limit_by: string;
    api_key_enabled: boolean;
    api_key_expiry_days: number;
    api_key_max_per_user: number;
    api_key_require_ip_whitelist: boolean;
    cors_enabled: boolean;
    cors_allowed_origins: string;
    cors_allowed_methods: string;
    cors_allowed_headers: string;
    cors_max_age_seconds: number;
    cors_allow_credentials: boolean;
    api_versioning_enabled: boolean;
    current_api_version: string;
    supported_versions: string;
    deprecation_warning_enabled: boolean;
    max_request_body_size_mb: number;
    request_timeout_seconds: number;
    enable_security_headers: boolean;
    hsts_enabled: boolean;
    hsts_max_age_seconds: number;
}

export interface SmtpSettings {
    id: string;
    smtp_enabled: boolean;
    smtp_host: string | null;
    smtp_port: number;
    smtp_username: string | null;
    smtp_password: string | null;
    smtp_encryption: string;
    smtp_timeout_seconds: number;
    from_email: string | null;
    from_name: string;
    reply_to_email: string | null;
    max_emails_per_hour: number;
    max_emails_per_day: number;
    max_recipients_per_email: number;
    test_mode: boolean;
    test_email_recipient: string | null;
    last_connection_status: string | null;
    last_connection_error: string | null;
}

export interface NotificationSettings {
    id: string;
    email_notifications_enabled: boolean;
    email_frequency: string;
    email_batch_size: number;
    email_digest_time: string;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
    quiet_hours_timezone: string;
    quiet_hours_override_urgent: boolean;
    in_app_notifications_enabled: boolean;
    in_app_auto_dismiss_seconds: number;
    in_app_max_visible: number;
    push_notifications_enabled: boolean;
    push_provider: string | null;
    retention_days: number;
}

export interface EmailTemplate {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: string;
    subject: string;
    body_html: string;
    body_text: string | null;
    available_variables: string[];
    is_active: boolean;
    is_system_template: boolean;
    language: string;
}

export interface AllSettings {
    system: SystemSettings | null;
    password: PasswordPolicies | null;
    session: SessionPolicies | null;
    login: LoginPolicies | null;
    twoFactor: TwoFactorConfig | null;
    apiSecurity: ApiSecurityConfig | null;
    smtp: SmtpSettings | null;
    notification: NotificationSettings | null;
}

export const settingsApi = {
    // Get all settings at once
    getAll: async (): Promise<AllSettings> => {
        const response = await apiClient.get('/settings');
        return response.data.data;
    },

    // Public settings (no auth required)
    getPublic: async () => {
        const response = await apiClient.get('/settings/public');
        return response.data.data;
    },

    // Security settings (for login page)
    getSecurity: async () => {
        const response = await apiClient.get('/settings/security');
        return response.data.data;
    },

    // System Settings
    getSystemSettings: async (): Promise<SystemSettings> => {
        const response = await apiClient.get('/settings/system');
        return response.data.data;
    },
    updateSystemSettings: async (data: Partial<SystemSettings>): Promise<SystemSettings> => {
        const response = await apiClient.put('/settings/system', data);
        return response.data.data;
    },

    // Password Policies
    getPasswordPolicies: async (): Promise<PasswordPolicies> => {
        const response = await apiClient.get('/settings/password-policies');
        return response.data.data;
    },
    updatePasswordPolicies: async (data: Partial<PasswordPolicies>): Promise<PasswordPolicies> => {
        const response = await apiClient.put('/settings/password-policies', data);
        return response.data.data;
    },

    // Public password rules (no auth required) - for frontend validation
    getPasswordRules: async (): Promise<{
        min_length: number;
        max_length: number;
        require_uppercase: boolean;
        require_lowercase: boolean;
        require_numbers: boolean;
        require_special_chars: boolean;
        special_chars_allowed: string;
    }> => {
        const response = await apiClient.get('/settings/password-rules');
        return response.data.data;
    },

    // Session Policies
    getSessionPolicies: async (): Promise<SessionPolicies> => {
        const response = await apiClient.get('/settings/session-policies');
        return response.data.data;
    },
    updateSessionPolicies: async (data: Partial<SessionPolicies>): Promise<SessionPolicies> => {
        const response = await apiClient.put('/settings/session-policies', data);
        return response.data.data;
    },

    // Login Policies
    getLoginPolicies: async (): Promise<LoginPolicies> => {
        const response = await apiClient.get('/settings/login-policies');
        return response.data.data;
    },
    updateLoginPolicies: async (data: Partial<LoginPolicies>): Promise<LoginPolicies> => {
        const response = await apiClient.put('/settings/login-policies', data);
        return response.data.data;
    },

    // Two-Factor Authentication
    getTwoFactorConfig: async (): Promise<TwoFactorConfig> => {
        const response = await apiClient.get('/settings/two-factor');
        return response.data.data;
    },
    updateTwoFactorConfig: async (data: Partial<TwoFactorConfig>): Promise<TwoFactorConfig> => {
        const response = await apiClient.put('/settings/two-factor', data);
        return response.data.data;
    },

    // API Security
    getApiSecurityConfig: async (): Promise<ApiSecurityConfig> => {
        const response = await apiClient.get('/settings/api-security');
        return response.data.data;
    },
    updateApiSecurityConfig: async (data: Partial<ApiSecurityConfig>): Promise<ApiSecurityConfig> => {
        const response = await apiClient.put('/settings/api-security', data);
        return response.data.data;
    },

    // SMTP Settings
    getSmtpSettings: async (): Promise<SmtpSettings> => {
        const response = await apiClient.get('/settings/smtp');
        return response.data.data;
    },
    updateSmtpSettings: async (data: Partial<SmtpSettings>): Promise<SmtpSettings> => {
        const response = await apiClient.put('/settings/smtp', data);
        return response.data.data;
    },
    sendTestEmail: async (recipient: string): Promise<void> => {
        await apiClient.post('/settings/smtp/test', { recipient });
    },

    // Notification Settings
    getNotificationSettings: async (): Promise<NotificationSettings> => {
        const response = await apiClient.get('/settings/notifications');
        return response.data.data;
    },
    updateNotificationSettings: async (data: Partial<NotificationSettings>): Promise<NotificationSettings> => {
        const response = await apiClient.put('/settings/notifications', data);
        return response.data.data;
    },

    // Email Templates
    getEmailTemplates: async (): Promise<EmailTemplate[]> => {
        const response = await apiClient.get('/settings/email-templates');
        return response.data.data;
    },
    getEmailTemplate: async (code: string): Promise<EmailTemplate> => {
        const response = await apiClient.get(`/settings/email-templates/${code}`);
        return response.data.data;
    },
    createEmailTemplate: async (data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
        const response = await apiClient.post('/settings/email-templates', data);
        return response.data.data;
    },
    updateEmailTemplate: async (code: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
        const response = await apiClient.put(`/settings/email-templates/${code}`, data);
        return response.data.data;
    },
    deleteEmailTemplate: async (code: string): Promise<void> => {
        await apiClient.delete(`/settings/email-templates/${code}`);
    },
};

export const deviceModelsApi = {
    getAll: async () => {
        const response = await apiClient.get('/device-models');
        return response.data.data;
    },
    create: async (data: any) => {
        const response = await apiClient.post('/device-models', data);
        return response.data.data;
    },
    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/device-models/${id}`, data);
        return response.data.data;
    },
    delete: async (id: string) => {
        const response = await apiClient.delete(`/device-models/${id}`);
        return response.data;
    }
};

export const devicesApi = {
    getAll: async () => {
        const response = await apiClient.get('/devices');
        return response.data.data;
    },
    getById: async (id: string) => {
        const response = await apiClient.get(`/devices/${id}`);
        return response.data.data;
    },
    create: async (data: any) => {
        const response = await apiClient.post('/devices', data);
        return response.data.data;
    },
    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/devices/${id}`, data);
        return response.data.data;
    },
    delete: async (id: string) => {
        const response = await apiClient.delete(`/devices/${id}`);
        return response.data;
    },
};

// Department Templates API functions
export const departmentTemplatesApi = {
    getAll: async (organizationId?: string) => {
        const url = organizationId
            ? `/department-templates?organization_id=${organizationId}`
            : '/department-templates';
        const response = await apiClient.get(url);
        return response.data.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/department-templates/${id}`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await apiClient.post('/department-templates', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/department-templates/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/department-templates/${id}`);
        return response.data;
    },
};

// Departments API functions (Instances)
export const departmentsApi = {
    getByEvent: async (eventId: string) => {
        const response = await apiClient.get(`/departments/by-event/${eventId}`);
        return response.data.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/departments/${id}`);
        return response.data.data;
    },

    create: async (data: any) => {
        const response = await apiClient.post('/departments', data);
        return response.data.data;
    },

    addService: async (departmentId: string, serviceId: string, options?: { config?: any; assigned_supervisor_id?: string }) => {
        const response = await apiClient.post(`/departments/${departmentId}/services`, {
            service_template_id: serviceId,
            config: options?.config || {},
            assigned_supervisor_id: options?.assigned_supervisor_id || undefined
        });
        return response.data;
    },

    updateService: async (departmentId: string, serviceId: string, data: { assigned_supervisor_id?: string; config?: any }) => {
        const response = await apiClient.put(`/departments/${departmentId}/services/${serviceId}`, data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/departments/${id}`, data);
        return response.data;
    },

    removeService: async (departmentId: string, serviceId: string) => {
        const response = await apiClient.delete(`/departments/${departmentId}/services/${serviceId}`);
        return response.data;
    },

    getServices: async (departmentId: string) => {
        const response = await apiClient.get(`/departments/${departmentId}/services`);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/departments/${id}`);
        return response.data;
    },

    getMyDepartments: async () => {
        const response = await apiClient.get('/departments/my/departments');
        return response.data.data;
    }
};

export const departmentServicesApi = {
    getById: async (id: string) => {
        const response = await apiClient.get(`/department-services/${id}`);
        return response.data.data;
    },

    getDevices: async (id: string, params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: 'ONLINE' | 'OFFLINE';
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) => {
        const response = await apiClient.get(`/department-services/${id}/devices`, { params });
        return response.data; // Returns { success, data, pagination }
    },

    addDevice: async (serviceId: string, deviceId: number, role?: string) => {
        const response = await apiClient.post(`/department-services/${serviceId}/devices`, {
            device_id: deviceId,
            role: role || 'primary'
        });
        return response.data;
    },

    removeDevice: async (serviceId: string, deviceId: number) => {
        const response = await apiClient.delete(`/department-services/${serviceId}/devices/${deviceId}`);
        return response.data;
    }
};

export const organizationsApi = {
    getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
        const response = await apiClient.get('/organizations', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await apiClient.get(`/organizations/${id}`);
        return response.data;
    },
    getOne: async (id: string) => {
        const response = await apiClient.get(`/organizations/${id}`);
        return response.data.data;
    },
    getStructure: async (id: string) => {
        const response = await apiClient.get(`/organizations/${id}/structure`);
        return response.data.data;
    },
    create: async (data: any) => {
        const response = await apiClient.post('/organizations', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/organizations/${id}`, data);
        return response.data;
    },
    delete: async (id: string, adminPassword?: string) => {
        // Pass password in body
        const config = adminPassword ? { data: { adminPassword } } : {};
        const response = await apiClient.delete(`/organizations/${id}`, config);
        return response.data;
    },
    getStats: async () => {
        const response = await apiClient.get('/organizations/stats/overview');
        return response.data.data;
    }
};

// ... (User Management APIs)

export const eventsApi = {
    getAll: async (params?: { page?: number; limit?: number; search?: string; organization_id?: string }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.organization_id) queryParams.append('organization_id', params.organization_id);

        const url = `/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await apiClient.get(url);

        // Return paginated response if available, otherwise just data
        if (response.data.meta) {
            return {
                data: response.data.data,
                total: response.data.meta.total,
                totalPages: response.data.meta.pages,
                page: response.data.meta.page,
            };
        }
        return response.data.data;
    },
    getByOrg: async (orgId: string) => {
        const response = await apiClient.get(`/events/by-org/${orgId}`);
        return response.data.data;
    },
    create: async (data: any) => {
        const response = await apiClient.post('/events', data);
        return response.data.data; // Return the event object directly
    },
    getById: async (id: string) => {
        const response = await apiClient.get(`/events/${id}`);
        return response.data.data;
    },
    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/events/${id}`, data);
        return response.data;
    },
    startEvent: async (id: string) => {
        const response = await apiClient.post(`/events/${id}/start`);
        return response.data;
    },
    stopEvent: async (id: string) => {
        const response = await apiClient.post(`/events/${id}/stop`);
        return response.data;
    },
    // Request to end event (for event managers)
    requestEnd: async (id: string) => {
        const response = await apiClient.post(`/events/${id}/request-end`);
        return response.data;
    },
    // End event immediately (for org admins and super admins)
    endEvent: async (id: string) => {
        const response = await apiClient.post(`/events/${id}/end`);
        return response.data;
    },
    requestDelete: async (id: string) => {
        const response = await apiClient.post(`/events/${id}/request-delete`);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await apiClient.delete(`/events/${id}`);
        return response.data;
    }
};



export const servicesApi = {
    getMyServices: async () => {
        const response = await apiClient.get('/services/my/services');
        return response.data.data;
    },
    getAll: async (scope?: string) => {
        const response = await apiClient.get('/services', { params: { scope } });
        return response.data.data;
    },
    getById: async (id: string) => {
        console.log('API Requesting Service ID:', id);
        const response = await apiClient.get(`/services/${id}`);
        return response.data.data; // Return the actual service object
    },
    create: async (data: any) => {
        const response = await apiClient.post('/services', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/services/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await apiClient.delete(`/services/${id}`);
        return response.data;
    },
    assign: async (id: string, data: any) => {
        const response = await apiClient.post(`/services/${id}/assign`, data);
        return response.data;
    },
    // Dashboard management
    updateDashboard: async (id: string, dashboardType: 'main' | 'device' | 'public', layout: any) => {
        // Map 'main' to 'service' for the API endpoint
        const typeMap: Record<string, string> = { 'main': 'service', 'device': 'device', 'public': 'public' };
        const response = await apiClient.put(`/services/${id}/dashboards/${typeMap[dashboardType]}`, { layout });
        return response.data;
    },
    // Device models management
    updateDeviceModels: async (id: string, deviceModels: Array<{ device_model_id: string; role?: string; min_count?: number; max_count?: number }>) => {
        const response = await apiClient.put(`/services/${id}/device-models`, { device_models: deviceModels });
        return response.data;
    },
    // Get dashboard by type
    getDashboard: async (id: string, dashboardType: 'main' | 'device' | 'public') => {
        const typeMap: Record<string, string> = { 'main': 'service', 'device': 'device', 'public': 'public' };
        const response = await apiClient.get(`/services/${id}/dashboards/${typeMap[dashboardType]}`);
        return response.data;
    }
};

export const uploadApi = {
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data; // { message, url, filename }
    }
};

export const rbacApi = {
    getPermissions: async () => {
        const response = await apiClient.get('/rbac/permissions');
        return response.data.data || response.data || [];
    },
    getMappings: async () => {
        const response = await apiClient.get('/rbac/mappings');
        return response.data.data || response.data || {};
    },
    updateMapping: async (role: string, permissions: string[]) => {
        const response = await apiClient.post('/rbac/mappings', { role, permissions });
        return response.data;
    },
    /**
     * Get user's effective permissions (for debugging - Super Admin only)
     */
    getUserPermissions: async (userId: string) => {
        const response = await apiClient.get(`/rbac/user/${userId}/permissions`);
        return response.data.data || response.data || [];
    },
    /**
     * Get current user's permissions
     */
    getMyPermissions: async (): Promise<string[]> => {
        const response = await apiClient.get('/rbac/my-permissions');
        return response.data.data || response.data || [];
    },
};

export const telemetryApi = {
    getDashboardStats: async () => {
        const response = await apiClient.get('/telemetry/stats/dashboard');
        return response.data;
    },
    getSystemStats: async () => {
        const response = await apiClient.get('/telemetry/stats/system');
        return response.data;
    }
};

export const adminApi = {
    getSystemHealth: async () => {
        const response = await apiClient.get('/admin/system-health');
        return response.data;
    }
};

// Role definitions from sps_roles table
export interface Role {
    id: string;
    code: string;
    name: string;
    description: string | null;
    level: number;
    icon: string | null;
    color: string | null;
    is_system: boolean;
    is_active: boolean;
}

export const rolesApi = {
    /**
     * Get all active roles
     */
    getAll: async (): Promise<Role[]> => {
        const response = await apiClient.get('/roles');
        return response.data.data || response.data || [];
    },

    /**
     * Get only roles that the current user can assign (based on hierarchy)
     */
    getAssignable: async (): Promise<Role[]> => {
        const response = await apiClient.get('/roles', { params: { assignable: true } });
        return response.data.data || response.data || [];
    },

    /**
     * Get a specific role by code
     */
    getByCode: async (code: string): Promise<Role | null> => {
        try {
            const response = await apiClient.get(`/roles/${code}`);
            return response.data.data || response.data;
        } catch (error) {
            return null;
        }
    },

    /**
     * Update a role's display properties (Super Admin only)
     * NOTE: Roles are defined in the seed file. Only display properties can be updated.
     */
    update: async (id: string, data: {
        name?: string;
        description?: string;
        icon?: string;
        color?: string;
    }): Promise<Role> => {
        const response = await apiClient.put(`/roles/${id}`, data);
        return response.data.data || response.data;
    },
};

// Audit Log Types
export interface AuditLog {
    id: string;
    created_at: string;
    source_type: string;
    actor_user_id?: string;
    actor_user_email?: string;
    actor_device_id?: string;
    actor_device_code?: string;
    organization_id?: string;
    organization_name?: string;
    event_id?: string;
    department_id?: string;
    service_id?: string;
    category: string;
    action: string;
    sub_action?: string;
    target_resource?: string;
    target_id?: string;
    target_name?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changes?: string[];
    status: string;
    error_message?: string;
    ip_address?: string;
    user_agent?: string;
    duration_ms?: number;
    description?: string;
    metadata?: Record<string, any>;
}

export interface AuditLogFilter {
    page?: number;
    limit?: number;
    organization_id?: string;
    source_type?: string;
    category?: string;
    action?: string;
    status?: string;
    actor_user_id?: string;
    target_resource?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
}

export interface AuditLogStats {
    total: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
    recentActivity: { date: string; count: number }[];
}

export interface AuditCategory {
    code: string;
    name: string;
    description: string;
}

export const auditLogsApi = {
    /**
     * Get paginated audit logs with filters
     */
    getAll: async (params?: AuditLogFilter): Promise<{
        success: boolean;
        data: AuditLog[];
        meta: { page: number; limit: number; total: number; pages: number };
    }> => {
        const response = await apiClient.get('/audit-logs', { params });
        return response.data;
    },

    /**
     * Get single audit log by ID
     */
    getById: async (id: string): Promise<AuditLog> => {
        const response = await apiClient.get(`/audit-logs/${id}`);
        return response.data.data;
    },

    /**
     * Get audit log statistics
     */
    getStats: async (params?: {
        organization_id?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<AuditLogStats> => {
        const response = await apiClient.get('/audit-logs/stats', { params });
        return response.data.data;
    },

    /**
     * Get available categories for filtering
     */
    getCategories: async (): Promise<AuditCategory[]> => {
        const response = await apiClient.get('/audit-logs/categories');
        return response.data.data;
    },

    /**
     * Get user activity logs
     */
    getUserActivity: async (userId: string, params?: {
        start_date?: string;
        end_date?: string;
        limit?: number;
    }): Promise<AuditLog[]> => {
        const response = await apiClient.get(`/audit-logs/user/${userId}`, { params });
        return response.data.data;
    },

    /**
     * Export audit logs as CSV
     */
    exportCSV: async (params?: AuditLogFilter): Promise<Blob> => {
        const response = await apiClient.get('/audit-logs/export', {
            params,
            responseType: 'blob',
        });
        return response.data;
    },

    /**
     * Download CSV export
     */
    downloadCSV: async (params?: AuditLogFilter): Promise<void> => {
        const blob = await auditLogsApi.exportCSV(params);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
};

// =============================================
// System Notifications API
// =============================================

export interface SystemNotification {
    id: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    source: string;
    source_id?: string;
    source_name?: string;
    action_url?: string;
    action_label?: string;
    is_read: boolean;
    created_at: string;
    read_at?: string;
    metadata?: {
        device_code?: string;
        rule_name?: string;
        resolved_at?: string;
        event_id?: string;
        event_name?: string;
        event_code?: string;
        requested_by?: string;
        requested_at?: string;
    };
}

export interface NotificationsResponse {
    success: boolean;
    data: SystemNotification[];
    meta: {
        total: number;
        unread_count: number;
        limit: number;
        offset: number;
    };
}

export const systemNotificationsApi = {
    /**
     * Get all notifications for the current user
     */
    getAll: async (params?: {
        is_read?: boolean;
        type?: 'critical' | 'warning' | 'info';
        limit?: number;
        offset?: number;
    }): Promise<NotificationsResponse> => {
        const response = await apiClient.get('/notifications', { params });
        return response.data;
    },

    /**
     * Get unread notification count
     */
    getUnreadCount: async (): Promise<number> => {
        const response = await apiClient.get('/notifications/unread-count');
        return response.data.data.count;
    },

    /**
     * Get a specific notification by ID
     */
    getById: async (id: string): Promise<SystemNotification> => {
        const response = await apiClient.get(`/notifications/${id}`);
        return response.data.data;
    },

    /**
     * Mark a notification as read
     */
    markAsRead: async (id: string): Promise<SystemNotification> => {
        const response = await apiClient.post(`/notifications/${id}/read`);
        return response.data.data;
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<{ marked_count: number }> => {
        const response = await apiClient.post('/notifications/mark-all-read');
        return response.data.data;
    },

    /**
     * Dismiss a notification
     */
    dismiss: async (id: string): Promise<void> => {
        await apiClient.post(`/notifications/${id}/dismiss`);
    },

    /**
     * Create a new notification (admin only)
     */
    create: async (data: {
        type: 'critical' | 'warning' | 'info';
        title: string;
        message: string;
        source?: string;
        source_id?: string;
        source_name?: string;
        metadata?: any;
    }): Promise<SystemNotification> => {
        const response = await apiClient.post('/notifications', data);
        return response.data.data;
    },
};

// =============================================
// ALERT RULES API
// =============================================
export interface AlertRuleCondition {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'in';
    threshold: number | string | any[];
}

export interface AlertRuleAction {
    type: 'alert' | 'email' | 'webhook' | 'escalate' | 'notification';
    config?: Record<string, any>;
    delay_minutes?: number;
}

export interface AlertRule {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    device_type?: string;
    condition: AlertRuleCondition;
    actions: AlertRuleAction[];
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    is_active: boolean;
    priority: number;
    cooldown_seconds: number;
    last_triggered_at?: Date;
    trigger_count: number;
    event_id?: string;
    service_id?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface CreateAlertRuleDto {
    organization_id: string;
    name: string;
    description?: string;
    device_type?: string;
    condition: AlertRuleCondition;
    actions?: AlertRuleAction[];
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    is_active?: boolean;
    priority?: number;
    cooldown_seconds?: number;
    event_id?: string;
    service_id?: string;
}

export const alertRulesApi = {
    /**
     * Get all alert rules for organization
     */
    getAll: async (params?: { service_id?: string; event_id?: string }): Promise<AlertRule[]> => {
        const response = await apiClient.get('/alert-rules', { params });
        return response.data.data || [];
    },

    /**
     * Get alert rule by ID
     */
    getById: async (id: string): Promise<AlertRule> => {
        const response = await apiClient.get(`/alert-rules/${id}`);
        return response.data.data;
    },

    /**
     * Create a new alert rule
     */
    create: async (data: CreateAlertRuleDto): Promise<AlertRule> => {
        const response = await apiClient.post('/alert-rules', data);
        return response.data.data;
    },

    /**
     * Create multiple alert rules (bulk)
     */
    createBulk: async (rules: CreateAlertRuleDto[]): Promise<AlertRule[]> => {
        const response = await apiClient.post('/alert-rules/bulk', { rules });
        return response.data.data;
    },

    /**
     * Update an alert rule
     */
    update: async (id: string, data: Partial<CreateAlertRuleDto>): Promise<AlertRule> => {
        const response = await apiClient.put(`/alert-rules/${id}`, data);
        return response.data.data;
    },

    /**
     * Delete an alert rule
     */
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/alert-rules/${id}`);
    },

    /**
     * Toggle alert rule active status
     */
    toggleActive: async (id: string, is_active: boolean): Promise<AlertRule> => {
        const response = await apiClient.patch(`/alert-rules/${id}/toggle`, { is_active });
        return response.data.data;
    },

    /**
     * Get alert rules by service
     */
    getByService: async (serviceId: string): Promise<AlertRule[]> => {
        const response = await apiClient.get(`/alert-rules/service/${serviceId}`);
        return response.data.data || [];
    },
};

// =============================================
// ESCALATION POLICIES API
// =============================================
export interface EscalationPolicy {
    id: string;
    organization_id: string;
    event_id?: string;
    service_id?: string;
    name: string;
    description?: string;
    escalation_level: number;
    escalation_delay_minutes: number;
    auto_assign_to?: string;
    notify_method?: string;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface CreateEscalationPolicyDto {
    organization_id: string;
    event_id?: string;
    service_id?: string;
    name: string;
    description?: string;
    escalation_level: number;
    escalation_delay_minutes: number;
    auto_assign_to?: string;
    notify_method?: string;
    is_active?: boolean;
}

export const escalationPoliciesApi = {
    /**
     * Get all escalation policies for organization
     */
    getAll: async (params?: { service_id?: string; event_id?: string }): Promise<EscalationPolicy[]> => {
        const response = await apiClient.get('/escalation-policies', { params });
        return response.data.data || [];
    },

    /**
     * Get escalation policy by ID
     */
    getById: async (id: string): Promise<EscalationPolicy> => {
        const response = await apiClient.get(`/escalation-policies/${id}`);
        return response.data.data;
    },

    /**
     * Create a new escalation policy
     */
    create: async (data: CreateEscalationPolicyDto): Promise<EscalationPolicy> => {
        const response = await apiClient.post('/escalation-policies', data);
        return response.data.data;
    },

    /**
     * Create multiple escalation policies (bulk)
     */
    createBulk: async (policies: CreateEscalationPolicyDto[]): Promise<EscalationPolicy[]> => {
        const response = await apiClient.post('/escalation-policies/bulk', { policies });
        return response.data.data;
    },

    /**
     * Update an escalation policy
     */
    update: async (id: string, data: Partial<CreateEscalationPolicyDto>): Promise<EscalationPolicy> => {
        const response = await apiClient.put(`/escalation-policies/${id}`, data);
        return response.data.data;
    },

    /**
     * Delete an escalation policy
     */
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/escalation-policies/${id}`);
    },

    /**
     * Get escalation policies by service
     */
    getByService: async (serviceId: string): Promise<EscalationPolicy[]> => {
        const response = await apiClient.get(`/escalation-policies/service/${serviceId}`);
        return response.data.data || [];
    },
};

// =============================================
// ALERTS API
// =============================================
export interface Alert {
    id: string;
    rule_id?: string;
    organization_id: string;
    event_id?: string;
    department_id?: string;
    service_id?: string;
    device_id?: number;
    message: string;
    severity: string;
    status: string;
    acknowledged_by?: string;
    acknowledged_at?: Date;
    resolved_by?: string;
    resolved_at?: Date;
    escalation_level?: number;
    auto_assigned_to?: string;
    metadata?: Record<string, any>;
    created_at?: Date;
}

export const alertsApi = {
    /**
     * Get all alerts with optional filters
     */
    getAll: async (params?: {
        status?: string;
        severity?: string;
        event_id?: string;
        department_id?: string;
        service_id?: string;
        device_id?: string;
        from_date?: string;
        to_date?: string;
        page?: number;
        limit?: number;
    }): Promise<{ success: boolean; data: Alert[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> => {
        const response = await apiClient.get('/alerts', { params });
        return response.data;
    },

    /**
     * Get alert by ID
     */
    getById: async (id: string): Promise<{ success: boolean; data: Alert }> => {
        const response = await apiClient.get(`/alerts/${id}`);
        return response.data;
    },

    /**
     * Acknowledge an alert
     */
    acknowledge: async (id: string): Promise<{ success: boolean; data: Alert }> => {
        const response = await apiClient.post(`/alerts/${id}/acknowledge`);
        return response.data;
    },

    /**
     * Resolve an alert
     */
    resolve: async (id: string): Promise<{ success: boolean; data: Alert }> => {
        const response = await apiClient.post(`/alerts/${id}/resolve`);
        return response.data;
    },

    /**
     * Escalate an alert
     */
    escalate: async (id: string, escalation_level: number, assign_to?: string, reason?: string): Promise<{ success: boolean; data: Alert; message: string }> => {
        const response = await apiClient.post(`/alerts/${id}/escalate`, { escalation_level, assign_to, reason });
        return response.data;
    },

    /**
     * Get alert statistics
     */
    getStats: async (params?: { organization_id?: string }): Promise<{
        success: boolean;
        data: {
            total: number;
            active: number;
            acknowledged: number;
            resolved: number;
            expired: number;
            by_severity: {
                critical: number;
                high: number;
                medium: number;
                low: number;
            };
        };
    }> => {
        const response = await apiClient.get('/alerts/stats', { params });
        return response.data;
    },

    /**
     * Delete an alert (admin only)
     */
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete(`/alerts/${id}`);
        return response.data;
    },

    /**
     * Approve a resolved alert
     */
    approve: async (id: string, approval_notes?: string): Promise<{ success: boolean; data: Alert; message: string }> => {
        const response = await apiClient.post(`/alerts/${id}/approve`, { approval_notes });
        return response.data;
    },
};

// =============================================
// ESCALATIONS API
// =============================================

export interface Escalation {
    id: string;
    organization_id: string;
    event_id: string | null;
    department_id: string | null;
    service_id: string | null;
    alert_id: string | null;
    task_id: string | null;
    reason: string;
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    assigned_to: string | null;
    escalated_at: string;
    acknowledged_at: string | null;
    acknowledged_by: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    resolution_notes: string | null;
    evidence_urls: string[];
    metadata: Record<string, any> | null;
    created_at: string;
    updated_at: string;
    sps_organizations?: { id: string; name: string };
    sps_events?: { id: string; name: string };
    sps_departments?: { id: string; name: string };
    sps_department_services?: { id: string; name: string };
    sps_alerts?: { id: string; message: string; severity: string };
    sps_tasks?: { id: string; title: string; status: string };
    assigned_user?: { id: string; full_name: string; email: string };
    acknowledged_user?: { id: string; full_name: string };
    resolved_user?: { id: string; full_name: string };
}

export interface EscalationStats {
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    bySeverity: Record<string, number>;
}

export const escalationsApi = {
    /**
     * Get all escalations with optional filters
     */
    getAll: async (params?: {
        organization_id?: string;
        event_id?: string;
        department_id?: string;
        service_id?: string;
        status?: string;
        severity?: string;
        assigned_to?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        success: boolean;
        data: Escalation[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
    }> => {
        const response = await apiClient.get('/escalations', { params });
        return response.data;
    },

    /**
     * Get my escalations (assigned to current user)
     */
    getMyEscalations: async (params?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        success: boolean;
        data: Escalation[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
    }> => {
        const response = await apiClient.get('/escalations/my', { params });
        return response.data;
    },

    /**
     * Get pending count for navbar badge
     */
    getPendingCount: async (): Promise<{ success: boolean; data: { count: number } }> => {
        const response = await apiClient.get('/escalations/pending-count');
        return response.data;
    },

    /**
     * Get escalation statistics
     */
    getStatistics: async (params?: {
        organization_id?: string;
        event_id?: string;
        assigned_to?: string;
    }): Promise<{ success: boolean; data: EscalationStats }> => {
        const response = await apiClient.get('/escalations/statistics', { params });
        return response.data;
    },

    /**
     * Get escalation by ID
     */
    getById: async (id: string): Promise<{ success: boolean; data: Escalation }> => {
        const response = await apiClient.get(`/escalations/${id}`);
        return response.data;
    },

    /**
     * Acknowledge an escalation
     */
    acknowledge: async (id: string): Promise<{ success: boolean; message: string; data: Escalation }> => {
        const response = await apiClient.post(`/escalations/${id}/acknowledge`);
        return response.data;
    },

    /**
     * Resolve an escalation
     */
    resolve: async (
        id: string,
        data: { resolution_notes?: string; evidence_urls?: string[] }
    ): Promise<{ success: boolean; message: string; data: Escalation }> => {
        const response = await apiClient.post(`/escalations/${id}/resolve`, data);
        return response.data;
    },

    /**
     * Add evidence to an escalation
     */
    addEvidence: async (
        id: string,
        evidence_urls: string[]
    ): Promise<{ success: boolean; message: string; data: Escalation }> => {
        const response = await apiClient.post(`/escalations/${id}/evidence`, { evidence_urls });
        return response.data;
    },
};