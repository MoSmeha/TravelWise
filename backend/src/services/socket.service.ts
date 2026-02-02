import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from './auth.service.js';
import {
  updateUserLocation,
  cleanupUserLocations,
} from './location-sharing.service.js';
import { UpdateLocationSchema } from '../schemas/location-sharing.schema.js';
import { checkPermission } from '../modules/itinerary/share.service.js';

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


        const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;
        const payload = verifyAccessToken(tokenString);

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

      console.log(`[SOCKET] User connected: ${socket.userId}, socketId: ${socket.id}`);
      

      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId)?.add(socket.id);
      
      console.log(`[SOCKET] Active users: ${Array.from(this.userSockets.keys()).join(', ')}`);


      socket.join(`user:${socket.userId}`);


      socket.on('join-itinerary', async (itineraryId: string) => {
        try {

          const permission = await checkPermission(itineraryId, socket.userId!);
          if (permission) {
            socket.join(`itinerary:${itineraryId}`);
            console.log(`[SOCKET] User ${socket.userId} joined itinerary room: ${itineraryId}`);
          } else {
            socket.emit('error', { message: 'No access to this itinerary' });
          }
        } catch (error) {
          console.error('[SOCKET] Error joining itinerary:', error);
          socket.emit('error', { message: 'Failed to join itinerary' });
        }
      });


      socket.on('leave-itinerary', (itineraryId: string) => {
        socket.leave(`itinerary:${itineraryId}`);
        console.log(`[SOCKET] User ${socket.userId} left itinerary room: ${itineraryId}`);
      });


      socket.on('update-location', async (data: any) => {
        try {

          const validatedData = UpdateLocationSchema.parse(data);
          

          await updateUserLocation(socket.userId!, validatedData);
          

          socket.to(`itinerary:${validatedData.itineraryId}`).emit('location-updated', {
            userId: socket.userId,
            location: {
              latitude: validatedData.latitude,
              longitude: validatedData.longitude,
              accuracy: validatedData.accuracy,
              heading: validatedData.heading,
              speed: validatedData.speed,
            },
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('[SOCKET] Error updating location:', error);
          socket.emit('error', { message: 'Failed to update location' });
        }
      });

      socket.on('disconnect', async (reason) => {
        console.log(`[SOCKET] User disconnected: ${socket.userId}, reason: ${reason}`);
        
        if (socket.userId) {

          await cleanupUserLocations(socket.userId);
          

          const rooms = Array.from(socket.rooms);
          rooms.forEach(room => {
            if (room.startsWith('itinerary:')) {
              socket.to(room).emit('user-location-removed', {
                userId: socket.userId,
              });
            }
          });
          

          if (this.userSockets.has(socket.userId)) {
            this.userSockets.get(socket.userId)?.delete(socket.id);
            if (this.userSockets.get(socket.userId)?.size === 0) {
              this.userSockets.delete(socket.userId);
            }
          }
        }
        
        console.log(`[SOCKET] Remaining active users: ${Array.from(this.userSockets.keys()).join(', ')}`);
      });
    });

    console.log('[SYSTEM] Socket.IO initialized');
  }


  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }


  emitToItinerary(itineraryId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`itinerary:${itineraryId}`).emit(event, data);
  }


  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size || 0) > 0;
  }
}

export const socketService = new SocketService();
