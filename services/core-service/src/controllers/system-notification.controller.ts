import { Request, Response } from 'express';
import { systemNotificationRepository } from '../repositories/system-notification.repository';

/**
 * Get all notifications for the current user
 */
export const getNotifications = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        if (!user?.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const { is_read, type, limit = '20', offset = '0' } = req.query;

        const result = await systemNotificationRepository.findAll({
            user_id: user.id,
            is_read: is_read !== undefined ? is_read === 'true' : undefined,
            type: type as string,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
        });

        return res.json({
            success: true,
            data: result.notifications,
            meta: {
                total: result.total,
                unread_count: result.unread_count,
                limit: parseInt(limit as string, 10),
                offset: parseInt(offset as string, 10),
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        if (!user?.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const count = await systemNotificationRepository.getUnreadCount(user.id);

        return res.json({
            success: true,
            data: { count },
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

/**
 * Get a single notification by ID
 */
export const getNotificationById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const notification = await systemNotificationRepository.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
        }

        return res.json({
            success: true,
            data: notification,
        });
    } catch (error) {
        console.error('Error fetching notification:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch notification',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { id } = req.params;

        const notification = await systemNotificationRepository.markAsRead(id, user.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found',
            });
        }

        return res.json({
            success: true,
            data: notification,
            message: 'Notification marked as read',
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        if (!user?.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const count = await systemNotificationRepository.markAllAsRead(user.id);

        return res.json({
            success: true,
            data: { marked_count: count },
            message: `${count} notifications marked as read`,
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

/**
 * Dismiss/Delete a notification
 */
export const dismissNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const success = await systemNotificationRepository.dismiss(id);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or already dismissed',
            });
        }

        return res.json({
            success: true,
            message: 'Notification dismissed',
        });
    } catch (error) {
        console.error('Error dismissing notification:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to dismiss notification',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

/**
 * Create a new system notification (for internal use or admin)
 */
export const createNotification = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { target_user_id, type, title, message, source, source_id, source_name, action_url, action_label, metadata } = req.body;

        // Only super admins can create notifications for other users
        if (!user?.is_super_admin && target_user_id !== user?.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only super admins can create notifications for other users.',
            });
        }

        if (!type || !title || !message || !target_user_id) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: target_user_id, type, title, message',
            });
        }

        const notification = await systemNotificationRepository.create({
            target_user_id,
            organization_id: user.organization_id,
            type,
            title,
            message,
            source: source || 'system',
            source_id,
            source_name,
            action_url,
            action_label,
            metadata,
        });

        return res.status(201).json({
            success: true,
            data: notification,
            message: 'Notification created successfully',
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create notification',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
