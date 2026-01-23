import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

export interface Device {
    id: number;
    organization_id: string;
    service_id?: string;
    device_code: string;
    api_key?: string;
    name?: string;
    type?: string;
    status: string;
    last_seen?: Date;
    metadata?: Record<string, any>;
    created_at: Date;
    updated_at: Date;
    // Joined fields
    service_name?: string;
    dept_name?: string;
}

export interface CreateDeviceInput {
    organization_id: string;
    device_code: string;
    name?: string;
    type?: string;
    api_key?: string;
    service_id?: string;
    metadata?: Record<string, any>;
}

export interface UpdateDeviceInput {
    name?: string;
    type?: string;
    service_id?: string | null;
    status?: string;
    last_seen?: Date;
    metadata?: Record<string, any>;
}

export class DeviceRepository {
    async findAll(organizationId?: string | null): Promise<Device[]> {
        if (organizationId) {
            const result = await prisma.$queryRaw`
                SELECT 
                    d.id, d.device_code, d.name, d.type, d.status, 
                    d.last_seen, d.metadata, d.created_at, d.organization_id,
                    s.name as service_name,
                    dept.name as dept_name
                FROM sps_devices d
                LEFT JOIN sps_department_services ds ON d.service_id = ds.id
                LEFT JOIN sps_service_templates s ON ds.service_template_id = s.id
                LEFT JOIN sps_departments dept ON ds.department_id = dept.id
                WHERE d.organization_id = ${organizationId}::uuid
                ORDER BY d.created_at DESC
            ` as any as Device[];
            return result;
        } else {
            const result = await prisma.$queryRaw`
                SELECT 
                    d.id, d.device_code, d.name, d.type, d.status, 
                    d.last_seen, d.metadata, d.created_at, d.organization_id,
                    s.name as service_name,
                    dept.name as dept_name
                FROM sps_devices d
                LEFT JOIN sps_department_services ds ON d.service_id = ds.id
                LEFT JOIN sps_service_templates s ON ds.service_template_id = s.id
                LEFT JOIN sps_departments dept ON ds.department_id = dept.id
                ORDER BY d.created_at DESC
            ` as any as Device[];
            return result;
        }
    }

    async findById(id: string, organizationId?: string): Promise<Device | null> {
        const deviceId = parseInt(id);
        if (organizationId) {
            const result = await prisma.$queryRaw`
                SELECT 
                    d.*,
                    s.name as service_name,
                    dept.name as dept_name
                FROM sps_devices d
                LEFT JOIN sps_department_services ds ON d.service_id = ds.id
                LEFT JOIN sps_service_templates s ON ds.service_template_id = s.id
                LEFT JOIN sps_departments dept ON ds.department_id = dept.id
                WHERE d.id = ${deviceId} AND d.organization_id = ${organizationId}::uuid
            ` as any as Device[];
            return result[0] || null;
        } else {
            const result = await prisma.$queryRaw`
                SELECT 
                    d.*,
                    s.name as service_name,
                    dept.name as dept_name
                FROM sps_devices d
                LEFT JOIN sps_department_services ds ON d.service_id = ds.id
                LEFT JOIN sps_service_templates s ON ds.service_template_id = s.id
                LEFT JOIN sps_departments dept ON ds.department_id = dept.id
                WHERE d.id = ${deviceId}
            ` as any as Device[];
            return result[0] || null;
        }
    }

    async findByDeviceCode(deviceCode: string): Promise<Device | null> {
        const result = await prisma.sps_devices.findFirst({
            where: { device_code: deviceCode },
        });
        return result as any as Device | null;
    }

    async findByApiKey(apiKey: string): Promise<Device | null> {
        const result = await prisma.$queryRaw`
            SELECT d.*, o.id as org_id 
             FROM sps_devices d
             LEFT JOIN sps_organizations o ON d.organization_id = o.id
             WHERE d.api_key = ${apiKey} AND d.status != 'INACTIVE'
        ` as any as Device[];
        return result[0] || null;
    }

    async findByOrganization(organizationId: string): Promise<Device[]> {
        const result = await prisma.$queryRaw`
            SELECT d.*, s.name as service_name
             FROM sps_devices d
             LEFT JOIN sps_department_services ds ON d.service_id = ds.id
             LEFT JOIN sps_service_templates s ON ds.service_id = s.id
             WHERE d.organization_id = ${organizationId}::uuid
             ORDER BY d.created_at DESC
        ` as any as Device[];
        return result;
    }

    async findByService(serviceId: string): Promise<Device[]> {
        const result = await prisma.sps_devices.findMany({
            where: { service_id: serviceId },
            orderBy: { name: 'asc' },
        });
        return result as any as Device[];
    }

    async create(data: CreateDeviceInput): Promise<Device> {
        const result = await prisma.sps_devices.create({
            data: {
                organization_id: data.organization_id,
                device_code: data.device_code,
                name: data.name || null,
                type: data.type || null,
                api_key: data.api_key || null,
                service_id: data.service_id || null,
                status: 'OFFLINE',
                metadata: data.metadata || {},
            },
        });
        return result as any as Device;
    }

    async update(id: string, data: UpdateDeviceInput): Promise<Device> {
        const updates: any = {};

        if (data.name !== undefined) updates.name = data.name;
        if (data.type !== undefined) updates.type = data.type;
        if (data.service_id !== undefined) updates.service_id = data.service_id;
        if (data.status !== undefined) updates.status = data.status;
        if (data.last_seen !== undefined) updates.last_seen = data.last_seen;
        if (data.metadata !== undefined) updates.metadata = data.metadata;

        const result = await prisma.sps_devices.update({
            where: { id: parseInt(id) },
            data: updates,
        });
        return result as any as Device;
    }

    async updateLastSeen(id: string | number): Promise<void> {
        await prisma.sps_devices.update({
            where: { id: typeof id === 'string' ? parseInt(id) : id },
            data: {
                last_seen: new Date(),
                status: 'ACTIVE',
            },
        });
    }

    async assignToService(deviceId: string, serviceId: string | null): Promise<Device> {
        const result = await prisma.sps_devices.update({
            where: { id: parseInt(deviceId) },
            data: {
                service_id: serviceId,
            },
        });
        return result as any as Device;
    }

    async delete(id: string): Promise<void> {
        await prisma.sps_devices.delete({
            where: { id: parseInt(id) },
        });
    }

    async countByOrganization(organizationId: string): Promise<number> {
        const result = await prisma.sps_devices.count({
            where: { organization_id: organizationId },
        });
        return result;
    }

    async getDeviceStats(organizationId?: string): Promise<{
        total: number;
        active: number;
        offline: number;
    }> {
        if (organizationId) {
            const result = await prisma.$queryRaw`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
                    COUNT(*) FILTER (WHERE status = 'OFFLINE') as offline
                FROM sps_devices
                WHERE organization_id = ${organizationId}::uuid
            ` as any;
            return {
                total: parseInt(result[0].total),
                active: parseInt(result[0].active),
                offline: parseInt(result[0].offline),
            };
        } else {
            const result = await prisma.$queryRaw`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
                    COUNT(*) FILTER (WHERE status = 'OFFLINE') as offline
                FROM sps_devices
            ` as any;
            return {
                total: parseInt(result[0].total),
                active: parseInt(result[0].active),
                offline: parseInt(result[0].offline),
            };
        }
    }
}
