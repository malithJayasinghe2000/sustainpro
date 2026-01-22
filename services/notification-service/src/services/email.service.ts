import nodemailer from 'nodemailer';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';
import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

const logger = createLogger({ service: 'notification-service' });

/**
 * SMTP Settings from database
 */
interface SmtpDbSettings {
    smtp_enabled?: boolean | null;
    smtp_host?: string | null;
    smtp_port?: number | null;
    smtp_username?: string | null;
    smtp_password?: string | null;
    smtp_encryption?: string | null;
    from_email?: string | null;
    from_name?: string | null;
    reply_to_email?: string | null;
    test_mode?: boolean | null;
    test_email_recipient?: string | null;
}

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

/**
 * SMTP settings cache (60 second TTL)
 */
let cachedSmtpSettings: SmtpDbSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private isConfigured: boolean = false;
    private fromName: string = config.smtp.from.name;
    private fromEmail: string = config.smtp.from.address;
    private currentSettingsHash: string = '';
    private testMode: boolean = false;
    private testRecipient: string | null = null;

    constructor() {
        this.initialize();
    }

    /**
     * Get SMTP settings from database with caching
     */
    private async getSmtpSettingsFromDb(): Promise<SmtpDbSettings | null> {
        const now = Date.now();
        
        if (cachedSmtpSettings && (now - cacheTimestamp) < CACHE_TTL_MS) {
            return cachedSmtpSettings;
        }

        try {
            const settings = await prisma.sps_smtp_settings.findUnique({
                where: { id: 'sps_smtp_config' },
            });
            
            if (settings) {
                cachedSmtpSettings = settings;
                cacheTimestamp = now;
                return settings;
            }
        } catch (error) {
            logger.debug('Could not fetch SMTP settings from DB, using env config', {
                error: (error as Error).message,
            });
        }
        
        return null;
    }

    /**
     * Create a hash of current SMTP settings for change detection
     */
    private createSettingsHash(host: string, port: number, user: string): string {
        return `${host}:${port}:${user}`;
    }

    private async initialize(): Promise<void> {
        // Try database settings first
        const dbSettings = await this.getSmtpSettingsFromDb();
        
        let smtpHost: string;
        let smtpPort: number;
        let smtpUser: string;
        let smtpPass: string;
        let smtpSecure: boolean;

        if (dbSettings && dbSettings.smtp_enabled && dbSettings.smtp_host && dbSettings.smtp_username && dbSettings.smtp_password) {
            // Use database settings
            smtpHost = dbSettings.smtp_host;
            smtpPort = dbSettings.smtp_port || 587;
            smtpUser = dbSettings.smtp_username;
            smtpPass = dbSettings.smtp_password;
            smtpSecure = dbSettings.smtp_encryption === 'SSL';
            this.fromName = dbSettings.from_name || config.smtp.from.name;
            this.fromEmail = dbSettings.from_email || config.smtp.from.address;
            this.testMode = dbSettings.test_mode || false;
            this.testRecipient = dbSettings.test_email_recipient || null;
            
            logger.info('📧 Using SMTP settings from database');
        } else if (config.smtp.auth.user && config.smtp.auth.pass) {
            // Fall back to environment config
            smtpHost = config.smtp.host;
            smtpPort = config.smtp.port;
            smtpUser = config.smtp.auth.user;
            smtpPass = config.smtp.auth.pass;
            smtpSecure = config.smtp.secure;
            this.fromName = config.smtp.from.name;
            this.fromEmail = config.smtp.from.address;
            this.testMode = false;
            this.testRecipient = null;
            
            logger.info('📧 Using SMTP settings from environment');
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
            return;
        }

        // Check if settings changed
        const newHash = this.createSettingsHash(smtpHost, smtpPort, smtpUser);
        if (newHash === this.currentSettingsHash && this.transporter) {
            return; // No change, keep existing transporter
        }

        try {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
                tls: { rejectUnauthorized: false }
            });

            // Verify connection
            await this.transporter.verify();
            this.isConfigured = true;
            this.currentSettingsHash = newHash;
            
            logger.info('✅ Email service configured and connected', {
                host: smtpHost,
                port: smtpPort,
                testMode: this.testMode,
            });
        } catch (error) {
            logger.error('Failed to configure email service', {
                error: (error as Error).message,
                host: smtpHost,
            });
            this.transporter = null;
            this.isConfigured = false;
        }
    }

    /**
     * Refresh configuration from database (call periodically or on settings change)
     */
    async refreshConfiguration(): Promise<void> {
        cachedSmtpSettings = null;
        cacheTimestamp = 0;
        await this.initialize();
    }

    /**
     * Send an email
     */
    async send(options: EmailOptions): Promise<EmailResult> {
        // Lazy initialization if not configured yet (e.g. valid DB settings added later or startup failed)
        if (!this.transporter || !this.isConfigured) {
            await this.initialize();
        }

        // Handle test mode - redirect all emails to test recipient
        let actualRecipient = options.to;
        if (this.testMode && this.testRecipient) {
            logger.info('📧 Test mode enabled - redirecting email', {
                originalTo: options.to,
                testRecipient: this.testRecipient,
            });
            actualRecipient = this.testRecipient;
        }

        const mailOptions = {
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to: Array.isArray(actualRecipient) ? actualRecipient.join(', ') : actualRecipient,
            subject: this.testMode ? `[TEST] ${options.subject}` : options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments,
            replyTo: options.replyTo,
            cc: this.testMode ? undefined : options.cc, // Don't CC in test mode
            bcc: this.testMode ? undefined : options.bcc, // Don't BCC in test mode
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
                to: actualRecipient,
                originalTo: this.testMode ? options.to : undefined,
                subject: options.subject,
                messageId: info.messageId,
                previewUrl: previewUrl || undefined,
                testMode: this.testMode,
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
