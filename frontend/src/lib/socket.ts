import { io, Socket } from 'socket.io-client';

// Use backend URL for socket connection
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

let socket: Socket;

export const getSocket = () => {
    if (!socket) {
        console.log('[Socket] Initializing connection to', SOCKET_URL);
        socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket'], // Prefer WebSocket over polling
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected!', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
        });

        socket.on('connect_error', (err) => {
            // Use console.log instead of console.error to avoid Next.js error overlay
            console.log('[Socket] Connection error (will retry):', err.message);
        });
    }
    return socket;
};
