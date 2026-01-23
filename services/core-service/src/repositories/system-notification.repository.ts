import prisma from '@sustainpro/shared-database';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'core-service' });

export interface SystemNotification {
    id: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    source: string;
    source_id?: string;
    source_name?: string;
    action_url?: string;
    action_label?: string;
    is_read: boolean;
    created_at: Date;
    read_at?: Date;
    metadata?: any;
}

export interface NotificationFilters {
    user_id: string;
    organization_id?: string;
    is_read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
}

export interface CreateNotificationInput {
    target_user_id: string;
    organization_id?: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    source: string;
    source_id?: string;
    source_name?: string;
    action_url?: string;
    action_label?: string;
    metadata?: any;
}

export interface BulkNotificationInput {
    target_user_ids: string[];
    organization_id?: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    source: string;
    source_id?: string;
    source_name?: string;
    action_url?: string;
    action_label?: string;
    metadata?: any;
}

class SystemNotificationRepository {
    /**
     * Get all notifications for a user
     */
    async findAll(filters: NotificationFilters): Promise<{ notifications: SystemNotification[], total: number, unread_count: number }> {
        const { user_id, is_read, type, limit = 20, offset = 0 } = filters;

        const whereClause: any = {
            target_user_id: user_id,
            is_dismissed: false,
        };

        // Don't filter by organization_id - notifications are targeted by user_id
        // The target_user_id is the correct filter

        if (type) {
            whereClause.type = type.toUpperCase();
        }

        if (is_read !== undefined) {
            whereClause.is_read = is_read;
        }

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.sps_system_notifications.findMany({
                where: whereClause,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.sps_system_notifications.count({ where: whereClause }),
            prisma.sps_system_notifications.count({
                where: {
                    target_user_id: user_id,
                    is_dismissed: false,
                    is_read: false,
                }
            })
        ]);

        return {
            notifications: notifications.map(n => ({
                id: n.id,
                type: (n.type?.toLowerCase() === 'critical' ? 'critical' :
                    n.type?.toLowerCase() === 'warning' ? 'warning' : 'info') as 'critical' | 'warning' | 'info',
                title: n.title,
                message: n.message,
                source: n.source,
                source_id: n.source_id || undefined,
                source_name: n.source_name || undefined,
                action_url: n.action_url || undefined,
                action_label: n.action_label || undefined,
                is_read: n.is_read,
                created_at: n.created_at,
                read_at: n.read_at || undefined,
                metadata: n.metadata,
            })),
            total,
            unread_count: unreadCount,
        };
    }

