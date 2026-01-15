import app from './app';
import { config } from './config';
import { createLogger } from '@sustainpro/shared-utils';
import { connectRabbitMQ, closeRabbitMQ } from './messaging/consumer';
import { initDatabase, closeDatabase } from '@sustainpro/shared-database';

const logger = createLogger({ service: 'notification-service' });

async function startServer(): Promise<void> {
    try {
        // Initialize Database connection
        await initDatabase();

        // Connect to RabbitMQ for message consumption
        await connectRabbitMQ();

        // Start HTTP server
        const server = app.listen(config.port, () => {
            logger.info(`🔔 Notification Service running on port ${config.port}`);
            logger.info(`📧 Environment: ${config.nodeEnv}`);
            logger.info(`📨 SMTP: ${config.smtp.host}:${config.smtp.port}`);
            logger.info(`📚 Swagger: http://localhost:${config.port}/api/v1/docs`);
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            logger.info(`${signal} received, shutting down gracefully...`);

            server.close(async () => {
                logger.info('HTTP server closed');

                await closeRabbitMQ();
                await closeDatabase();

                logger.info('Shutdown complete');
                process.exit(0);
            });

            // Force exit after 10 seconds
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
}

startServer();
