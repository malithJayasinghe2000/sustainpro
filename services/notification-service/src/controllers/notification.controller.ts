import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service';
import { publishNotification, isConnected } from '../messaging/consumer';
import * as templates from '../templates/email.templates';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'notification-service' });

/**
 * GET /api/v1/notifications/health
 * Health check endpoint
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
    const emailStatus = emailService.getStatus();
    const rabbitmqStatus = isConnected();

    res.json({
        success: true,
        service: 'notification-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        components: {
            email: {
                configured: emailStatus.configured,
                host: emailStatus.host,
                port: emailStatus.port,
            },
            rabbitmq: {
                connected: rabbitmqStatus,
            },
        },
    });
};

/**
 * POST /api/v1/notifications/email/send
 * Send a direct email (bypasses queue for urgent notifications)
 */
export const sendDirectEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { to, subject, html, text, template, templateData } = req.body;

        if (!to || !subject) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: to, subject',
            });
            return;
        }

        let emailHtml = html;
        let emailText = text;

        // If template is specified, generate HTML from template
        if (template && templateData) {
            const generated = generateFromTemplate(template, templateData);
            emailHtml = generated.html || emailHtml;
            emailText = generated.text || emailText;
        }

        const result = await emailService.send({
            to,
            subject,
            html: emailHtml,
            text: emailText,
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'Email sent successfully',
                messageId: result.messageId,
                previewUrl: result.previewUrl,
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to send email',
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/notifications/email/queue
 * Queue an email for sending via RabbitMQ
 */
export const queueEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { to, type, ...data } = req.body;

        if (!to || !type) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: to, type',
            });
            return;
        }

        const routingKey = `notification.email.${type}`;
        const payload = {
            email: to,
            type,
            ...data,
        };

        const published = await publishNotification(routingKey, payload);

        if (published) {
            res.json({
                success: true,
                message: 'Email queued successfully',
                routingKey,
            });
        } else {
            // Fallback to direct send if RabbitMQ is not available
            logger.warn('RabbitMQ not available, falling back to direct send');
            
            // Forward to direct send
            req.body = { to, ...data, template: type, templateData: data };
            return sendDirectEmail(req, res, next);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/notifications/otp
 * Send OTP verification email
 */
export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, code, purpose, recipientName, expiryMinutes } = req.body;

        if (!email || !code || !purpose) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: email, code, purpose',
            });
            return;
        }

        const validPurposes = ['email_verification', 'password_reset', 'login_2fa', 'phone_verification'];
        if (!validPurposes.includes(purpose)) {
            res.status(400).json({
                success: false,
                error: `Invalid purpose. Must be one of: ${validPurposes.join(', ')}`,
            });
            return;
        }

        // Try to queue first
        const routingKey = 'notification.email.otp';
        const payload = {
            type: 'otp',
            email,
            code,
            purpose,
            recipientName,
            expiryMinutes,
        };

        const published = await publishNotification(routingKey, payload);

        if (published) {
            res.json({
                success: true,
                message: 'OTP email queued',
            });
            return;
        }

        // Fallback to direct send
        logger.warn('RabbitMQ not available, sending OTP directly');

        const html = templates.generateOtpEmailHtml({
            code,
            purpose,
            recipientName,
            expiryMinutes,
        });

        const text = templates.generateOtpEmailText({
            code,
            purpose,
            recipientName,
            expiryMinutes,
        });

        const subjectMap: Record<string, string> = {
            email_verification: 'Verify Your Email',
            password_reset: 'Reset Your Password',
            login_2fa: 'Two-Factor Authentication Code',
            phone_verification: 'Verify Your Phone',
        };

        const result = await emailService.send({
            to: email,
            subject: `SustainPro - ${subjectMap[purpose]}`,
            html,
            text,
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'OTP email sent',
                previewUrl: result.previewUrl,
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to send OTP email',
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/notifications/status
 * Get notification service status
 */
export const getStatus = async (req: Request, res: Response): Promise<void> => {
    const emailStatus = emailService.getStatus();
    const rabbitmqStatus = isConnected();

    res.json({
        success: true,
        data: {
            email: {
                ready: emailStatus.configured,
                provider: emailStatus.host,
            },
            rabbitmq: {
                connected: rabbitmqStatus,
            },
            uptime: process.uptime(),
        },
    });
};

/**
 * Generate email content from template
 */
function generateFromTemplate(template: string, data: any): { html?: string; text?: string } {
    switch (template) {
        case 'otp':
            return {
                html: templates.generateOtpEmailHtml(data),
                text: templates.generateOtpEmailText(data),
            };
        case 'password_changed':
            return {
                html: templates.generatePasswordChangedHtml(data),
                text: templates.generatePasswordChangedText(data),
            };
        case '2fa_status':
            return {
                html: templates.generateTwoFactorStatusHtml(data),
                text: templates.generateTwoFactorStatusText(data),
            };
        case 'welcome':
            return {
                html: templates.generateWelcomeHtml(data),
                text: templates.generateWelcomeText(data),
            };
        case 'alert':
            return {
                html: templates.generateAlertHtml(data),
                text: templates.generateAlertText(data),
            };
        default:
            return {};
    }
}
