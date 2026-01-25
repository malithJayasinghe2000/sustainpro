import apiClient from './api';
import { 
    WidgetDefinition, 
    WidgetCategory, 
    WidgetPreset,
    CreateWidgetDefinitionInput,
    UpdateWidgetDefinitionInput,
    CreateWidgetCategoryInput,
    CreateWidgetPresetInput 
} from '@/types/dynamic-widgets';

// Use the default exported apiClient
const api = apiClient;

// =============================================
// WIDGET DEFINITIONS API
// =============================================

export const widgetDefinitionsApi = {
    // ========== Categories ==========
    
    getCategories: async (): Promise<WidgetCategory[]> => {
        const response = await api.get('/widget-definitions/categories');
        return response.data.data;
    },

    createCategory: async (data: CreateWidgetCategoryInput): Promise<WidgetCategory> => {
        const response = await api.post('/widget-definitions/categories', data);
        return response.data.data;
    },

    updateCategory: async (id: string, data: Partial<WidgetCategory>): Promise<WidgetCategory> => {
        const response = await api.put(`/widget-definitions/categories/${id}`, data);
        return response.data.data;
    },

    deleteCategory: async (id: string): Promise<void> => {
        await api.delete(`/widget-definitions/categories/${id}`);
    },

    // ========== Render Types ==========

    getRenderTypes: async (): Promise<{
        type: string;
        label: string;
        icon: string;
        description: string;
        default_size: { w: number; h: number };
        default_slots: any[];
        default_settings_schema: any;
    }[]> => {
        const response = await api.get('/widget-definitions/render-types');
        return response.data.data;
    },

    // ========== Definitions ==========

    getDefinitions: async (params?: {
        category_id?: string;
        render_type?: string;
        include_system?: boolean;
        include_deprecated?: boolean;
        search?: string;
    }): Promise<WidgetDefinition[]> => {
        const response = await api.get('/widget-definitions', { params });
        return response.data.data;
    },

    getDefinition: async (id: string): Promise<WidgetDefinition & { presets: WidgetPreset[] }> => {
        const response = await api.get(`/widget-definitions/${id}`);
        return response.data.data;
    },

    createDefinition: async (data: CreateWidgetDefinitionInput): Promise<WidgetDefinition> => {
        const response = await api.post('/widget-definitions', data);
        return response.data.data;
    },

    updateDefinition: async (id: string, data: UpdateWidgetDefinitionInput): Promise<WidgetDefinition> => {
        const response = await api.put(`/widget-definitions/${id}`, data);
        return response.data.data;
    },

    deleteDefinition: async (id: string): Promise<void> => {
        await api.delete(`/widget-definitions/${id}`);
    },

    duplicateDefinition: async (id: string): Promise<WidgetDefinition> => {
        const response = await api.post(`/widget-definitions/${id}/duplicate`);
        return response.data.data;
    },

    // ========== Presets ==========

    getPresets: async (definitionId: string): Promise<WidgetPreset[]> => {
        const response = await api.get(`/widget-definitions/${definitionId}/presets`);
        return response.data.data;
    },

    createPreset: async (definitionId: string, data: CreateWidgetPresetInput): Promise<WidgetPreset> => {
        const response = await api.post(`/widget-definitions/${definitionId}/presets`, data);
        return response.data.data;
    },

    updatePreset: async (id: string, data: Partial<WidgetPreset>): Promise<WidgetPreset> => {
        const response = await api.put(`/widget-definitions/presets/${id}`, data);
        return response.data.data;
    },

    deletePreset: async (id: string): Promise<void> => {
        await api.delete(`/widget-definitions/presets/${id}`);
    },
};

export default widgetDefinitionsApi;
