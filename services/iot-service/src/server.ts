import http from 'http';
import app from './app';
import { config } from './config';
import { initSocket, getConnectedClientsCount } from './socket';
import { createLogger, auditLogger } from '@sustainpro/shared-utils';
import { initDatabase, closeDatabase, getPrismaClient } from '@sustainpro/shared-database';
import { startIotSubscriber } from './iot';

const logger = createLogger({ service: 'iot-service' });

// Async startup to initialize database
const startServer = async () => {
    try {
        // Initialize database connection
        await initDatabase();
        logger.info('✅ Database connected successfully');

        // Initialize audit logger
        auditLogger.initialize(getPrismaClient());
        logger.info('✅ Audit logger initialized');

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize Socket.IO
        const io = initSocket(server);

        // Initialize AWS IoT Subscriber
        startIotSubscriber();

        // Start server
        server.listen(config.port, () => {
            logger.info(`IoT Service running on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`CORS origins: ${config.cors.origins.join(', ')}`);
            logger.info('Socket.IO ready for connections');
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            logger.info(`${signal} received, shutting down gracefully`);

            // Close Socket.IO
            io.close(() => {
                logger.info('Socket.IO connections closed');
            });

            // Close HTTP server
            server.close(async () => {
                logger.info('HTTP server closed');

                // Shutdown audit logger (flush pending logs)
                await auditLogger.shutdown();
                logger.info('Audit logger closed');

                // Close database connection
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

        // Log connected clients periodically
        setInterval(() => {
            const clientCount = getConnectedClientsCount();
            if (clientCount > 0) {
                logger.debug(`Connected Socket.IO clients: ${clientCount}`);
            }
        }, 30000);
    } catch (error) {
        logger.error('Failed to start server:', { error: (error as Error).message });
        process.exit(1);
    }
};

// Start the server
startServer();
