import nodemailer from 'nodemailer';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';

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

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
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
            from: `"${config.smtp.from.name}" <${config.smtp.from.address}>`,
            to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments,
            replyTo: options.replyTo,
            cc: options.cc,
            bcc: options.bcc,
        };

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
