import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import pool, { closePool } from './db';

// Load environment variables
dotenv.config();

import http from 'http';
import { initSocket } from './socket';

// ... (previous code)

// Initialize Express app
const app: Express = express();
const httpServer = http.createServer(app); // Wrap express in HTTP server
const PORT = parseInt(process.env.PORT || '5000', 10);

// Initialize Socket.IO
const io = initSocket(httpServer);

// Middleware
app.use(cookieParser());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as current_time');
        res.json({
            status: 'OK',
            message: 'SustainPro API is running',
            database: 'Connected',
            timestamp: result.rows[0].current_time
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// API info endpoint
app.get('/api/v1', (req: Request, res: Response) => {
    res.json({
        message: 'Welcome to SustainPro API v1',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            devices: '/api/v1/devices',
            telemetry: '/api/v1/telemetry'
        }
    });
});

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import deviceRoutes from './routes/devices';
// import deviceModelRoutes from './routes/device-models';
import telemetryRoutes from './routes/telemetry';
import settingsRoutes from './routes/settings';
import organizationRoutes from './routes/organizations';
import eventRoutes from './routes/events';
import departmentRoutes from './routes/departments';
import serviceRoutes from './routes/services';
import path from 'path';

// ... (imports)
import uploadRoutes from './routes/upload';
import imagesRoutes from './routes/images';
import rbacRoutes from './routes/rbac';

// ...

// Register API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/devices', deviceRoutes);
// app.use('/api/v1/device-models', deviceModelRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/images', imagesRoutes);
app.use('/api/v1/rbac', rbacRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
const server = httpServer.listen(PORT, '0.0.0.0', () => { // Bind to 0.0.0.0
    console.log(`🚀 SustainPro API Server running on port ${PORT}`);
    console.log(`📡 Listening on all network interfaces (0.0.0.0)`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Socket.IO initialized`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(async () => {
        await closePool();
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(async () => {
        await closePool();
        console.log('Server closed');
        process.exit(0);
    });
});

export default app;
