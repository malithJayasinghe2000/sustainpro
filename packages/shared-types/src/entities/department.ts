/**
 * Department and Service entity types
 */
export interface Department {
    id: string;
    event_id: string;
    name: string;
    head_user_id: string | null;
    created_at: Date;
}

export interface CreateDepartmentDto {
    event_id: string;
    name: string;
    head_user_id?: string;
}

export interface ServiceDefinition {
    id: string;
    name: string;
    code_key: string;
    description: string | null;
    config_schema: Record<string, any>;
    required_permissions: string[];
    is_public: boolean;
    created_at: Date;
}

export interface ServiceInstance {
    id: string;
    department_id: string;
    definition_id: string;
    name: string | null;
    config: Record<string, any>;
    status: ServiceStatus;
    assigned_supervisor_id: string | null;
    created_at: Date;
    updated_at: Date;
}

export type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface CreateServiceInstanceDto {
    department_id: string;
    definition_id: string;
    name?: string;
    config?: Record<string, any>;
}
