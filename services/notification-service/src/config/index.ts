import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '5003'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database (for notification history/logs)
    database: {
        connectionString: process.env.DATABASE_URL || 'postgresql://sustainpro:sustainpro_dev@localhost:5434/sustainpro',
    },

    // CORS
    cors: {
        origins: process.env.CORS_ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:8080',
            'http://localhost:5000',
            'http://localhost:5001',
            'http://localhost:5002',
            'http://localhost:5003',
        ],
    },

    // RabbitMQ - Message Broker
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://sustainpro:sustainpro_dev@localhost:5672',
        enabled: process.env.RABBITMQ_ENABLED !== 'false',
        // Queue names for different notification types
        queues: {
            email: 'notifications.email',
            sms: 'notifications.sms',
            push: 'notifications.push',
        },
        exchange: 'sustainpro.notifications',
    },

    // SMTP Email Configuration
    // For testing: Use Ethereal (https://ethereal.email) or Mailtrap (https://mailtrap.io)
    // For production: Use SendGrid, AWS SES, Mailgun, etc.
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASSWORD || '',
        },
        from: {
            name: process.env.EMAIL_FROM_NAME || 'SustainPro',
            address: process.env.EMAIL_FROM_ADDRESS || 'noreply@sustainpro.io',
        },
    },

    // Email Templates Configuration
    templates: {
        otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
        companyName: process.env.COMPANY_NAME || 'SustainPro',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@sustainpro.io',
        logoUrl: process.env.LOGO_URL || 'https://sustainpro.io/logo.png',
    },

    // Rate Limiting for notifications
    rateLimit: {
        maxEmailsPerMinute: parseInt(process.env.MAX_EMAILS_PER_MINUTE || '60'),
        maxSmsPerMinute: parseInt(process.env.MAX_SMS_PER_MINUTE || '30'),
    },

    // Retry Configuration
    retry: {
        maxAttempts: parseInt(process.env.NOTIFICATION_RETRY_MAX || '3'),
        initialDelayMs: parseInt(process.env.NOTIFICATION_RETRY_DELAY_MS || '1000'),
        backoffMultiplier: parseFloat(process.env.NOTIFICATION_RETRY_BACKOFF || '2'),
    },
};

// Validate in production
if (config.nodeEnv === 'production') {
    if (!config.smtp.auth.user) {
        console.warn('⚠️  SMTP_USER not configured - emails will fail');
    }
}
