import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { authService } from './auth.service';

interface AuthSocket extends Socket {
  userId?: string;
}

class SocketService {
  private io: Server | null = null;
  private userSockets: Map<string, Set<string>> = new Map();

  initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // Allow all origins for now (adjust for production)
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      },
    });

    this.io.use(async (socket: AuthSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        // Verify token (strip 'Bearer ' if present)
        const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
        const payload = authService.verifyAccessToken(tokenString);

        if (!payload) {
          return next(new Error('Authentication error'));
        }

        socket.userId = payload.userId;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket: AuthSocket) => {
      if (!socket.userId) return;

      console.log(`[SOCKET] User connected: ${socket.userId}`);
      
      // Add socket to user's socket list
      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId)?.add(socket.id);

      // Join a room specifically for this user
      socket.join(`user:${socket.userId}`);

      socket.on('disconnect', () => {
        console.log(`[SOCKET] User disconnected: ${socket.userId}`);
        if (socket.userId && this.userSockets.has(socket.userId)) {
          this.userSockets.get(socket.userId)?.delete(socket.id);
          if (this.userSockets.get(socket.userId)?.size === 0) {
            this.userSockets.delete(socket.userId);
          }
        }
      });
    });

    console.log('[SYSTEM] Socket.IO initialized');
  }

  // Emit event to a specific user
  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Check if a user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size || 0) > 0;
  }
}

export const socketService = new SocketService();
