import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
        if (token) {
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

// Users API functions
export const usersApi = {
    getAll: async () => {
        const response = await apiClient.get('/users');
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

// Settings API functions
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
    support_email: string;
    support_phone: string;
    global_alert_message: string;
    device_api_url: string;
    updated_at: string;
}

export const settingsApi = {
    get: async () => {
        const response = await apiClient.get('/settings');
        return response.data.settings as SystemSettings;
    },

    update: async (settings: Partial<SystemSettings>) => {
        const response = await apiClient.put('/settings', settings);
        return response.data.settings as SystemSettings;
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
        return response.data;
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
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/departments/${id}`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await apiClient.post('/departments', data);
        return response.data;
    },

    addService: async (departmentId: string, serviceId: string, config?: any) => {
        const response = await apiClient.post(`/departments/${departmentId}/services`, {
            service_id: serviceId,
            config: config || {}
        });
        return response.data;
    },

    removeService: async (departmentId: string, serviceId: string) => {
        const response = await apiClient.delete(`/departments/${departmentId}/services/${serviceId}`);
        return response.data;
    },

    getServices: async (departmentId: string) => {
        const response = await apiClient.get(`/departments/${departmentId}/services`);
        return response.data;
    }
};

export const departmentServicesApi = {
    getById: async (id: string) => {
        const response = await apiClient.get(`/department-services/${id}`);
        return response.data;
    },

    getDevices: async (id: string) => {
        const response = await apiClient.get(`/department-services/${id}/devices`);
        return response.data;
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
    getAll: async () => {
        const response = await apiClient.get('/organizations');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await apiClient.get(`/organizations/${id}`);
        return response.data;
    },
    getOne: async (id: string) => {
        const response = await apiClient.get(`/organizations/${id}`);
        return response.data;
    },
    getStructure: async (id: string) => {
        const response = await apiClient.get(`/organizations/${id}/structure`);
        return response.data;
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
    }
};

// ... (User Management APIs)

export const eventsApi = {
    getAll: async () => {
        const response = await apiClient.get('/events');
        return response.data;
    },
    getByOrg: async (orgId: string) => {
        const response = await apiClient.get(`/events/by-org/${orgId}`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await apiClient.post('/events', data);
        return response.data;
    },
    getById: async (id: string) => {
        const response = await apiClient.get(`/events/${id}`);
        return response.data;
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
    delete: async (id: string, adminPassword: string) => {
        const response = await apiClient.delete(`/events/${id}`, {
            data: { adminPassword }
        });
        return response.data;
    }
};



export const servicesApi = {
    getAll: async (scope?: string) => {
        const response = await apiClient.get('/services', { params: { scope } });
        return response.data;
    },
    getById: async (id: string) => {
        console.log('API Requesting Service ID:', id);
        const response = await apiClient.get(`/services/${id}`);
        return response.data;
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
        return response.data;
    },
    getMappings: async () => {
        const response = await apiClient.get('/rbac/mappings');
        return response.data;
    },
    updateMapping: async (role: string, permissions: string[]) => {
        const response = await apiClient.post('/rbac/mappings', { role, permissions });
        return response.data;
    }
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
