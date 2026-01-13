import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    database: {
        connectionString: process.env.DATABASE_URL || 'postgresql://sustainpro:sustainpro_dev@localhost:5432/sustainpro',
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret',
        tokenExpireMinutes: parseInt(process.env.TOKEN_EXPIRE_MINUTES || '60'),
        refreshTokenExpireDays: parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || '7'),
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

    // Security
    security: {
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        accountLockDurationMinutes: parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || '15'),
        sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30'),
        sessionTimeoutEnabled: process.env.SESSION_TIMEOUT_ENABLED !== 'false',
    },

    // OTP Configuration
    otp: {
        expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
        length: parseInt(process.env.OTP_LENGTH || '6'),
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3'),
    },

    // 2FA Configuration
    twoFactor: {
        required: process.env.TWO_FACTOR_REQUIRED === 'true',
        method: (process.env.TWO_FACTOR_METHOD || 'email') as 'email' | 'totp' | 'both',
    },

    // RabbitMQ (for notification publishing)
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://sustainpro:sustainpro_dev@localhost:5672',
        enabled: process.env.RABBITMQ_ENABLED !== 'false',
    },

    // Rate Limiting
    rateLimit: {
        loginAttempts: parseInt(process.env.LOGIN_RATE_LIMIT_ATTEMPTS || '5'),
        loginWindowMinutes: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MINS || '15'),
    },
};

// Validate required config in production
if (config.nodeEnv === 'production') {
    if (config.jwt.secret === 'dev-secret-change-in-production') {
        throw new Error('JWT_SECRET must be set in production');
    }
    if (config.jwt.refreshSecret === 'dev-refresh-secret') {
        throw new Error('JWT_REFRESH_SECRET must be set in production');
    }
}
