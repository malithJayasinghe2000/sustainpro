import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { 
    errorHandler, 
    notFoundHandler,
    setApiSecurityConfigFetcher,
    setMaintenanceSettingsFetcher,
    dynamicApiLimiter,
    maintenanceMode,
    authLimiter,
} from '@sustainpro/shared-middleware';
import { createLogger } from '@sustainpro/shared-utils';
import { setupSwagger } from '@sustainpro/shared-swagger';
import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import rbacRoutes from './routes/rbac.routes';
import rolesRoutes from './routes/roles.routes';

const logger = createLogger({ service: 'auth-service' });

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
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply stricter rate limiting for auth endpoints
app.use('/api/v1/auth', authLimiter);

// Apply dynamic rate limiting to all other API routes
app.use('/api', dynamicApiLimiter);

// Apply maintenance mode check (auth endpoints are whitelisted in the middleware)
app.use('/api', maintenanceMode);

// Request logging
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
});

// Setup Swagger API documentation
setupSwagger(app, {
    serviceName: 'SustainPro Auth Service',
    serviceDescription: 'Authentication, User Management & RBAC API',
    version: '1.0.0',
    port: config.port,
    apiPrefix: '/api/v1',
    tags: [
        { name: 'Authentication', description: 'Login, logout, token management' },
        { name: 'Users', description: 'User CRUD operations' },
        { name: 'RBAC', description: 'Role-based access control' },
        { name: 'Roles', description: 'Role definitions and hierarchy' },
    ],
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'auth-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/rbac', rbacRoutes);
app.use('/api/v1/roles', rolesRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
