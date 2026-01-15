import nodemailer from 'nodemailer';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';
import { getPrismaClient } from '@sustainpro/shared-database';

const logger = createLogger({ service: 'notification-service' });

export interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content?: string | Buffer;
        path?: string;
        contentType?: string;
    }>;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    previewUrl?: string;
    error?: string;
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private isConfigured: boolean = false;
    private fromName: string = config.smtp.from.name;
    private fromEmail: string = config.smtp.from.address;

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        // Try to load from database first
        try {
            const prisma = getPrismaClient();
            const dbConfig = await prisma.sps_smtp_settings.findFirst({
                where: { smtp_enabled: true },
                orderBy: { updated_at: 'desc' }
            });

            if (dbConfig && dbConfig.smtp_host) {
                this.transporter = nodemailer.createTransport({
                    host: dbConfig.smtp_host,
                    port: dbConfig.smtp_port || 587,
                    secure: dbConfig.smtp_encryption === 'SSL',
                    auth: {
                        user: dbConfig.smtp_username || '',
                        pass: dbConfig.smtp_password || '',
                    },
                    tls: { rejectUnauthorized: false }
                });

                if (dbConfig.from_email) this.fromEmail = dbConfig.from_email;
                if (dbConfig.from_name) this.fromName = dbConfig.from_name;

                await this.transporter.verify();
                this.isConfigured = true;
                logger.info('✅ Email service configured from Database settings', {
                    host: dbConfig.smtp_host,
                    port: dbConfig.smtp_port
                });
                return;
            }
        } catch (error) {
            logger.warn('Failed to load SMTP settings from database', { error: (error as Error).message });
        }

        // Fallback to Env Config
        if (config.smtp.auth.user && config.smtp.auth.pass) {
            try {
                this.transporter = nodemailer.createTransport({
                    host: config.smtp.host,
                    port: config.smtp.port,
                    secure: config.smtp.secure,
                    auth: {
                        user: config.smtp.auth.user,
                        pass: config.smtp.auth.pass,
                    },
                });

                // Verify connection
                await this.transporter.verify();
                this.isConfigured = true;
                logger.info('✅ Email service configured and connected', {
                    host: config.smtp.host,
                    port: config.smtp.port,
                });
            } catch (error) {
                logger.error('Failed to configure email service', {
                    error: (error as Error).message,
                    host: config.smtp.host,
                });
                this.transporter = null;
                this.isConfigured = false;
            }
        } else {
            logger.warn('⚠️  SMTP credentials not configured - emails will be logged only');
            // Create a test account for development using Ethereal
            if (config.nodeEnv === 'development') {
                try {
                    const testAccount = await nodemailer.createTestAccount();
                    this.transporter = nodemailer.createTransport({
                        host: 'smtp.ethereal.email',
                        port: 587,
                        secure: false,
                        auth: {
                            user: testAccount.user,
                            pass: testAccount.pass,
                        },
                    });
                    this.isConfigured = true;
                    logger.info('📧 Using Ethereal test email account', {
                        user: testAccount.user,
                        webUrl: 'https://ethereal.email',
                    });
                } catch (error) {
                    logger.warn('Could not create Ethereal test account', {
                        error: (error as Error).message
                    });
                }
            }
        }
    }

    /**
     * Send an email
     */
    async send(options: EmailOptions): Promise<EmailResult> {
        const mailOptions = {
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments,
            replyTo: options.replyTo,
            cc: options.cc,
            bcc: options.bcc,
        };

        // Lazy initialization if not configured yet (e.g. valid DB settings added later or startup failed)
        if (!this.transporter || !this.isConfigured) {
            await this.initialize();
        }

        if (!this.transporter || !this.isConfigured) {
            // Log email in development when no transporter
            logger.info('📧 Email (not sent - no transporter)', {
                to: options.to,
                subject: options.subject,
                textPreview: options.text?.substring(0, 200),
            });
            return {
                success: true,
                messageId: `dev-${Date.now()}`,
                previewUrl: undefined,
            };
        }

        try {
            const info = await this.transporter.sendMail(mailOptions);

            // Get preview URL for Ethereal
            const previewUrl = nodemailer.getTestMessageUrl(info);

            logger.info('✅ Email sent successfully', {
                to: options.to,
                subject: options.subject,
                messageId: info.messageId,
                previewUrl: previewUrl || undefined,
            });

            return {
                success: true,
                messageId: info.messageId,
                previewUrl: previewUrl || undefined,
            };
        } catch (error) {
            logger.error('❌ Failed to send email', {
                to: options.to,
                subject: options.subject,
                error: (error as Error).message,
            });

            return {
                success: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Check if email service is properly configured
     */
    isReady(): boolean {
        return this.isConfigured;
    }

    /**
     * Get service status
     */
    getStatus(): { configured: boolean; host: string; port: number } {
        return {
            configured: this.isConfigured,
            host: config.smtp.host,
            port: config.smtp.port,
        };
    }
}

// Singleton instance
export const emailService = new EmailService();
