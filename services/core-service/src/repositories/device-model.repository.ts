import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// Actual schema:
// id VARCHAR(50) PRIMARY KEY
// name VARCHAR(100) NOT NULL
// description TEXT
// parameters JSONB DEFAULT '[]'
// created_by VARCHAR(50)
// created_at, updated_at

export interface DeviceModel {
    id: string;
    name: string;
    description?: string;
    parameters: Record<string, any>[];
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateDeviceModelInput {
    id: string;
    name: string;
    description?: string;
    parameters?: Record<string, any>[];
    created_by?: string;
}

export interface UpdateDeviceModelInput {
    name?: string;
    description?: string;
    parameters?: Record<string, any>[];
}

export class DeviceModelRepository {
    async findAll(): Promise<DeviceModel[]> {
        const result = await prisma.sps_device_models.findMany({
            orderBy: { name: 'asc' },
        });
        return result as any as DeviceModel[];
    }

    async findById(id: string): Promise<DeviceModel | null> {
        const result = await prisma.sps_device_models.findUnique({
            where: { id },
        });
        return result as any as DeviceModel | null;
    }

    async create(data: CreateDeviceModelInput): Promise<DeviceModel> {
        const result = await prisma.sps_device_models.create({
            data: {
                id: data.id,
                name: data.name,
                description: data.description || null,
                parameters: data.parameters || [],
                created_by: data.created_by || null,
            },
        });
        return result as any as DeviceModel;
    }

    async update(id: string, data: UpdateDeviceModelInput): Promise<DeviceModel> {
        const updates: any = {};

        if (data.name !== undefined) updates.name = data.name;
        if (data.description !== undefined) updates.description = data.description;
        if (data.parameters !== undefined) updates.parameters = data.parameters;

        const result = await prisma.sps_device_models.update({
            where: { id },
            data: updates,
        });
        return result as any as DeviceModel;
    }

    async delete(id: string): Promise<void> {
        await prisma.sps_device_models.delete({
            where: { id },
        });
    }

    async count(): Promise<number> {
        const result = await prisma.sps_device_models.count();
        return result;
    }
}
