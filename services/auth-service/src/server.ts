import app from './app';
import { config } from './config';
import { closePool } from './db';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'auth-service' });

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

export default server;
