/**
 * Device entity and related types
 */
export interface Device {
    id: number;
    organization_id: string;
    service_id: string | null;
    device_code: string;
    api_key: string | null;
    name: string | null;
    type: string | null;
    status: DeviceStatus;
    last_seen: Date | null;
    metadata: DeviceMetadata;
    created_at: Date;
    updated_at: Date;
}

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'PROVISIONING' | 'ERROR';

export interface DeviceMetadata {
    firmware_version?: string;
    battery_level?: number;
    signal_strength?: number;
    aws_provisioned?: boolean;
    [key: string]: any;
}

export interface CreateDeviceDto {
    organization_id: string;
    device_code: string;
    name?: string;
    type?: string;
    service_id?: string;
}

export interface UpdateDeviceDto {
    name?: string;
    type?: string;
    status?: DeviceStatus;
    service_id?: string;
    metadata?: DeviceMetadata;
}

export interface DeviceModel {
    id: string;
    name: string;
    manufacturer: string;
    model_number: string;
    description: string | null;
    specs: Record<string, any>;
    created_at: Date;
}

export interface ProvisioningData {
    thing_name: string;
    iot_endpoint: string;
    certificate_pem: string;
    private_key: string;
    certificate_arn: string;
    topics: {
        telemetry: string;
        status: string;
        commands: string;
    };
}
