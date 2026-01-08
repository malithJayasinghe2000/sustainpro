import app from './app';
import { config } from './config';
import { createLogger } from '@sustainpro/shared-utils';
import { initDatabase, closeDatabase } from '@sustainpro/shared-database';

const logger = createLogger({ service: 'auth-service' });

// Async startup to initialize database
const startServer = async () => {
    try {
        // Initialize database connection
        await initDatabase();
        logger.info('✅ Database connected successfully');

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
