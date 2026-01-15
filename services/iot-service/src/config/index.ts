import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '5002'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    database: {
        connectionString: process.env.DATABASE_URL || 'postgresql://sustainpro:sustainpro_dev@localhost:5432/sustainpro',
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
        ],
    },

    // RabbitMQ
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5700',
        enabled: process.env.RABBITMQ_ENABLED !== 'false',
    },

    // AWS IoT Webhook
    awsIot: {
        webhookSecret: process.env.AWS_IOT_WEBHOOK_SECRET || 'development-webhook-secret',
    },

    // Live Data
    liveData: {
        offlineThresholdMs: parseInt(process.env.OFFLINE_THRESHOLD_MS || '10000'),
        cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || '60000'),
    },

    // JWT (for token verification)
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    },
};

// Validate required config in production
if (config.nodeEnv === 'production') {
    if (config.awsIot.webhookSecret === 'development-webhook-secret') {
        console.warn('WARNING: Using default AWS IoT webhook secret in production!');
    }
}
