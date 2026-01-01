import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        // console.log(`Socket Connected: ${socket.id}`);

        socket.on('disconnect', () => {
            // console.log(`Socket Disconnected: ${socket.id}`);
        });

        // Room management for devices (optional but good for future)
        socket.on('join_device', (deviceCode) => {
            socket.join(`device_${deviceCode}`);
            // console.log(`Socket ${socket.id} joined device_${deviceCode}`);
        });

        socket.on('leave_device', (deviceCode) => {
            socket.leave(`device_${deviceCode}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
