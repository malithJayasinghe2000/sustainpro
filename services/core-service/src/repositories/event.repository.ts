import { getPrismaClient } from '@sustainpro/shared-database';
import { Event, CreateEventDto, UpdateEventDto } from '@sustainpro/shared-types';

const prisma = getPrismaClient();

export class EventRepository {
    /**
     * Get all events (for super admin)
     */
    async findAll(): Promise<Event[]> {
        const events = await prisma.$queryRaw`
            SELECT e.*, o.name as organization_name
            FROM sps_events e
            LEFT JOIN sps_organizations o ON e.organization_id = o.id
            ORDER BY e.created_at DESC
        ` as any[];

        return events as Event[];
    }

    /**
     * Get all events with pagination (for super admin)
     */
    async findAllPaginated(params?: {
        page?: number;
        limit?: number;
        search?: string;
        organizationId?: string;
    }): Promise<{ events: Event[]; total: number; pages: number }> {
        const page = params?.page || 1;
        const limit = params?.limit || 20;
        const skip = (page - 1) * limit;

        // Build where clause
        const whereConditions: any = {};

        if (params?.organizationId) {
            whereConditions.organization_id = params.organizationId;
        }

        if (params?.search) {
            whereConditions.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { code: { contains: params.search, mode: 'insensitive' } },
                { location: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        // Get total count
        const total = await prisma.sps_events.count({
            where: whereConditions
        });

        // Get paginated events
        const events = await prisma.sps_events.findMany({
            where: whereConditions,
            include: {
                sps_organizations: {
                    select: { name: true }
                }
            },
            orderBy: { created_at: 'desc' },
            skip,
            take: limit
        });

        // Transform to include organization_name
        const transformedEvents = events.map(e => ({
            ...e,
            organization_name: (e as any).sps_organizations?.name
        })) as any as Event[];

        return {
            events: transformedEvents,
            total,
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Get events by organization
     */
    async findByOrganization(organizationId: string): Promise<Event[]> {
        const events = await prisma.sps_events.findMany({
            where: { organization_id: organizationId },
            orderBy: { created_at: 'desc' }
        });

        return events as any as Event[];
    }

    /**
     * Get event by ID
     */
    async findById(id: string): Promise<Event | null> {
        const event = await prisma.sps_events.findUnique({
            where: { id },
            include: {
                sps_organizations: {
                    select: { name: true }
                }
            }
        });

        if (!event) return null;

        return {
            ...event,
            organization_name: event.sps_organizations?.name
        } as any as Event;
    }

    /**
     * Create a new event
     */
    async create(data: CreateEventDto & { code: string }): Promise<Event> {
        const event = await prisma.sps_events.create({
            data: {
                organization_id: data.organization_id,
                name: data.name,
                location: data.location || null,
                start_date: data.start_date ? new Date(data.start_date) : null,
                end_date: data.end_date ? new Date(data.end_date) : null,
                description: data.description || null,
                event_type: data.event_type || null,
                image_url: data.image_url || null,
                coordinates: data.coordinates || {},
                code: data.code,
                status: 'PLANNING',
            }
        });

        return event as any as Event;
    }

    /**
     * Update event
     */
    async update(id: string, data: UpdateEventDto): Promise<Event | null> {
        const updateData: any = {};

        const allowedFields: (keyof UpdateEventDto | 'end_requested' | 'end_requested_by' | 'end_requested_at' | 'delete_requested' | 'delete_requested_by' | 'delete_requested_at')[] = [
            'name', 'location', 'start_date', 'end_date',
            'status', 'description', 'event_type', 'image_url', 'coordinates',
            'end_requested', 'end_requested_by', 'end_requested_at',
            'delete_requested', 'delete_requested_by', 'delete_requested_at'
        ];

        for (const field of allowedFields) {
            if ((data as any)[field] !== undefined) {
                if ((field === 'start_date' || field === 'end_date' || field === 'end_requested_at' || field === 'delete_requested_at') && (data as any)[field]) {
                    updateData[field] = new Date((data as any)[field] as any);
                } else {
                    updateData[field] = (data as any)[field];
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return this.findById(id);
        }

        const event = await prisma.sps_events.update({
            where: { id },
            data: updateData
        });

        return event as any as Event;
    }

    /**
     * Delete event
     */
    async delete(id: string): Promise<boolean> {
        try {
            await prisma.sps_events.delete({
                where: { id }
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Update event status
     */
    async updateStatus(id: string, status: string): Promise<Event | null> {
        const event = await prisma.sps_events.update({
            where: { id },
            data: { status }
        });

        return event as any as Event;
    }

    /**
     * Generate next event code
     */
    async generateCode(): Promise<string> {
        const result = await prisma.$queryRaw<{ max_id: number }[]>`
            SELECT MAX(CAST(SUBSTRING(code FROM 9) AS INTEGER)) as max_id 
            FROM sps_events 
            WHERE code LIKE 'SPS-EVT-%'
        `;

        const nextId = (result[0]?.max_id || 0) + 1;
        return `SPS-EVT-${String(nextId).padStart(3, '0')}`;
    }

    /**
     * Get event with full details (departments, services)
     */
    async getFullDetails(id: string): Promise<any> {
        const event = await this.findById(id);
        if (!event) return null;

        // Get departments with services
        const departments = await prisma.sps_departments.findMany({
            where: { event_id: id },
            orderBy: { created_at: 'asc' },
            include: {
                sps_department_services: true
            }
        });

        return {
            ...event,
            departments,
        };
    }
}
