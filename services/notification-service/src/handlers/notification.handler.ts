import { createLogger } from '@sustainpro/shared-utils';
import { emailService } from '../services/email.service';
import { shouldSendNotification } from '../services/notification-settings.service';
import * as templates from '../templates/email.templates';

const logger = createLogger({ service: 'notification-service' });

/**
 * Notification payload types
 */
interface OtpNotification {
    type: 'otp';
    email: string;
    recipientName?: string;
    code: string;
    purpose: 'email_verification' | 'password_reset' | 'login_2fa' | 'phone_verification';
    expiryMinutes?: number;
}

interface PasswordChangedNotification {
    type: 'password_changed';
    email: string;
    recipientName?: string;
    ipAddress?: string;
    userAgent?: string;
}

interface TwoFactorNotification {
    type: '2fa_enabled' | '2fa_disabled';
    email: string;
    recipientName?: string;
    method?: string;
}

interface WelcomeNotification {
    type: 'welcome';
    email: string;
    recipientName?: string;
    organizationName?: string;
    loginUrl?: string;
}

interface AlertNotification {
    type: 'alert';
    email: string;
    recipientName?: string;
    alertType: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    deviceName?: string;
    eventName?: string;
    actionUrl?: string;
}

interface GenericEmailNotification {
    type: 'generic';
    email: string;
    subject: string;
    html?: string;
    text?: string;
}

interface WelcomeCredentialsNotification {
    type: 'welcome_credentials';
    email: string;
    userName: string;
    userEmail: string;
    tempPassword: string;
    loginUrl: string;
    isTemporaryPassword: boolean;
}

type NotificationPayload =
    | OtpNotification
    | PasswordChangedNotification
    | TwoFactorNotification
    | WelcomeNotification
    | AlertNotification
    | GenericEmailNotification
    | WelcomeCredentialsNotification;

/**
 * Handle incoming notification message from RabbitMQ
 */
export async function handleNotificationMessage(
    channel: 'email' | 'sms' | 'push',
    routingKey: string,
    payload: any
): Promise<boolean> {
    logger.debug('Handling notification', { channel, routingKey });

    switch (channel) {
        case 'email':
            return handleEmailNotification(routingKey, payload);
        case 'sms':
            return handleSmsNotification(routingKey, payload);
        case 'push':
            return handlePushNotification(routingKey, payload);
        default:
            logger.warn('Unknown notification channel', { channel });
            return false;
    }
}

/**
 * Handle email notifications
 */
async function handleEmailNotification(routingKey: string, payload: any): Promise<boolean> {
    try {
        // Determine notification type from routing key or payload
        const notificationType = payload.type || extractTypeFromRoutingKey(routingKey);
        
        // Determine notification category and urgency for settings check
        let notificationCategory: 'alert' | 'report' | 'update' | 'otp' | 'security' = 'update';
        let isUrgent = false;
        
        // Categorize notification types
        if (['otp', 'email_verification', 'password_reset', 'login_2fa', 'phone_verification'].includes(notificationType)) {
            notificationCategory = 'otp';
        } else if (['password_changed', '2fa_enabled', '2fa_disabled'].includes(notificationType)) {
            notificationCategory = 'security';
        } else if (['alert', 'alert.critical', 'alert.warning', 'alert.info'].includes(notificationType)) {
            notificationCategory = 'alert';
            isUrgent = notificationType === 'alert.critical' || payload.alertType === 'critical';
        }

        // Check if notification should be sent based on settings
        const sendCheck = await shouldSendNotification(notificationCategory, isUrgent);
        if (!sendCheck.allowed) {
            logger.info('📧 Notification skipped due to settings', {
                type: notificationType,
                category: notificationCategory,
                reason: sendCheck.reason,
                email: payload.email,
            });
            return true; // Return true to acknowledge message (don't retry)
        }

        let result;

        switch (notificationType) {
            case 'otp':
            case 'email_verification':
            case 'password_reset':
            case 'login_2fa':
                result = await sendOtpEmail(payload);
                break;

            case 'password_changed':
                result = await sendPasswordChangedEmail(payload);
                break;

            case '2fa_enabled':
                result = await sendTwoFactorEmail({ ...payload, enabled: true });
                break;

            case '2fa_disabled':
                result = await sendTwoFactorEmail({ ...payload, enabled: false });
                break;

            case 'welcome':
            case 'user.created':
                result = await sendWelcomeEmail(payload);
                break;

            case 'alert':
            case 'alert.critical':
            case 'alert.warning':
            case 'alert.info':
                result = await sendAlertEmail(payload);
                break;

            case 'generic':
                result = await emailService.send({
                    to: payload.email || payload.to,
                    subject: payload.subject || payload.data?.subject || 'Notification',
                    html: payload.html || payload.data?.html,
                    text: payload.text || payload.data?.text,
                });
                break;

            case 'welcome_credentials':
                result = await sendWelcomeCredentialsEmail(payload);
                break;

            case 'event.end_requested':
                result = await sendEventEndRequestEmail(payload);
                break;

            case 'event.delete_requested':
                result = await sendEventDeleteRequestEmail(payload);
                break;

            default:
                logger.warn('Unknown email notification type', { notificationType, routingKey });
                return false;
        }

        return result.success;
    } catch (error) {
        logger.error('Error handling email notification', {
            error: (error as Error).message,
            routingKey,
        });
        return false;
    }
}

