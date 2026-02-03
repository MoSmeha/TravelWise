import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private currentToken: string | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }


    this.currentToken = token;


    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }


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

      this.startPing();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected, reason:', reason);
      this.stopPing();

      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('[Socket] Attempting reconnect for reason:', reason);
        setTimeout(() => {
          if (this.currentToken && !this.socket?.connected) {
            this.socket?.connect();
          }
        }, 500);
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


    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        this.socket?.on(event, cb as any);
      });
    });
  }


  forceReconnect(token: string) {
    console.log('[Socket] Force reconnecting...');
    this.currentToken = token;
    
    // Always destroy and recreate socket to ensure fresh auth token is used
    if (this.socket) {
      console.log('[Socket] Destroying existing socket and creating new connection with fresh token...');
      this.stopPing();
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
    
    // Create new connection with fresh token
    console.log('[Socket] Creating new connection with fresh token...');
    this.connect(token);
  }
  
  private startPing() {
    this.stopPing();

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
    this.currentToken = null;
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

  getSocket() {
    return this.socket;
  }

  emit(event: string, data: any) {
    if (this.socket) {
      console.log('[Socket] Emitting:', event, data);
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
