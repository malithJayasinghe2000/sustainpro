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
    },

    // CORS
    cors: {
        origins: process.env.CORS_ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [
            'http://localhost:3000',
            'http://localhost:8080',
        ],
    },

    // Security
    security: {
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        accountLockDurationMinutes: parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || '15'),
    },
};

// Validate required config in production
if (config.nodeEnv === 'production') {
    if (config.jwt.secret === 'dev-secret-change-in-production') {
        throw new Error('JWT_SECRET must be set in production');
    }
}
