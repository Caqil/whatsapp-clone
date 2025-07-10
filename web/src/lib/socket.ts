// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
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
import type { Message, MessageStatus, ReactionType } from '@/types/message';
import type { User } from '@/types/user';
import { getStoredTokens } from './storage';
import { WEBSOCKET_CONFIG, WEBSOCKET_EVENTS } from './constants';

// Event callback types
export type MessageEventCallback = (payload: NewMessagePayload) => void;
export type MessageStatusEventCallback = (payload: MessageStatusPayload) => void;
export type MessageReactionEventCallback = (payload: MessageReactionPayload) => void;
export type TypingEventCallback = (payload: TypingPayload) => void;
export type UserStatusEventCallback = (payload: UserStatusPayload) => void;
export type ChatActionEventCallback = (payload: ChatActionPayload) => void;
export type FileUploadEventCallback = (payload: FileUploadPayload) => void;
export type ErrorEventCallback = (error: any) => void;
export type ConnectEventCallback = () => void;
export type DisconnectEventCallback = (reason: string) => void;

// WebSocket Client Class
export class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;
  private connectionPromise: Promise<void> | null = null;

  // Event listeners storage
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Initialize event listener sets for each event type
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

      const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/ws';
      
      // Create socket connection
      this.socket = io(socketUrl, {
        transports: ['websocket'],
        timeout: WEBSOCKET_CONFIG.CONNECTION_TIMEOUT,
        auth: {
          token: accessToken,
        },
        query: {
          token: accessToken,
        },
        forceNew: true,
      });

      // Connection success
      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.isManualDisconnect = false;
        this.startHeartbeat();
        this.emit(WEBSOCKET_EVENTS.CONNECT);
        resolve();
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        this.emit(WEBSOCKET_EVENTS.ERROR, error);
        reject(error);
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('💔 WebSocket disconnected:', reason);
        this.stopHeartbeat();
        this.emit(WEBSOCKET_EVENTS.DISCONNECT, reason);

        // Auto-reconnect unless manually disconnected
        if (!this.isManualDisconnect && reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      // Setup message handlers
      this.setupMessageHandlers();

      // Connection timeout
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log('👋 Manually disconnecting WebSocket');
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionPromise = null;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    if (!this.socket) return;

    // Handle incoming WebSocket messages
    this.socket.on('message', (data: WSMessage) => {
      this.handleIncomingMessage(data);
    });

    // Handle specific event types
    this.socket.on(WEBSOCKET_EVENTS.NEW_MESSAGE, (payload: NewMessagePayload) => {
      this.emit(WEBSOCKET_EVENTS.NEW_MESSAGE, payload);
    });

    this.socket.on(WEBSOCKET_EVENTS.MESSAGE_STATUS, (payload: MessageStatusPayload) => {
      this.emit(WEBSOCKET_EVENTS.MESSAGE_STATUS, payload);
    });

    this.socket.on(WEBSOCKET_EVENTS.MESSAGE_REACTION, (payload: MessageReactionPayload) => {
      this.emit(WEBSOCKET_EVENTS.MESSAGE_REACTION, payload);
    });

    this.socket.on(WEBSOCKET_EVENTS.TYPING_START, (payload: TypingPayload) => {
      this.emit(WEBSOCKET_EVENTS.TYPING_START, payload);
    });

    this.socket.on(WEBSOCKET_EVENTS.TYPING_STOP, (payload: TypingPayload) => {
      this.emit(WEBSOCKET_EVENTS.TYPING_STOP, payload);
    });

    this.socket.on(WEBSOCKET_EVENTS.USER_ONLINE, (payload: UserStatusPayload) => {
      this.emit(WEBSOCKET_EVENTS.USER_ONLINE, payload);
    });

    this.socket.on(WEBSOCKET_EVENTS.USER_OFFLINE, (payload: UserStatusPayload) => {
      this.emit(WEBSOCKET_EVENTS.USER_OFFLINE, payload);
    });

    this.socket.on(WEBSOCKET_EVENTS.FILE_UPLOAD_PROGRESS, (payload: FileUploadPayload) => {
      this.emit(WEBSOCKET_EVENTS.FILE_UPLOAD_PROGRESS, payload);
    });

    this.socket.on(WEBSOCKET_EVENTS.FILE_UPLOAD_COMPLETE, (payload: FileUploadPayload) => {
      this.emit(WEBSOCKET_EVENTS.FILE_UPLOAD_COMPLETE, payload);
    });

    this.socket.on(WEBSOCKET_EVENTS.FILE_UPLOAD_ERROR, (payload: FileUploadPayload) => {
      this.emit(WEBSOCKET_EVENTS.FILE_UPLOAD_ERROR, payload);
    });

    // Handle pong response
    this.socket.on(WEBSOCKET_EVENTS.PONG, () => {
      console.log('🏓 Received pong from server');
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(data: WSMessage): void {
    console.log('📥 Received WebSocket message:', data.type);
    
    try {
      // Emit the specific event
      this.emit(data.type as WSMessageType, data.payload);
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
      this.emit(WEBSOCKET_EVENTS.ERROR, error);
    }
  }

  /**
   * Send message to server
   */
  private sendMessage(type: WSMessageType, payload: any): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
      return;
    }

    const message: WSMessage = { type, payload };
    
    try {
      this.socket.emit('message', message);
      console.log('📤 Sent WebSocket message:', type);
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
      this.emit(WEBSOCKET_EVENTS.ERROR, error);
    }
  }

  // ========== Public API Methods ==========

  /**
   * Join a chat room
   */
  joinChat(chatId: string): void {
    this.sendMessage(WEBSOCKET_EVENTS.USER_JOIN_CHAT, { chatId });
  }

  /**
   * Leave a chat room
   */
  leaveChat(chatId: string): void {
    this.sendMessage(WEBSOCKET_EVENTS.USER_LEAVE_CHAT, { chatId });
  }

  /**
   * Start typing indicator
   */
  startTyping(chatId: string): void {
    this.sendMessage(WEBSOCKET_EVENTS.TYPING_START, { chatId });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(chatId: string): void {
    this.sendMessage(WEBSOCKET_EVENTS.TYPING_STOP, { chatId });
  }

  /**
   * Send ping to server
   */
  ping(): void {
    this.sendMessage(WEBSOCKET_EVENTS.PING, { timestamp: Date.now() });
  }

  // ========== Event Management ==========

  /**
   * Add event listener
   */
  on<T = any>(event: WSMessageType | string, callback: (payload: T) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off<T = any>(event: WSMessageType | string, callback: (payload: T) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: WSMessageType | string): void {
    if (event) {
      this.eventListeners.set(event, new Set());
    } else {
      this.eventListeners.clear();
      this.initializeEventListeners();
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit<T = any>(event: WSMessageType | string, payload?: T): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ========== Reconnection Logic ==========

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit(WEBSOCKET_EVENTS.ERROR, new Error('Max reconnection attempts reached'));
      return;
    }

    const delay = Math.min(
      WEBSOCKET_CONFIG.RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connectionPromise = null;
      this.connect().then(() => {
        this.emit(WEBSOCKET_EVENTS.RECONNECT);
      }).catch((error) => {
        console.error('❌ Reconnection failed:', error);
        this.scheduleReconnect();
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ========== Heartbeat ==========

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.ping();
      }
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ========== Connection State ==========

  getConnectionState(): {
    connected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
    };
  }

  // ========== Cleanup ==========

  destroy(): void {
    this.removeAllListeners();
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.disconnect();
  }
}

// ========== High-level WebSocket Manager ==========

export class WebSocketManager {
  private client: WebSocketClient;
  private isInitialized = false;

  constructor() {
    this.client = new WebSocketClient();
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    // Connection events
    this.client.on(WEBSOCKET_EVENTS.CONNECT, () => {
      console.log('🎉 WebSocket Manager: Connected');
    });

    this.client.on(WEBSOCKET_EVENTS.DISCONNECT, (reason: string) => {
      console.log('💔 WebSocket Manager: Disconnected -', reason);
    });

    this.client.on(WEBSOCKET_EVENTS.ERROR, (error: any) => {
      console.error('❌ WebSocket Manager: Error -', error);
    });

    this.client.on(WEBSOCKET_EVENTS.RECONNECT, () => {
      console.log('🔄 WebSocket Manager: Reconnected');
    });
  }

  /**
   * Initialize WebSocket connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.client.connect();
      this.isInitialized = true;
      console.log('✅ WebSocket Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown WebSocket connection
   */
  shutdown(): void {
    this.client.destroy();
    this.isInitialized = false;
    console.log('👋 WebSocket Manager shutdown');
  }

  /**
   * Get WebSocket client instance
   */
  getClient(): WebSocketClient {
    return this.client;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.client.isConnected();
  }

  // ========== Convenience Methods ==========

  /**
   * Join chat and setup listeners
   */
  joinChat(chatId: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Cannot join chat: WebSocket not connected');
      return;
    }
    this.client.joinChat(chatId);
  }

  /**
   * Leave chat
   */
  leaveChat(chatId: string): void {
    if (!this.isConnected()) {
      return;
    }
    this.client.leaveChat(chatId);
  }

  /**
   * Start typing in chat
   */
  startTyping(chatId: string): void {
    if (!this.isConnected()) {
      return;
    }
    this.client.startTyping(chatId);
  }

  /**
   * Stop typing in chat
   */
  stopTyping(chatId: string): void {
    if (!this.isConnected()) {
      return;
    }
    this.client.stopTyping(chatId);
  }

  // ========== Event Subscription ==========

  /**
   * Subscribe to new messages
   */
  onNewMessage(callback: MessageEventCallback): () => void {
    this.client.on(WEBSOCKET_EVENTS.NEW_MESSAGE, callback);
    return () => this.client.off(WEBSOCKET_EVENTS.NEW_MESSAGE, callback);
  }

  /**
   * Subscribe to message status updates
   */
  onMessageStatus(callback: MessageStatusEventCallback): () => void {
    this.client.on(WEBSOCKET_EVENTS.MESSAGE_STATUS, callback);
    return () => this.client.off(WEBSOCKET_EVENTS.MESSAGE_STATUS, callback);
  }

  /**
   * Subscribe to message reactions
   */
  onMessageReaction(callback: MessageReactionEventCallback): () => void {
    this.client.on(WEBSOCKET_EVENTS.MESSAGE_REACTION, callback);
    return () => this.client.off(WEBSOCKET_EVENTS.MESSAGE_REACTION, callback);
  }

  /**
   * Subscribe to typing events
   */
  onTyping(callback: TypingEventCallback): () => void {
    const unsubscribeStart = () => this.client.off(WEBSOCKET_EVENTS.TYPING_START, callback);
    const unsubscribeStop = () => this.client.off(WEBSOCKET_EVENTS.TYPING_STOP, callback);
    
    this.client.on(WEBSOCKET_EVENTS.TYPING_START, callback);
    this.client.on(WEBSOCKET_EVENTS.TYPING_STOP, callback);
    
    return () => {
      unsubscribeStart();
      unsubscribeStop();
    };
  }

  /**
   * Subscribe to user status events
   */
  onUserStatus(callback: UserStatusEventCallback): () => void {
    const unsubscribeOnline = () => this.client.off(WEBSOCKET_EVENTS.USER_ONLINE, callback);
    const unsubscribeOffline = () => this.client.off(WEBSOCKET_EVENTS.USER_OFFLINE, callback);
    
    this.client.on(WEBSOCKET_EVENTS.USER_ONLINE, callback);
    this.client.on(WEBSOCKET_EVENTS.USER_OFFLINE, callback);
    
    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }

  /**
   * Subscribe to file upload events
   */
  onFileUpload(callback: FileUploadEventCallback): () => void {
    const unsubscribeProgress = () => this.client.off(WEBSOCKET_EVENTS.FILE_UPLOAD_PROGRESS, callback);
    const unsubscribeComplete = () => this.client.off(WEBSOCKET_EVENTS.FILE_UPLOAD_COMPLETE, callback);
    const unsubscribeError = () => this.client.off(WEBSOCKET_EVENTS.FILE_UPLOAD_ERROR, callback);
    
    this.client.on(WEBSOCKET_EVENTS.FILE_UPLOAD_PROGRESS, callback);
    this.client.on(WEBSOCKET_EVENTS.FILE_UPLOAD_COMPLETE, callback);
    this.client.on(WEBSOCKET_EVENTS.FILE_UPLOAD_ERROR, callback);
    
    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }

  /**
   * Subscribe to connection events
   */
  onConnection(callbacks: {
    onConnect?: ConnectEventCallback;
    onDisconnect?: DisconnectEventCallback;
    onError?: ErrorEventCallback;
    onReconnect?: ConnectEventCallback;
  }): () => void {
    const unsubscribers: (() => void)[] = [];

    if (callbacks.onConnect) {
      this.client.on(WEBSOCKET_EVENTS.CONNECT, callbacks.onConnect);
      unsubscribers.push(() => this.client.off(WEBSOCKET_EVENTS.CONNECT, callbacks.onConnect!));
    }

    if (callbacks.onDisconnect) {
      this.client.on(WEBSOCKET_EVENTS.DISCONNECT, callbacks.onDisconnect);
      unsubscribers.push(() => this.client.off(WEBSOCKET_EVENTS.DISCONNECT, callbacks.onDisconnect!));
    }

    if (callbacks.onError) {
      this.client.on(WEBSOCKET_EVENTS.ERROR, callbacks.onError);
      unsubscribers.push(() => this.client.off(WEBSOCKET_EVENTS.ERROR, callbacks.onError!));
    }

    if (callbacks.onReconnect) {
      this.client.on(WEBSOCKET_EVENTS.RECONNECT, callbacks.onReconnect);
      unsubscribers.push(() => this.client.off(WEBSOCKET_EVENTS.RECONNECT, callbacks.onReconnect!));
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }
}

// ========== Singleton Instance ==========

let wsManager: WebSocketManager | null = null;

/**
 * Get WebSocket manager singleton
 */
export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

/**
 * Initialize WebSocket connection
 */
export async function initializeWebSocket(): Promise<WebSocketManager> {
  const manager = getWebSocketManager();
  await manager.initialize();
  return manager;
}

/**
 * Shutdown WebSocket connection
 */
export function shutdownWebSocket(): void {
  if (wsManager) {
    wsManager.shutdown();
    wsManager = null;
  }
}

// Export default instance
export default getWebSocketManager;