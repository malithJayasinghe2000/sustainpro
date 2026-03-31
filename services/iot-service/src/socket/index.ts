import { Server, Socket } from 'socket.io';
import http from 'http';
import os from 'os';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';

import { telemetryService } from '../services/telemetry.service';

const logger = createLogger({ service: 'socket-io' });

let io: Server | null = null;
let systemHealthInterval: NodeJS.Timeout | null = null;
let dashboardStatsInterval: NodeJS.Timeout | null = null;

export interface TelemetryPayload {
    device_code: string;
    device_id?: string;
    organization_id?: string;
    event_id?: string;
    department_id?: string;
    service_id?: string;
    timestamp: Date;
    data: Record<string, any>;
    status: 'online' | 'offline';
}

export interface DashboardStats {
    devices_online: number;
    devices_offline: number;
    total_telemetry_today: number;
    last_updated: Date;
}

/**
 * Initialize Socket.IO server
 */
export const initSocket = (server: http.Server): Server => {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, Postman)
                if (!origin) {
                    return callback(null, true);
                }
                if (config.cors.origins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn('Socket.IO CORS blocked origin', { origin });
                    callback(null, true); // Allow all for now to fix connection issues
                }
            },
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on('connection', (socket: Socket) => {
        logger.info('Client connected', { socketId: socket.id });

        // Subscribe to specific device updates
        socket.on('subscribe:device', (deviceCode: string) => {
            socket.join(`device:${deviceCode}`);
            logger.debug('Client subscribed to device', { socketId: socket.id, deviceCode });
        });

        // Unsubscribe from device updates
        socket.on('unsubscribe:device', (deviceCode: string) => {
            socket.leave(`device:${deviceCode}`);
            logger.debug('Client unsubscribed from device', { socketId: socket.id, deviceCode });
        });

        // Subscribe to organization-wide updates
        socket.on('subscribe:organization', (orgId: string) => {
            socket.join(`org:${orgId}`);
            logger.debug('Client subscribed to organization', { socketId: socket.id, orgId });
        });

        // Subscribe to dashboard updates
        socket.on('subscribe:dashboard', () => {
            socket.join('dashboard');
            logger.debug('Client subscribed to dashboard', { socketId: socket.id });
        });

        // Subscribe to event updates
        socket.on('subscribe:event', (eventId: string) => {
            socket.join(`event:${eventId}`);
            logger.debug('Client subscribed to event', { socketId: socket.id, eventId });
        });

        // Subscribe to department updates
        socket.on('subscribe:department', (deptId: string) => {
            socket.join(`dept:${deptId}`);
            logger.debug('Client subscribed to department', { socketId: socket.id, deptId });
        });

        // Subscribe to service updates (NEW)
        socket.on('subscribe:service', (serviceId: string) => {
            socket.join(`service:${serviceId}`);
            logger.debug('Client subscribed to service', { socketId: socket.id, serviceId });
        });

        socket.on('disconnect', (reason) => {
            logger.info('Client disconnected', { socketId: socket.id, reason });
        });

        socket.on('error', (error) => {
            logger.error('Socket error', { socketId: socket.id, error: error.message });
        });
    });

    // Start emitting system health every 5 seconds over WebSocket instead of HTTP polling
    if (!systemHealthInterval) {
        systemHealthInterval = setInterval(() => {
            if (!io || io.engine.clientsCount === 0) return;
            
            const cpus = os.cpus();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            
            io.to('dashboard').emit('dashboard:system_health', {
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
            });
        }, 5000);
    }

    logger.info('Socket.IO initialized');

    return io;
};

/**
 * Get the Socket.IO instance
 */
export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};

/**
 * Emit telemetry to relevant rooms
 */
export const emitTelemetry = (payload: TelemetryPayload): void => {
    if (!io) return;

    // Emit to device-specific room
    io.to(`device:${payload.device_code}`).emit('telemetry', payload);

    // Emit to organization room
    if (payload.organization_id) {
        io.to(`org:${payload.organization_id}`).emit('telemetry', payload);
    }

    // Emit to event room
    if (payload.event_id) {
        io.to(`event:${payload.event_id}`).emit('telemetry', payload);
    }

    // Emit to department room
    if (payload.department_id) {
        io.to(`dept:${payload.department_id}`).emit('telemetry', payload);
    }

    // Emit to service room (NEW)
    if (payload.service_id) {
        io.to(`service:${payload.service_id}`).emit('telemetry', payload);
    }

    // Emit to dashboard
    io.to('dashboard').emit('dashboard:telemetry', payload);
};

/**
 * Emit device status change
 */
export const emitDeviceStatus = (deviceCode: string, status: 'online' | 'offline', organizationId?: string, eventId?: string, departmentId?: string): void => {
    if (!io) return;

    const payload = {
        device_code: deviceCode,
        status,
        timestamp: new Date(),
    };

    io.to(`device:${deviceCode}`).emit('device:status', payload);

    if (organizationId) {
        io.to(`org:${organizationId}`).emit('device:status', payload);
    }

    if (eventId) {
        io.to(`event:${eventId}`).emit('device:status', payload);
    }

    if (departmentId) {
        io.to(`dept:${departmentId}`).emit('device:status', payload);
    }

    io.to('dashboard').emit('dashboard:device_status', payload);
};

/**
 * Emit dashboard stats update
 */
export const emitDashboardStats = (stats: DashboardStats): void => {
    if (!io) return;

    io.to('dashboard').emit('dashboard:stats', stats);
};

/**
 * Get connected clients count
 */
export const getConnectedClientsCount = (): number => {
    if (!io) return 0;
    return io.engine.clientsCount;
};
