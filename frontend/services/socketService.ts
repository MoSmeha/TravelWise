import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Use absolute URL for socket connection if API_URL is relative or just host
    // Assuming API_URL is something like "http://localhost:3000/api" or "http://192.168.1.5:3000/api"
    // We need the base URL without /api
    const baseUrl = API_BASE_URL.replace('/api', '');

    console.log('[Socket] Connecting to:', baseUrl);
    this.socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected, id:', this.socket?.id);
      // Start ping interval to keep connection alive
      this.startPing();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected, reason:', reason);
      this.stopPing();
      // If server disconnected, try to reconnect
      if (reason === 'io server disconnect') {
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt:', attemptNumber);
    });

    // Re-attach listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        this.socket?.on(event, cb as any);
      });
    });
  }
  
  private startPing() {
    this.stopPing();
    // Send ping every 25 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 25000);
  }
  
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.stopPing();
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
      console.log('[Socket] Emitting:', event, data);
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
