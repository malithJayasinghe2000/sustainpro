import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '5001'),
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

    // AWS
    aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        s3Bucket: process.env.AWS_S3_BUCKET || 'sustainpro-uploads',
        // AWS IoT
        iot: {
            enabled: process.env.AWS_IOT_ENABLED === 'true',
            endpoint: process.env.AWS_IOT_ENDPOINT || '',
            policyName: process.env.AWS_IOT_POLICY_NAME || 'SustainProDevicePolicy',
        },
    },

    // Upload
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    },
};

// Validate required config in production
if (config.nodeEnv === 'production') {
    if (!config.aws.accessKeyId) {
        console.warn('AWS_ACCESS_KEY_ID not set - S3 uploads will be disabled');
    }
}
