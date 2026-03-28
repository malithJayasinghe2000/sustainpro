import { io, Socket } from 'socket.io-client';

// Socket.IO URL - connects through API Gateway
// Gateway routes /socket.io/* to IoT Service
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8088';

let socket: Socket;

export const getSocket = () => {
    if (!socket) {
        console.log('[Socket] Initializing connection to', SOCKET_URL);
        socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
            // Pass auth token for authenticated connections
            auth: {
                token: typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
            }
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