/**
 * Send OTP verification email
 */
async function sendOtpEmail(payload: any) {
    const purpose = payload.purpose || payload.data?.purpose || 'login_2fa';
    const email = payload.to || payload.email; // Support both 'to' and 'email' fields
    const code = payload.code || payload.data?.code; // Support both direct and nested code

    const html = templates.generateOtpEmailHtml({
        code,
        purpose,
        recipientName: payload.recipientName || payload.data?.userName,
        expiryMinutes: payload.expiryMinutes || payload.data?.expiryMinutes,
    });

    const text = templates.generateOtpEmailText({
        code,
        purpose,
        recipientName: payload.recipientName || payload.data?.userName,
        expiryMinutes: payload.expiryMinutes || payload.data?.expiryMinutes,
    });

    const subjectMap: Record<string, string> = {
        email_verification: 'Verify Your Email',
        password_reset: 'Reset Your Password',
        login_2fa: 'Two-Factor Authentication Code',
        phone_verification: 'Verify Your Phone',
    };

    return emailService.send({
        to: email,
        subject: `SustainPro - ${subjectMap[purpose] || 'Verification Code'}`,
        html,
        text,
    });
}

/**
 * Send password changed notification
 */
async function sendPasswordChangedEmail(payload: any) {
    const email = payload.to || payload.email; // Support both 'to' and 'email' fields

    const html = templates.generatePasswordChangedHtml({
        recipientName: payload.recipientName || payload.data?.userName,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
    });

    const text = templates.generatePasswordChangedText({
        recipientName: payload.recipientName || payload.data?.userName,
    });

    return emailService.send({
        to: email,
        subject: 'SustainPro - Password Changed',
        html,
        text,
    });
}

/**
 * Send 2FA status change notification
 */
async function sendTwoFactorEmail(payload: any) {
    const email = payload.to || payload.email; // Support both 'to' and 'email' fields

    const html = templates.generateTwoFactorStatusHtml({
        enabled: payload.enabled,
        recipientName: payload.recipientName || payload.data?.userName,
        method: payload.method,
    });

    const text = templates.generateTwoFactorStatusText({
        enabled: payload.enabled,
        recipientName: payload.recipientName || payload.data?.userName,
    });

    const status = payload.enabled ? 'Enabled' : 'Disabled';

    return emailService.send({
        to: email,
        subject: `SustainPro - Two-Factor Authentication ${status}`,
        html,
        text,
    });
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(payload: any) {
    const email = payload.to || payload.email; // Support both 'to' and 'email' fields

    const html = templates.generateWelcomeHtml({
        recipientName: payload.recipientName || payload.data?.userName,
        organizationName: payload.organizationName,
        loginUrl: payload.loginUrl,
    });

    const text = templates.generateWelcomeText({
        recipientName: payload.recipientName || payload.data?.userName,
        organizationName: payload.organizationName,
        loginUrl: payload.loginUrl,
    });

    return emailService.send({
        to: email,
        subject: 'Welcome to SustainPro! 🎉',
        html,
        text,
    });
}

/**
 * Send alert notification email
 */
async function sendAlertEmail(payload: any) {
    const alertType = payload.alertType || 'info';
    const email = payload.to || payload.email; // Support both 'to' and 'email' fields

    const html = templates.generateAlertHtml({
        alertType,
        title: payload.title,
        message: payload.message,
        recipientName: payload.recipientName || payload.data?.userName,
        deviceName: payload.deviceName,
        eventName: payload.eventName,
        actionUrl: payload.actionUrl,
    });

    const text = templates.generateAlertText({
        alertType,
        title: payload.title,
        message: payload.message,
        recipientName: payload.recipientName || payload.data?.userName,
        deviceName: payload.deviceName,
        eventName: payload.eventName,
        actionUrl: payload.actionUrl,
    });

    const emoji: Record<string, string> = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };

    return emailService.send({
        to: email,
        subject: `${emoji[alertType] || 'ℹ️'} SustainPro Alert: ${payload.title}`,
        html,
        text,
    });
}

