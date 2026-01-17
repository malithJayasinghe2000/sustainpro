import { EventRepository } from '../repositories/event.repository';
import { Event, CreateEventDto, UpdateEventDto } from '@sustainpro/shared-types';
import { NotFoundError, ForbiddenError, createLogger } from '@sustainpro/shared-utils';
import { publishEvent } from '../messaging/publisher';

const logger = createLogger({ service: 'core-service' });

export class EventService {
    private repo = new EventRepository();

    /**
     * Get all events (for super admin) with pagination
     */
    async getAll(params?: {
        page?: number;
        limit?: number;
        search?: string;
        organizationId?: string;
    }): Promise<{ events: Event[]; total: number; pages: number }> {
        return this.repo.findAllPaginated(params);
    }

    /**
     * Get events by organization
     */
    async getByOrganization(organizationId: string): Promise<Event[]> {
        return this.repo.findByOrganization(organizationId);
    }

    /**
     * Get event by ID
     */
    async getById(id: string): Promise<Event> {
        const event = await this.repo.findById(id);
        if (!event) {
            throw new NotFoundError('Event', id);
        }
        return event;
    }

    /**
     * Create new event
     */
    async create(data: CreateEventDto, createdBy?: string): Promise<Event> {
        const code = await this.repo.generateCode();
        const event = await this.repo.create({ ...data, code });

        logger.info('Event created', { eventId: event.id, name: event.name });

        await publishEvent('event.created', {
            event_id: event.id,
            organization_id: event.organization_id,
            name: event.name,
            created_by: createdBy,
        });

        return event;
    }

    /**
     * Update event
     */
    async update(id: string, data: UpdateEventDto): Promise<Event> {
        const event = await this.repo.update(id, data);
        if (!event) {
            throw new NotFoundError('Event', id);
        }

        logger.info('Event updated', { eventId: id });

        await publishEvent('event.updated', {
            event_id: id,
            updates: Object.keys(data),
        });

        return event;
    }

    /**
     * Delete event
     */
    async delete(id: string): Promise<void> {
        const deleted = await this.repo.delete(id);
        if (!deleted) {
            throw new NotFoundError('Event', id);
        }

        logger.info('Event deleted', { eventId: id });

        await publishEvent('event.deleted', { event_id: id });
    }

    /**
     * Start event (change status to ACTIVE)
     */
    async start(id: string): Promise<Event> {
        const event = await this.repo.findById(id);
        if (!event) {
            throw new NotFoundError('Event', id);
        }

        if (event.status === 'ACTIVE') {
            throw new ForbiddenError('Event is already active');
        }

        const updated = await this.repo.updateStatus(id, 'ACTIVE');

        logger.info('Event started', { eventId: id });

        await publishEvent('event.started', {
            event_id: id,
            organization_id: event.organization_id,
        });

        return updated!;
    }

    /**
     * Stop event (change status to PAUSED)
     */
    async stop(id: string): Promise<Event> {
        const event = await this.repo.findById(id);
        if (!event) {
            throw new NotFoundError('Event', id);
        }

        if (event.status !== 'ACTIVE') {
            throw new ForbiddenError('Event is not active');
        }

        const updated = await this.repo.updateStatus(id, 'PAUSED');

        logger.info('Event stopped', { eventId: id });

        await publishEvent('event.stopped', {
            event_id: id,
            organization_id: event.organization_id,
        });

        return updated!;
    }

    /**
     * Archive event
     */
    async archive(id: string): Promise<Event> {
        const event = await this.repo.findById(id);
        if (!event) {
            throw new NotFoundError('Event', id);
        }

        const updated = await this.repo.updateStatus(id, 'ARCHIVED');

        logger.info('Event archived', { eventId: id });

        await publishEvent('event.archived', { event_id: id });

        return updated!;
    }

    /**
     * Get event with full details
     */
    async getFullDetails(id: string): Promise<any> {
        const details = await this.repo.getFullDetails(id);
        if (!details) {
            throw new NotFoundError('Event', id);
        }
        return details;
    }
}
