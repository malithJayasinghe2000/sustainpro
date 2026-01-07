import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler, notFoundHandler } from '@sustainpro/shared-middleware';
import { createLogger } from '@sustainpro/shared-utils';

// Import routes
import telemetryRoutes from './routes/telemetry.routes';
import webhookRoutes from './routes/webhook.routes';

const logger = createLogger({ service: 'iot-service' });

const app = express();

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, devices, Postman)
        if (!origin) {
            return callback(null, true);
        }
        if (config.cors.origins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn('CORS blocked origin', { origin });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
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
