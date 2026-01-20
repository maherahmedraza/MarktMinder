import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { EVENTS } from './events.js';
import { logger } from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import config from './index.js';

interface AuthenticatedSocket extends Socket {
    user?: {
        id: string;
    };
}

let io: Server;

export const initSocket = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: config.frontendUrl,
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Middleware for authentication
    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, config.jwt.secret) as { id: string };
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on(EVENTS.CONNECTION, (socket: AuthenticatedSocket) => {
        logger.info(`Socket connected: ${socket.id} (User: ${socket.user?.id})`);

        // Join user-specific room
        if (socket.user?.id) {
            socket.join(`user:${socket.user.id}`);
        }

        socket.on(EVENTS.DISCONNECT, () => {
            logger.info(`Socket disconnected: ${socket.id}`);
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
