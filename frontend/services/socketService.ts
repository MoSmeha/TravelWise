import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    if (this.socket?.connected) return;

    // Use absolute URL for socket connection if API_URL is relative or just host
    // Assuming API_URL is something like "http://localhost:3000/api" or "http://192.168.1.5:3000/api"
    // We need the base URL without /api
    const baseUrl = API_BASE_URL.replace('/api', '');

    this.socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // Re-attach listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        this.socket?.on(event, cb as any);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }

    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
