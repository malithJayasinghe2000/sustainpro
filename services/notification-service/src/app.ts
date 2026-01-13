import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler, notFoundHandler } from '@sustainpro/shared-middleware';
import { createLogger } from '@sustainpro/shared-utils';
import { setupSwagger } from '@sustainpro/shared-swagger';

// Import routes
import notificationRoutes from './routes/notification.routes';

const logger = createLogger({ service: 'notification-service' });

const app = express();

// CORS configuration
app.use(cors({
    origin: config.cors.origins,
    credentials: true,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
});

// Setup Swagger API documentation
setupSwagger(app, {
    serviceName: 'SustainPro Notification Service',
    serviceDescription: 'Email, SMS, and Push Notification API',
    version: '1.0.0',
    port: config.port,
    apiPrefix: '/api/v1',
    tags: [
        { name: 'Notifications', description: 'Notification management' },
        { name: 'Email', description: 'Email sending operations' },
    ],
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'notification-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.use('/api/v1/notifications', notificationRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
