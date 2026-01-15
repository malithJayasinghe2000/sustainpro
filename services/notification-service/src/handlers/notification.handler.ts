import { createLogger } from '@sustainpro/shared-utils';
import { emailService } from '../services/email.service';
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
