import app from './app';
import { config } from './config';
import { createLogger, initNotificationPublisher, closeNotificationPublisher, initCacheInvalidation, closeCacheInvalidation } from '@sustainpro/shared-utils';
import { initDatabase, closeDatabase } from '@sustainpro/shared-database';
import { initPermissionCacheInvalidation } from '@sustainpro/shared-middleware';

const logger = createLogger({ service: 'auth-service' });

// Async startup to initialize database and notification publisher
const startServer = async () => {
    try {
        // Initialize database connection
        await initDatabase();
        logger.info('✅ Database connected successfully');

        // Initialize notification publisher (RabbitMQ)
        if (config.rabbitmq?.url) {
            await initNotificationPublisher({
                url: config.rabbitmq.url,
                enabled: config.rabbitmq.enabled !== false,
            });
            logger.info('✅ Notification publisher connected');

            // Initialize cache invalidation service
            await initCacheInvalidation({
                url: config.rabbitmq.url,
                serviceName: 'auth-service',
                enabled: config.rabbitmq.enabled !== false,
            });
            
            // Also listen for cache invalidation events
            await initPermissionCacheInvalidation('auth-service', config.rabbitmq.url);
            logger.info('✅ Cache invalidation service initialized');
        } else {
            logger.warn('⚠️ RabbitMQ not configured - notifications will not be sent');
        }

        // Start server
        const server = app.listen(config.port, '0.0.0.0', () => {
            logger.info(`Auth Service running on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`CORS origins: ${config.cors.origins.join(', ')}`);
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            logger.info(`${signal} received, shutting down gracefully...`);

            server.close(async () => {
                logger.info('HTTP server closed');
                await closeNotificationPublisher();
                logger.info('Notification publisher closed');
                await closeCacheInvalidation();
                logger.info('Cache invalidation service closed');
                await closeDatabase();
                logger.info('Database connection closed');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        return server;
    } catch (error) {
        logger.error('Failed to start server:', { error: (error as Error).message });
        process.exit(1);
    }
};

// Start the server
const server = startServer();

export default server;
