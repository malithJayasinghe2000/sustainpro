import { EventRepository } from '../repositories/event.repository';
import { Event, CreateEventDto, UpdateEventDto } from '@sustainpro/shared-types';
import {
    NotFoundError,
    ForbiddenError,
    createLogger,
    auditLogger,
    AuditAction,
    AuditCategory,
    AuditStatus,
    AuditSourceType,
    calculateChanges,
    maskSensitiveData
} from '@sustainpro/shared-utils';
import { publishEvent } from '../messaging/publisher';

const logger = createLogger({ service: 'core-service' });

/**
 * Audit context passed from controllers
 */
export interface AuditContext {
    actorUserId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestPath?: string;
}

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
    async create(data: CreateEventDto, createdBy?: string, auditCtx?: AuditContext): Promise<Event> {
        const startTime = Date.now();
        const code = await this.repo.generateCode();

        try {
            const event = await this.repo.create({ ...data, code });

            logger.info('Event created', { eventId: event.id, name: event.name });

            // Log event creation
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.CREATE,
                actorUserId: auditCtx?.actorUserId || createdBy,
                organizationId: event.organization_id,
                eventId: event.id,
                targetResource: 'event',
                targetId: event.id,
                targetName: event.name,
                status: AuditStatus.SUCCESS,
                newValues: maskSensitiveData({
                    name: event.name,
                    code: event.code,
                    location: event.location,
                    start_date: event.start_date,
                    end_date: event.end_date,
                    status: event.status
                }),
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                description: `Event "${event.name}" created`,
                durationMs: Date.now() - startTime,
            });

            await publishEvent('event.created', {
                event_id: event.id,
                organization_id: event.organization_id,
                name: event.name,
                created_by: createdBy,
            });

            return event;
        } catch (error) {
            // Log failed creation
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.CREATE,
                actorUserId: auditCtx?.actorUserId || createdBy,
                organizationId: data.organization_id,
                status: AuditStatus.FAILURE,
                errorMessage: (error as Error).message,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw error;
        }
    }

    /**
     * Update event
     */
    async update(id: string, data: UpdateEventDto, auditCtx?: AuditContext): Promise<Event> {
        const startTime = Date.now();

        // Get old values for change tracking
        const oldEvent = await this.repo.findById(id);
        if (!oldEvent) {
            // Log failed update
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.UPDATE,
                actorUserId: auditCtx?.actorUserId,
                targetResource: 'event',
                targetId: id,
                status: AuditStatus.FAILURE,
                errorMessage: `Event not found: ${id}`,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw new NotFoundError('Event', id);
        }

        try {
            const event = await this.repo.update(id, data);
            if (!event) {
                throw new NotFoundError('Event', id);
            }

            logger.info('Event updated', { eventId: id });

            // Calculate changes
            const changes = calculateChanges(oldEvent as any, event as any);

            // Log event update
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.UPDATE,
                actorUserId: auditCtx?.actorUserId,
                organizationId: event.organization_id,
                eventId: event.id,
                targetResource: 'event',
                targetId: id,
                targetName: event.name,
                status: AuditStatus.SUCCESS,
                oldValues: maskSensitiveData(oldEvent as any),
                newValues: maskSensitiveData(event as any),
                changes,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                description: `Event "${event.name}" updated`,
                durationMs: Date.now() - startTime,
            });

            await publishEvent('event.updated', {
                event_id: id,
                updates: Object.keys(data),
            });

            return event;
        } catch (error) {
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.UPDATE,
                actorUserId: auditCtx?.actorUserId,
                eventId: id,
                status: AuditStatus.FAILURE,
                errorMessage: (error as Error).message,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw error;
        }
    }

    /**
     * Delete event
     */
    async delete(id: string, auditCtx?: AuditContext): Promise<void> {
        const startTime = Date.now();

        // Get event info before deletion
        const event = await this.repo.findById(id);
        if (!event) {
            // Log failed delete
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.DELETE,
                actorUserId: auditCtx?.actorUserId,
                targetResource: 'event',
                targetId: id,
                status: AuditStatus.FAILURE,
                errorMessage: `Event not found: ${id}`,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw new NotFoundError('Event', id);
        }

        try {
            const deleted = await this.repo.delete(id);
            if (!deleted) {
                throw new NotFoundError('Event', id);
            }

            logger.info('Event deleted', { eventId: id });

            // Log event deletion
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.DELETE,
                actorUserId: auditCtx?.actorUserId,
                organizationId: event.organization_id,
                eventId: id,
                targetResource: 'event',
                targetId: id,
                targetName: event.name,
                status: AuditStatus.SUCCESS,
                oldValues: maskSensitiveData(event as any),
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                description: `Event "${event.name}" deleted`,
                durationMs: Date.now() - startTime,
            });

            await publishEvent('event.deleted', { event_id: id });
        } catch (error) {
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.DELETE,
                actorUserId: auditCtx?.actorUserId,
                eventId: id,
                status: AuditStatus.FAILURE,
                errorMessage: (error as Error).message,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw error;
        }
    }

    /**
     * Start event (change status to ACTIVE)
     */
    async start(id: string, auditCtx?: AuditContext): Promise<Event> {
        const startTime = Date.now();
        const event = await this.repo.findById(id);
        if (!event) {
            throw new NotFoundError('Event', id);
        }

        if (event.status === 'ACTIVE') {
            throw new ForbiddenError('Event is already active');
        }

        try {
            const updated = await this.repo.updateStatus(id, 'ACTIVE');

            logger.info('Event started', { eventId: id });

            // Log event activation
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.ACTIVATE,
                actorUserId: auditCtx?.actorUserId,
                organizationId: event.organization_id,
                eventId: id,
                targetResource: 'event',
                targetId: id,
                targetName: event.name,
                status: AuditStatus.SUCCESS,
                changes: { status: { old: event.status, new: 'ACTIVE' } },
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                description: `Event "${event.name}" started`,
                durationMs: Date.now() - startTime,
            });

            await publishEvent('event.started', {
                event_id: id,
                organization_id: event.organization_id,
            });

            return updated!;
        } catch (error) {
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.ACTIVATE,
                actorUserId: auditCtx?.actorUserId,
                eventId: id,
                status: AuditStatus.FAILURE,
                errorMessage: (error as Error).message,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw error;
        }
    }

    /**
     * Stop event (change status to PAUSED)
     */
    async stop(id: string, auditCtx?: AuditContext): Promise<Event> {
        const startTime = Date.now();
        const event = await this.repo.findById(id);
        if (!event) {
            throw new NotFoundError('Event', id);
        }

        if (event.status !== 'ACTIVE') {
            throw new ForbiddenError('Event is not active');
        }

        try {
            const updated = await this.repo.updateStatus(id, 'PAUSED');

            logger.info('Event stopped', { eventId: id });

            // Log event suspension
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.SUSPEND,
                actorUserId: auditCtx?.actorUserId,
                organizationId: event.organization_id,
                eventId: id,
                targetResource: 'event',
                targetId: id,
                targetName: event.name,
                status: AuditStatus.SUCCESS,
                changes: { status: { old: event.status, new: 'PAUSED' } },
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                description: `Event "${event.name}" stopped`,
                durationMs: Date.now() - startTime,
            });

            await publishEvent('event.stopped', {
                event_id: id,
                organization_id: event.organization_id,
            });

            return updated!;
        } catch (error) {
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.SUSPEND,
                actorUserId: auditCtx?.actorUserId,
                eventId: id,
                status: AuditStatus.FAILURE,
                errorMessage: (error as Error).message,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw error;
        }
    }

    /**
     * Archive event
     */
    async archive(id: string, auditCtx?: AuditContext): Promise<Event> {
        const startTime = Date.now();
        const event = await this.repo.findById(id);
        if (!event) {
            throw new NotFoundError('Event', id);
        }

        try {
            const updated = await this.repo.updateStatus(id, 'ARCHIVED');

            logger.info('Event archived', { eventId: id });

            // Log event archival
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.ARCHIVE,
                actorUserId: auditCtx?.actorUserId,
                organizationId: event.organization_id,
                eventId: id,
                targetResource: 'event',
                targetId: id,
                targetName: event.name,
                status: AuditStatus.SUCCESS,
                changes: { status: { old: event.status, new: 'ARCHIVED' } },
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                description: `Event "${event.name}" archived`,
                durationMs: Date.now() - startTime,
            });

            await publishEvent('event.archived', { event_id: id });
            return updated!;
        } catch (error) {
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.EVENT,
                action: AuditAction.ARCHIVE,
                actorUserId: auditCtx?.actorUserId,
                eventId: id,
                status: AuditStatus.FAILURE,
                errorMessage: (error as Error).message,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw error;
        }
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
