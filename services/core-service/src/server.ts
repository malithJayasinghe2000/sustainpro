import app from './app';
import { config } from './config';
import { closePool } from './db';
import { connectRabbitMQ, closeRabbitMQ } from './messaging/publisher';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'core-service' });

const startServer = async () => {
    try {
        // Connect to RabbitMQ
        await connectRabbitMQ();

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
                await closeRabbitMQ();
                await closePool();
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