import express from 'express';
import path from 'path';
import os from 'os';
import { config } from './config';
import {
    authenticateToken,
    errorHandler,
    notFoundHandler,
    requireRole,
    setApiSecurityConfigFetcher,
    setMaintenanceSettingsFetcher,
    dynamicApiLimiter,
    maintenanceMode,
} from '@sustainpro/shared-middleware';
import { createLogger } from '@sustainpro/shared-utils';
import { setupSwagger } from '@sustainpro/shared-swagger';
import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// Import routes
import organizationRoutes from './routes/organization.routes';
import eventRoutes from './routes/event.routes';
import departmentRoutes from './routes/department.routes';
import departmentTemplateRoutes from './routes/department-template.routes';
import departmentServiceRoutes from './routes/department-service.routes';
import serviceRoutes from './routes/service.routes';
import settingsRoutes from './routes/settings.routes';
import uploadRoutes from './routes/upload.routes';
import deviceRoutes from './routes/device.routes';
import deviceModelRoutes from './routes/device-model.routes';
import auditLogRoutes from './routes/audit-log.routes';
import systemNotificationRoutes from './routes/system-notification.routes';
import alertRuleRoutes from './routes/alert-rule.routes';
import escalationPolicyRoutes from './routes/escalation-policy.routes';
import escalationRoutes from './routes/escalation.routes';
import alertRoutes from './routes/alert.routes';
import taskRoutes from './routes/task.routes';
import { getS3Status, isS3Configured } from './storage/s3';

const logger = createLogger({ service: 'core-service' });

const app = express();
app.set('trust proxy', 1);

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply dynamic rate limiting to all API routes
app.use('/api', dynamicApiLimiter);

// Apply maintenance mode check (after auth, before other routes)
app.use('/api', maintenanceMode);

// Request logging
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
});

// Setup Swagger API documentation
setupSwagger(app, {
    serviceName: 'SustainPro Core Service',
    serviceDescription: 'Organizations, Events, Departments, Services & Devices API',
    version: '1.0.0',
    port: config.port,
    apiPrefix: '/api/v1',
    tags: [
        { name: 'Organizations', description: 'Organization management' },
        { name: 'Events', description: 'Event lifecycle management' },
        { name: 'Departments', description: 'Department operations' },
        { name: 'Services', description: 'Service management' },
        { name: 'Devices', description: 'Device registration & management' },
        { name: 'Settings', description: 'System settings' },
        { name: 'Uploads', description: 'File upload operations' },
        { name: 'Notifications', description: 'System notifications' },
        { name: 'Alert Rules', description: 'Alert rule management for IoT monitoring' },
        { name: 'Escalation Policies', description: 'Alert escalation policy management' },
        { name: 'Alerts', description: 'Alert management and monitoring' },
        { name: 'Tasks', description: 'Task management with evidence' },
    ],
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

// Debug S3 status (development only - remove in production)
if (config.nodeEnv === 'development') {
    app.get('/debug/s3-status', async (req, res) => {
        try {
            const s3Status = await getS3Status();
            res.json({
                success: true,
                data: s3Status,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message,
                stack: error.stack,
            });
        }
    });
}

// Static files for local uploads
app.use('/api/v1/images/public', express.static(path.join(process.cwd(), 'uploads', 'public')));

// Settings routes (some are public)
app.use('/api/v1/settings', settingsRoutes);

// Protected routes - all require authentication
app.use('/api/v1/organizations', authenticateToken, organizationRoutes);
app.use('/api/v1/events', authenticateToken, eventRoutes);
app.use('/api/v1/departments', authenticateToken, departmentRoutes);
app.use('/api/v1/department-templates', authenticateToken, departmentTemplateRoutes);
app.use('/api/v1/department-services', authenticateToken, departmentServiceRoutes);
app.use('/api/v1/services', authenticateToken, serviceRoutes);
app.use('/api/v1/upload', authenticateToken, uploadRoutes);
app.use('/api/v1/devices', authenticateToken, deviceRoutes);
app.use('/api/v1/device-models', authenticateToken, deviceModelRoutes);
app.use('/api/v1/audit-logs', authenticateToken, auditLogRoutes);
app.use('/api/v1/notifications', authenticateToken, systemNotificationRoutes);
app.use('/api/v1/alert-rules', authenticateToken, alertRuleRoutes);
app.use('/api/v1/escalation-policies', authenticateToken, escalationPolicyRoutes);
app.use('/api/v1/escalations', authenticateToken, escalationRoutes);
app.use('/api/v1/alerts', authenticateToken, alertRoutes);
app.use('/api/v1/tasks', authenticateToken, taskRoutes);


// Admin routes - Super Admin only

// S3 Storage status endpoint
app.get('/api/v1/admin/storage-status', authenticateToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const s3Status = await getS3Status();
        res.json({
            success: true,
            data: {
                provider: s3Status.configured ? 's3' : 'local',
                s3: s3Status,
                message: s3Status.configured
                    ? (s3Status.connected ? 'S3 storage is active and connected' : `S3 configured but not connected: ${s3Status.error}`)
                    : 'Using local storage (S3 not configured)',
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check storage status',
        });
    }
});

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
