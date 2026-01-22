import express from 'express';
import { config } from './config';
import { 
    errorHandler, 
    notFoundHandler,
    setApiSecurityConfigFetcher,
    setMaintenanceSettingsFetcher,
    telemetryLimiter,
    maintenanceMode,
} from '@sustainpro/shared-middleware';
import { createLogger } from '@sustainpro/shared-utils';
import { setupSwagger } from '@sustainpro/shared-swagger';
import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// Import routes
import telemetryRoutes from './routes/telemetry.routes';
import webhookRoutes from './routes/webhook.routes';

const logger = createLogger({ service: 'iot-service' });

const app = express();

// Setup dynamic middleware fetchers
setApiSecurityConfigFetcher(async () => {
    try {
        const config = await prisma.sps_api_security_config.findUnique({
            where: { id: 'sps_api_security' },
        });
        return config;
    } catch (error) {
        logger.error('Failed to fetch API security config', { error });
        return null;
    }
});

setMaintenanceSettingsFetcher(async () => {
    try {
        const settings = await prisma.sps_system_settings.findUnique({
            where: { id: 'default' },
        });
        return settings ? {
            maintenance_mode: settings.maintenance_mode ?? false,
            maintenance_message: 'System is currently under maintenance. Please try again later.',
        } : null;
    } catch (error) {
        logger.error('Failed to fetch maintenance settings', { error });
        return null;
    }
});

// Middleware (CORS handled by nginx gateway)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply telemetry-specific rate limiting (higher limits for IoT devices)
app.use('/api/v1/telemetry', telemetryLimiter);
app.use('/api/v1/webhook', telemetryLimiter);

// Apply maintenance mode check (webhooks should still work during maintenance)
app.use('/api/v1/telemetry', maintenanceMode);

// Request logging
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
});

// Setup Swagger API documentation
setupSwagger(app, {
    serviceName: 'SustainPro IoT Service',
    serviceDescription: 'Telemetry Ingestion & Real-time Streaming API',
    version: '1.0.0',
    port: config.port,
    apiPrefix: '/api/v1',
    tags: [
        { name: 'Telemetry', description: 'Device telemetry ingestion & retrieval' },
        { name: 'Webhooks', description: 'AWS IoT Core webhook endpoints' },
        { name: 'Socket.IO', description: 'Real-time telemetry streaming' },
    ],
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'iot-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/webhook', webhookRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
