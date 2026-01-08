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
        const events = await prisma.$queryRaw`
            SELECT e.*, o.name as organization_name
            FROM sps_events e
            LEFT JOIN sps_organizations o ON e.organization_id = o.id
            WHERE e.id = ${id}
        ` as any[];
        
        return events[0] || null;
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

        const allowedFields: (keyof UpdateEventDto)[] = [
            'name', 'location', 'start_date', 'end_date',
            'status', 'description', 'event_type', 'image_url'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                if ((field === 'start_date' || field === 'end_date') && data[field]) {
                    updateData[field] = new Date(data[field] as any);
                } else {
                    updateData[field] = data[field];
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
        const departments = await prisma.$queryRaw`
            SELECT d.*,
                COALESCE(
                    (SELECT json_agg(ds.*) FROM sps_department_services ds WHERE ds.department_id = d.id),
                    '[]'::json
                ) as services
            FROM sps_departments d
            WHERE d.event_id = ${id}
            ORDER BY d.created_at
        ` as any[];

        return {
            ...event,
            departments,
        };
    }
}
