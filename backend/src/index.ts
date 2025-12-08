import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { closePool } from './db';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
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
            users: '/api/v1/users',
            devices: '/api/v1/devices',
            telemetry: '/api/v1/telemetry'
        }
    });
});

// Import routes
import userRoutes from './routes/users';
import deviceRoutes from './routes/devices';
import telemetryRoutes from './routes/telemetry';

// Register API routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);

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

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 SustainPro API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
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