/**
 * Send welcome credentials email (for admin-created users)
 */
async function sendWelcomeCredentialsEmail(payload: any) {
    const email = payload.to || payload.email;

    const data = {
        userName: payload.data?.userName || payload.userName || 'User',
        userEmail: payload.data?.userEmail || payload.userEmail || email,
        tempPassword: payload.data?.tempPassword || payload.tempPassword,
        loginUrl: payload.data?.loginUrl || payload.loginUrl || 'https://sustainpro.io/login',
        isTemporaryPassword: payload.data?.isTemporaryPassword ?? payload.isTemporaryPassword ?? true,
    };

    const html = templates.generateWelcomeCredentialsHtml(data);
    const text = templates.generateWelcomeCredentialsText(data);

    return emailService.send({
        to: email,
        subject: 'Your SustainPro Account Has Been Created',
        html,
        text,
    });
}

/**
 * Send event delete request notification to org admins and super admins
 */
async function sendEventDeleteRequestEmail(payload: any) {
    const { getPrismaClient } = await import('@sustainpro/shared-database');
    const prisma = getPrismaClient();

    try {
        // Get event details
        const eventId = payload.event_id;
        const eventName = payload.event_name || 'Unknown Event';
        const eventCode = payload.event_code || '';
        const organizationId = payload.organization_id;
        const requestedById = payload.requested_by;
        const requestedAt = payload.requested_at ? new Date(payload.requested_at) : new Date();

        // Get requester's name
        const requester = await prisma.sps_users.findUnique({
            where: { id: requestedById },
            select: { full_name: true }
        });
        const requestedByName = requester?.full_name || 'Event Manager';

        // Get org admins
        const orgAdmins = await prisma.sps_users.findMany({
            where: {
                is_active: true,
                OR: [
                    {
                        sps_role_assignments: {
                            some: { role: 'ORG_ADMIN', org_id: organizationId }
                        }
                    },
                    {
                        organization_id: organizationId,
                        sps_role_assignments: {
                            some: { role: 'ORG_ADMIN' }
                        }
                    }
                ]
            },
            select: { id: true, email: true, full_name: true }
        });

        // Get super admins
        const superAdmins = await prisma.sps_users.findMany({
            where: {
                is_active: true,
                OR: [
                    { is_super_admin: true },
                    { sps_role_assignments: { some: { role: 'SUPER_ADMIN' } } }
                ]
            },
            select: { id: true, email: true, full_name: true }
        });

        const allRecipients = [...orgAdmins, ...superAdmins];
        const uniqueRecipients = allRecipients.filter((recipient, index, self) =>
            index === self.findIndex(r => r.email === recipient.email)
        );

        if (uniqueRecipients.length === 0) {
            logger.warn('No recipients found for event delete request', { eventId });
            return { success: true };
        }

        const baseUrl = process.env.FRONTEND_URL || 'https://app.sustainpro.io';
        const eventUrl = `${baseUrl}/events/${eventId}`;

        const results = [];
        for (const recipient of uniqueRecipients) {
            const html = templates.generateEventDeleteRequestHtml({
                recipientName: recipient.full_name || undefined,
                eventName,
                eventCode,
                requestedByName,
                requestTime: requestedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
                eventUrl,
            });

            const text = templates.generateEventDeleteRequestText({
                recipientName: recipient.full_name || undefined,
                eventName,
                eventCode,
                requestedByName,
                requestTime: requestedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
                eventUrl,
            });

            const result = await emailService.send({
                to: recipient.email,
                subject: `CRITICAL: Event Delete Request: ${eventName}`,
                html,
                text,
            });
            results.push(result);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const successCount = results.filter(r => r.success).length;
        return { success: successCount > 0 };
    } catch (error) {
        logger.error('Error sending event delete request notification', { error: (error as Error).message });
        return { success: false, error };
    }
}

/**
 * Send event end request notification to org admins and super admins
 */
async function sendEventEndRequestEmail(payload: any) {
    const { getPrismaClient } = await import('@sustainpro/shared-database');
    const prisma = getPrismaClient();

    try {
        // Get event details
        const eventId = payload.event_id;
        const eventName = payload.event_name || 'Unknown Event';
        const eventCode = payload.event_code || '';
        const organizationId = payload.organization_id;
        const requestedById = payload.requested_by;
        const requestedAt = payload.requested_at ? new Date(payload.requested_at) : new Date();

        // Get requester's name
        const requester = await prisma.sps_users.findUnique({
            where: { id: requestedById },
            select: { full_name: true }
        });
        const requestedByName = requester?.full_name || 'Event Manager';

        // Get org admins for this organization
        // Get org admins for this organization
        const orgAdmins = await prisma.sps_users.findMany({
            where: {
                is_active: true,
                OR: [
                    // Case 1: Explicit assignment to this Org
                    {
                        sps_role_assignments: {
                            some: {
                                role: 'ORG_ADMIN',
                                org_id: organizationId
                            }
                        }
                    },
                    // Case 2: User belongs to Org and has generic Org Admin role
                    {
                        organization_id: organizationId,
                        sps_role_assignments: {
                            some: {
                                role: 'ORG_ADMIN'
                            }
                        }
                    }
                ]
            },
            select: { id: true, email: true, full_name: true }
        });

        // Get super admins
        const superAdmins = await prisma.sps_users.findMany({
            where: {
                is_active: true,
                OR: [
                    { is_super_admin: true },
                    {
                        sps_role_assignments: {
                            some: { role: 'SUPER_ADMIN' }
                        }
                    }
                ]
            },
            select: { id: true, email: true, full_name: true }
        });

        // Combine recipients (unique by email)
        const allRecipients = [...orgAdmins, ...superAdmins];
        const uniqueRecipients = allRecipients.filter((recipient, index, self) =>
            index === self.findIndex(r => r.email === recipient.email)
        );

        if (uniqueRecipients.length === 0) {
            logger.warn('No recipients found for event end request notification', { eventId, organizationId });
            return { success: true }; // No recipients but not an error
        }

        // Build event URL
        const baseUrl = process.env.FRONTEND_URL || 'https://app.sustainpro.io';
        const eventUrl = `${baseUrl}/events/${eventId}`;

        // Send email to each recipient sequentially to avoid rate limits
        const results = [];
        for (const recipient of uniqueRecipients) {
            const html = templates.generateEventEndRequestHtml({
                recipientName: recipient.full_name || undefined,
                eventName,
                eventCode,
                requestedByName,
                requestTime: requestedAt.toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }),
                eventUrl,
            });

            const text = templates.generateEventEndRequestText({
                recipientName: recipient.full_name || undefined,
                eventName,
                eventCode,
                requestedByName,
                requestTime: requestedAt.toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }),
                eventUrl,
            });

            const result = await emailService.send({
                to: recipient.email,
                subject: `Event End Request: ${eventName} - Action Required`,
                html,
                text,
            });
            results.push(result);

            // Wait 1 second between emails to prevent "Too many emails per second" error
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const successCount = results.filter(r => r.success).length;
        logger.info(`Event end request notifications sent`, {
            eventId,
            totalRecipients: uniqueRecipients.length,
            successCount
        });

        return { success: true };
    } catch (error) {
        logger.error('Failed to send event end request notification', {
            error: (error as Error).message,
            payload
        });
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Extract notification type from routing key
 */
function extractTypeFromRoutingKey(routingKey: string): string {
    // Examples:
    // notification.email.otp -> otp
    // user.password_changed -> password_changed
    // alert.critical -> alert.critical

    const parts = routingKey.split('.');

    if (parts[0] === 'notification' && parts.length >= 3) {
        return parts[2];
    }

    if (parts[0] === 'user' && parts.length >= 2) {
        return parts[1];
    }

    if (parts[0] === 'alert') {
        return routingKey;
    }

    // Handle event routing keys
    if (parts[0] === 'event') {
        return routingKey; // Return full key like 'event.end_requested'
    }

    return routingKey;
}

/**
 * Handle SMS notifications (placeholder for future)
 */
async function handleSmsNotification(routingKey: string, payload: any): Promise<boolean> {
    logger.info('SMS notification received (not implemented)', { routingKey });
    // TODO: Implement SMS provider (Twilio, AWS SNS, etc.)
    return true;
}

/**
 * Handle push notifications (placeholder for future)
 */
async function handlePushNotification(routingKey: string, payload: any): Promise<boolean> {
    logger.info('Push notification received (not implemented)', { routingKey });
    // TODO: Implement push notification (Firebase, OneSignal, etc.)
    return true;
}
