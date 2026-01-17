import app from './app';
import { config } from './config';
import { connectRabbitMQ, closeRabbitMQ } from './messaging/publisher';
import { createLogger, closeCacheInvalidation, auditLogger } from '@sustainpro/shared-utils';
import { initDatabase, closeDatabase, getPrismaClient } from '@sustainpro/shared-database';
import { initPermissionCacheInvalidation } from '@sustainpro/shared-middleware';


const logger = createLogger({ service: 'core-service' });

const startServer = async () => {
    try {
        // Initialize database connection
        await initDatabase();
        logger.info('✅ Database connected successfully');

        // Initialize audit logger
        auditLogger.initialize(getPrismaClient());
        logger.info('✅ Audit logger initialized');

        // Connect to RabbitMQ
        await connectRabbitMQ();

        // Initialize cache invalidation listener
        if (config.rabbitmq?.url) {
            await initPermissionCacheInvalidation('core-service', config.rabbitmq.url);
            logger.info('✅ Cache invalidation listener initialized');
        }

        const server = app.listen(config.port, '0.0.0.0', () => {
            logger.info(`Core Service running on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`CORS origins: ${config.cors.origins.join(', ')}`);
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            logger.info(`${signal} received, shutting down gracefully...`);

            server.close(async () => {
                logger.info('HTTP server closed');
                await auditLogger.shutdown();
                logger.info('Audit logger closed');
                await closeRabbitMQ();
                await closeCacheInvalidation();
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

    } catch (error) {
        logger.error('Failed to start server', { error: (error as Error).message });
        process.exit(1);
    }
};

startServer();
