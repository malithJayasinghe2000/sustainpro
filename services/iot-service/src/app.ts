import express from 'express';
import { config } from './config';
import { errorHandler, notFoundHandler } from '@sustainpro/shared-middleware';
import { createLogger } from '@sustainpro/shared-utils';
import { setupSwagger } from '@sustainpro/shared-swagger';

// Import routes
import telemetryRoutes from './routes/telemetry.routes';
import webhookRoutes from './routes/webhook.routes';

const logger = createLogger({ service: 'iot-service' });

const app = express();

// Middleware (CORS handled by nginx gateway)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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