    /**
     * Get a single notification by ID
     */
    async findById(id: string): Promise<SystemNotification | null> {
        const n = await prisma.sps_system_notifications.findUnique({
            where: { id }
        });

        if (!n) return null;

        return {
            id: n.id,
            type: (n.type?.toLowerCase() === 'critical' ? 'critical' :
                n.type?.toLowerCase() === 'warning' ? 'warning' : 'info') as 'critical' | 'warning' | 'info',
            title: n.title,
            message: n.message,
            source: n.source,
            source_id: n.source_id || undefined,
            source_name: n.source_name || undefined,
            action_url: n.action_url || undefined,
            action_label: n.action_label || undefined,
            is_read: n.is_read,
            created_at: n.created_at,
            read_at: n.read_at || undefined,
            metadata: n.metadata,
        };
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(id: string, userId: string): Promise<SystemNotification | null> {
        const n = await prisma.sps_system_notifications.update({
            where: { id },
            data: {
                is_read: true,
                read_at: new Date(),
            }
        });

        return {
            id: n.id,
            type: (n.type?.toLowerCase() === 'critical' ? 'critical' :
                n.type?.toLowerCase() === 'warning' ? 'warning' : 'info') as 'critical' | 'warning' | 'info',
            title: n.title,
            message: n.message,
            source: n.source,
            source_id: n.source_id || undefined,
            source_name: n.source_name || undefined,
            is_read: true,
            created_at: n.created_at,
            read_at: n.read_at || undefined,
            metadata: n.metadata,
        };
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<number> {
        const result = await prisma.sps_system_notifications.updateMany({
            where: {
                target_user_id: userId,
                is_read: false,
            },
            data: {
                is_read: true,
                read_at: new Date(),
            }
        });

        return result.count;
    }

    /**
     * Get unread notification count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return prisma.sps_system_notifications.count({
            where: {
                target_user_id: userId,
                is_read: false,
                is_dismissed: false,
            }
        });
    }

    /**
     * Create a new notification for a single user
     */
    async create(input: CreateNotificationInput): Promise<SystemNotification> {
        const n = await prisma.sps_system_notifications.create({
            data: {
                target_user_id: input.target_user_id,
                organization_id: input.organization_id || null,
                type: input.type.toUpperCase(),
                title: input.title,
                message: input.message,
                source: input.source,
                source_id: input.source_id || null,
                source_name: input.source_name || null,
                action_url: input.action_url || null,
                action_label: input.action_label || null,
                metadata: input.metadata || {},
            }
        });

        logger.info('Notification created', {
            notificationId: n.id,
            targetUser: input.target_user_id,
            type: input.type,
            source: input.source
        });

        return {
            id: n.id,
            type: input.type,
            title: input.title,
            message: input.message,
            source: input.source,
            source_id: input.source_id,
            source_name: input.source_name,
            action_url: input.action_url,
            action_label: input.action_label,
            is_read: false,
            created_at: n.created_at,
            metadata: input.metadata,
        };
    }

    /**
     * Create notifications for multiple users at once
     */
    async createBulk(input: BulkNotificationInput): Promise<number> {
        const data = input.target_user_ids.map(userId => ({
            target_user_id: userId,
            organization_id: input.organization_id || null,
            type: input.type.toUpperCase(),
            title: input.title,
            message: input.message,
            source: input.source,
            source_id: input.source_id || null,
            source_name: input.source_name || null,
            action_url: input.action_url || null,
            action_label: input.action_label || null,
            metadata: input.metadata || {},
        }));

        const result = await prisma.sps_system_notifications.createMany({
            data,
        });

        logger.info('Bulk notifications created', {
            count: result.count,
            targetUsers: input.target_user_ids.length,
            type: input.type,
            source: input.source
        });

        return result.count;
    }

    /**
     * Create notifications for super admins and organization admins
     */
    async notifySuperAndOrgAdmins(
        organizationId: string,
        notification: {
            type: 'critical' | 'warning' | 'info';
            title: string;
            message: string;
            source: string;
            source_id?: string;
            source_name?: string;
            action_url?: string;
            action_label?: string;
            metadata?: any;
        }
    ): Promise<number> {
        // Get all super admins
        const superAdmins = await prisma.sps_users.findMany({
            where: {
                is_super_admin: true,
                is_active: true,
            },
            select: { id: true, email: true }
        });

        logger.info('Found super admins for notification', {
            count: superAdmins.length,
            userIds: superAdmins.map(u => u.id),
            emails: superAdmins.map(u => u.email)
        });

        // Get organization admins (users with ORG_ADMIN role for this organization)
        const orgAdmins = await prisma.sps_role_assignments.findMany({
            where: {
                org_id: organizationId,
                role: 'ORG_ADMIN',
            },
            select: { user_id: true }
        });

        logger.info('Found org admins for notification', {
            organizationId,
            count: orgAdmins.length,
            userIds: orgAdmins.map(ra => ra.user_id)
        });

        // Combine and deduplicate user IDs
        const allUserIds = new Set([
            ...superAdmins.map(u => u.id),
            ...orgAdmins.map(ra => ra.user_id)
        ]);

        logger.info('Total unique users to notify', {
            count: allUserIds.size,
            userIds: Array.from(allUserIds)
        });

        if (allUserIds.size === 0) {
            logger.warn('No super admins or org admins found for notification', { organizationId });
            return 0;
        }

        return this.createBulk({
            target_user_ids: Array.from(allUserIds),
            organization_id: organizationId,
            ...notification
        });
    }

    /**
     * Dismiss a notification
     */
    async dismiss(id: string): Promise<boolean> {
        try {
            await prisma.sps_system_notifications.update({
                where: { id },
                data: {
                    is_dismissed: true,
                    dismissed_at: new Date(),
                }
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // =============================================
    // FLEXIBLE NOTIFICATION TARGETING METHODS
    // =============================================

    /**
     * Send notification to specific users by IDs
     */
    async notifyUsers(
        userIds: string[],
        notification: {
            type: 'critical' | 'warning' | 'info';
            title: string;
            message: string;
            source: string;
            source_id?: string;
            source_name?: string;
            action_url?: string;
            action_label?: string;
            metadata?: any;
            organization_id?: string;
        }
    ): Promise<number> {
        if (userIds.length === 0) {
            logger.warn('No user IDs provided for notification');
            return 0;
        }

        return this.createBulk({
            target_user_ids: userIds,
            organization_id: notification.organization_id,
            ...notification
        });
    }

    /**
     * Send notification to users with specific roles
     */
    async notifyByRole(
        roles: string[],
        organizationId: string | null,
        notification: {
            type: 'critical' | 'warning' | 'info';
            title: string;
            message: string;
            source: string;
            source_id?: string;
            source_name?: string;
            action_url?: string;
            action_label?: string;
            metadata?: any;
        }
    ): Promise<number> {
        // Find users with the specified roles
        const whereClause: any = {
            role: { in: roles }
        };

        if (organizationId) {
            whereClause.org_id = organizationId;
        }

        const roleAssignments = await prisma.sps_role_assignments.findMany({
            where: whereClause,
            select: { user_id: true }
        });

        const userIds = [...new Set(roleAssignments.map(ra => ra.user_id))];

        logger.info('Found users by role for notification', {
            roles,
            organizationId,
            count: userIds.length
        });

        if (userIds.length === 0) {
            logger.warn('No users found with specified roles', { roles, organizationId });
            return 0;
        }

        return this.createBulk({
            target_user_ids: userIds,
            organization_id: organizationId || undefined,
            ...notification
        });
    }

    /**
     * Send notification to all users in an organization
     */
    async notifyOrganization(
        organizationId: string,
        notification: {
            type: 'critical' | 'warning' | 'info';
            title: string;
            message: string;
            source: string;
            source_id?: string;
            source_name?: string;
            action_url?: string;
            action_label?: string;
            metadata?: any;
        }
    ): Promise<number> {
        // Get all active users in the organization
        const users = await prisma.sps_users.findMany({
            where: {
                organization_id: organizationId,
                is_active: true,
            },
            select: { id: true }
        });

        const userIds = users.map(u => u.id);

        logger.info('Found users in organization for notification', {
            organizationId,
            count: userIds.length
        });

        if (userIds.length === 0) {
            logger.warn('No users found in organization', { organizationId });
            return 0;
        }

        return this.createBulk({
            target_user_ids: userIds,
            organization_id: organizationId,
            ...notification
        });
    }

    /**
     * Send notification to users assigned to a specific event
     */
    async notifyEventUsers(
        eventId: string,
        notification: {
            type: 'critical' | 'warning' | 'info';
            title: string;
            message: string;
            source: string;
            source_id?: string;
            source_name?: string;
            action_url?: string;
            action_label?: string;
            metadata?: any;
        }
    ): Promise<number> {
        // Get users assigned to this event via role_assignments
        const eventAssignments = await prisma.sps_role_assignments.findMany({
            where: {
                event_id: eventId,
            },
            select: { user_id: true }
        });

        const userIds = [...new Set(eventAssignments.map(ra => ra.user_id))];

        logger.info('Found users assigned to event for notification', {
            eventId,
            count: userIds.length
        });

        if (userIds.length === 0) {
            logger.warn('No users assigned to event', { eventId });
            return 0;
        }

        return this.createBulk({
            target_user_ids: userIds,
            ...notification
        });
    }

    /**
     * Flexible notification sending with multiple targeting options
     * Supports: user IDs, roles, organization, event - or any combination
     */
    async notify(
        targets: {
            userIds?: string[];           // Specific user IDs
            roles?: string[];             // Role names (e.g., 'ORG_ADMIN', 'EVENT_MANAGER')
            organizationId?: string;      // Organization ID (for role filtering or all org users)
            eventId?: string;             // Event ID (for event-assigned users)
            includeSuperAdmins?: boolean; // Include all super admins
            allOrgUsers?: boolean;        // Include all users in the organization
        },
        notification: {
            type: 'critical' | 'warning' | 'info';
            title: string;
            message: string;
            source: string;
            source_id?: string;
            source_name?: string;
            action_url?: string;
            action_label?: string;
            metadata?: any;
        }
    ): Promise<number> {
        const allUserIds = new Set<string>();

        // 1. Add specific user IDs
        if (targets.userIds && targets.userIds.length > 0) {
            targets.userIds.forEach(id => allUserIds.add(id));
            logger.info('Added specific users', { count: targets.userIds.length });
        }

        // 2. Add super admins if requested
        if (targets.includeSuperAdmins) {
            const superAdmins = await prisma.sps_users.findMany({
                where: { is_super_admin: true, is_active: true },
                select: { id: true }
            });
            superAdmins.forEach(u => allUserIds.add(u.id));
            logger.info('Added super admins', { count: superAdmins.length });
        }

        // 3. Add users by role
        if (targets.roles && targets.roles.length > 0) {
            const whereClause: any = { role: { in: targets.roles } };
            if (targets.organizationId) {
                whereClause.org_id = targets.organizationId;
            }
            if (targets.eventId) {
                whereClause.event_id = targets.eventId;
            }

            const roleAssignments = await prisma.sps_role_assignments.findMany({
                where: whereClause,
                select: { user_id: true }
            });
            roleAssignments.forEach(ra => allUserIds.add(ra.user_id));
            logger.info('Added users by role', {
                roles: targets.roles,
                count: roleAssignments.length
            });
        }

        // 4. Add users assigned to event
        if (targets.eventId && !targets.roles) {
            const eventAssignments = await prisma.sps_role_assignments.findMany({
                where: { event_id: targets.eventId },
                select: { user_id: true }
            });
            eventAssignments.forEach(ra => allUserIds.add(ra.user_id));
            logger.info('Added event users', { count: eventAssignments.length });
        }

        // 5. Add all organization users
        if (targets.allOrgUsers && targets.organizationId) {
            const orgUsers = await prisma.sps_users.findMany({
                where: {
                    organization_id: targets.organizationId,
                    is_active: true
                },
                select: { id: true }
            });
            orgUsers.forEach(u => allUserIds.add(u.id));
            logger.info('Added all org users', { count: orgUsers.length });
        }

        // Final check
        if (allUserIds.size === 0) {
            logger.warn('No target users found for notification', { targets });
            return 0;
        }

        logger.info('Total unique users to notify', {
            count: allUserIds.size,
            userIds: Array.from(allUserIds)
        });

        return this.createBulk({
            target_user_ids: Array.from(allUserIds),
            organization_id: targets.organizationId,
            ...notification
        });
    }
}

export const systemNotificationRepository = new SystemNotificationRepository();
