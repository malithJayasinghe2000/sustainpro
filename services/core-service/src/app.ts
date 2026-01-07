import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { config } from './config';
import { authenticateToken, errorHandler, notFoundHandler, requireRole } from '@sustainpro/shared-middleware';
import { createLogger } from '@sustainpro/shared-utils';

// Import routes
import organizationRoutes from './routes/organization.routes';
import eventRoutes from './routes/event.routes';
import departmentRoutes from './routes/department.routes';
import departmentTemplateRoutes from './routes/department-template.routes';
import serviceRoutes from './routes/service.routes';
import settingsRoutes from './routes/settings.routes';
import uploadRoutes from './routes/upload.routes';
import deviceRoutes from './routes/device.routes';
import deviceModelRoutes from './routes/device-model.routes';

const logger = createLogger({ service: 'core-service' });

const app = express();

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman)
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
app.use(express.json());
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
        service: 'core-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

// Static files for local uploads
app.use('/api/v1/images/public', express.static(path.join(process.cwd(), 'uploads', 'public')));

// Settings routes (some are public)
app.use('/api/v1/settings', settingsRoutes);

// Protected routes - all require authentication
app.use('/api/v1/organizations', authenticateToken, organizationRoutes);
app.use('/api/v1/events', authenticateToken, eventRoutes);
app.use('/api/v1/departments', authenticateToken, departmentRoutes);
app.use('/api/v1/department-templates', authenticateToken, departmentTemplateRoutes);
app.use('/api/v1/services', authenticateToken, serviceRoutes);
app.use('/api/v1/upload', authenticateToken, uploadRoutes);
app.use('/api/v1/devices', authenticateToken, deviceRoutes);
app.use('/api/v1/device-models', authenticateToken, deviceModelRoutes);

// Admin routes - Super Admin only
app.get('/api/v1/admin/system-health', authenticateToken, requireRole('SUPER_ADMIN'), (req, res) => {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    res.json({
        success: true,
        data: {
            cpu: {
                count: cpus.length,
                model: cpus[0]?.model || 'Unknown',
                usage: cpus.map(cpu => {
                    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
                    return {
                        user: ((cpu.times.user / total) * 100).toFixed(2),
                        system: ((cpu.times.sys / total) * 100).toFixed(2),
                        idle: ((cpu.times.idle / total) * 100).toFixed(2),
                    };
                }),
            },
            memory: {
                total: Math.round(totalMemory / 1024 / 1024),
                used: Math.round(usedMemory / 1024 / 1024),
                free: Math.round(freeMemory / 1024 / 1024),
                usagePercent: ((usedMemory / totalMemory) * 100).toFixed(2),
            },
            uptime: {
                system: os.uptime(),
                process: process.uptime(),
            },
            platform: os.platform(),
            nodeVersion: process.version,
            timestamp: new Date().toISOString(),
        },
    });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
