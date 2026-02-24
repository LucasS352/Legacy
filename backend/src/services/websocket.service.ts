import { Server } from 'socket.io';
import { config } from '../config/env';

let ioInstance: Server | null = null;

export function initWebSocketServer(io: Server): void {
    ioInstance = io;

    io.on('connection', (socket) => {
        console.log(`[WebSocket] Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`[WebSocket] Client disconnected: ${socket.id}`);
        });

        socket.on('join_room', (room: string) => {
            socket.join(room);
        });
    });

    console.log('✅ WebSocket server initialized');
}

export function getWebSocketServer(): Server | null {
    return ioInstance;
}

export function emitToAll(event: string, data: unknown): void {
    if (ioInstance) {
        ioInstance.emit(event, data);
    }
}

export function emitToRoom(room: string, event: string, data: unknown): void {
    if (ioInstance) {
        ioInstance.to(room).emit(event, data);
    }
}
