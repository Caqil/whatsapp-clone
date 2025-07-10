// src/lib/socket.ts
import type { 
  WSMessage, 
  WSMessageType,
  NewMessagePayload,
  MessageStatusPayload,
  MessageReactionPayload,
  TypingPayload,
  UserStatusPayload,
  ChatActionPayload,
  FileUploadPayload
} from '@/types/api';
import { getStoredTokens } from '@/lib/storage';
import { WEBSOCKET_CONFIG, WEBSOCKET_EVENTS } from '@/lib/constants';

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private reconnectAttempts = 0;
  private isManualDisconnect = false;
  private connectionPromise: Promise<void> | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    Object.values(WEBSOCKET_EVENTS).forEach(event => {
      this.eventListeners.set(event, new Set());
    });
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.performConnect();
    return this.connectionPromise;
  }

  private async performConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { accessToken } = getStoredTokens();
      
      if (!accessToken) {
        reject(new Error('No access token available'));
        return;
      }

      // Build WebSocket URL - your backend expects /api/ws
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const wsUrl = `${baseUrl.replace('http', 'ws')}/api/ws?token=${encodeURIComponent(accessToken)}`;
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      try {
        this.socket = new WebSocket(wsUrl);

        // Connection success
        this.socket.onopen = () => {
          console.log('✅ WebSocket connected');
          this.reconnectAttempts = 0;
          this.isManualDisconnect = false;
          this.startHeartbeat();
          this.emit(WEBSOCKET_EVENTS.CONNECT);
          resolve();
        };

        // Connection error
        this.socket.onerror = (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.emit(WEBSOCKET_EVENTS.ERROR, error);
          reject(error);
        };

        // Message handling
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIncomingMessage(data);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        // Disconnection
        this.socket.onclose = (event) => {
          console.log('💔 WebSocket disconnected:', event.code, event.reason);
          this.stopHeartbeat();
          this.emit(WEBSOCKET_EVENTS.DISCONNECT, event.reason);

          // Auto-reconnect unless manually disconnected
          if (!this.isManualDisconnect) {
            this.scheduleReconnect();
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log('👋 Manually disconnecting WebSocket');
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.connectionPromise = null;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Send message to server
   */
  send(type: WSMessageType, payload: any): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
      return;
    }

    const message: WSMessage = { type, payload };
    
    try {
      this.socket!.send(JSON.stringify(message));
      console.log('📤 Sent WebSocket message:', type);
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(data: WSMessage): void {
    console.log('📥 Received WebSocket message:', data.type);
    
    try {
      this.emit(data.type as string, data.payload);
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
      this.emit(WEBSOCKET_EVENTS.ERROR, error);
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping' as WSMessageType, { timestamp: Date.now() });
      }
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.log('❌ Max reconnection attempts reached');
      this.emit(WEBSOCKET_EVENTS.ERROR, new Error('Max reconnection attempts reached'));
      return;
    }

    const delay = Math.min(
      WEBSOCKET_CONFIG.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      WEBSOCKET_CONFIG.MAX_RECONNECT_DELAY
    );

    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.isManualDisconnect) {
        this.connectionPromise = null;
        this.connect().catch(error => {
          console.error('❌ Reconnection failed:', error);
        });
      }
    }, delay);
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

export async function initializeWebSocket(): Promise<WebSocketManager> {
  const manager = getWebSocketManager();
  await manager.connect();
  return manager;
}

export function shutdownWebSocket(): void {
  if (wsManager) {
    wsManager.disconnect();
    wsManager = null;
  }
}

export default getWebSocketManager;