// src/hooks/use-socket.ts
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { getStoredTokens } from '@/lib/storage';
import { buildWebSocketUrl } from '@/config/api-endpoints';
import { WEBSOCKET_CONFIG, WEBSOCKET_EVENTS } from '@/lib/constants';
import { toast } from 'sonner';

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

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

interface UseSocketState {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempts: number;
  lastError: string | null;
  lastPingTime: number | null;
  latency: number | null;
}

interface UseSocketActions {
  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Event listeners
  on: (event: WSMessageType, callback: (...args: any[]) => void) => void;
  off: (event: WSMessageType, callback: (...args: any[]) => void) => void;
  
  // Message sending
  emit: (event: WSMessageType, payload?: any) => void;
  sendMessage: (type: WSMessageType, payload: any) => void;
  
  // Typing indicators
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  
  // Presence
  setOnlineStatus: (isOnline: boolean) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  
  // File upload events
  sendFileUploadProgress: (uploadId: string, progress: number) => void;
  sendFileUploadComplete: (uploadId: string, fileUrl: string) => void;
  sendFileUploadError: (uploadId: string, error: string) => void;
  
  // Utilities
  ping: () => void;
  getConnectionInfo: () => { state: ConnectionState; attempts: number; latency: number | null };
}

const INITIAL_STATE: UseSocketState = {
  socket: null,
  isConnected: false,
  connectionState: 'disconnected',
  reconnectAttempts: 0,
  lastError: null,
  lastPingTime: null,
  latency: null,
};

export function useSocket(): UseSocketState & UseSocketActions {
  const [state, setState] = useState<UseSocketState>(INITIAL_STATE);
  
  // Refs for managing timers and persistent state
  const reconnectTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pingTimeRef = useRef<number>(0);
  const shouldConnectRef = useRef<boolean>(false);
  
  // Helper function to update state
  const updateState = useCallback((updates: Partial<UseSocketState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // ========== CONNECTION MANAGEMENT ==========

  const connect = useCallback(() => {
    if (state.socket?.connected) {
      console.log('📡 Socket already connected');
      return;
    }

    const tokens = getStoredTokens();
    if (!tokens?.accessToken) {
      console.warn('⚠️ No access token found, cannot connect to WebSocket');
      updateState({ 
        connectionState: 'failed', 
        lastError: 'No authentication token' 
      });
      return;
    }

    try {
      updateState({ connectionState: 'connecting', lastError: null });
      shouldConnectRef.current = true;

      const wsUrl = buildWebSocketUrl(tokens.accessToken);
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      const newSocket = io(wsUrl, {
        transports: ['websocket'],
        upgrade: false,
        rememberUpgrade: false,
        timeout: WEBSOCKET_CONFIG.CONNECTION_TIMEOUT,
        reconnection: false, // We'll handle reconnection manually
        autoConnect: false,
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('✅ WebSocket connected');
        updateState({ 
          isConnected: true, 
          connectionState: 'connected',
          reconnectAttempts: 0,
          lastError: null 
        });
        
        // Start heartbeat
        startHeartbeat(newSocket);
        
        // Show success toast on reconnection
        if (state.reconnectAttempts > 0) {
          toast.success('Reconnected to chat');
        }
      });

      newSocket.on('disconnect', (reason: string) => {
        console.log('❌ WebSocket disconnected:', reason);
        updateState({ 
          isConnected: false, 
          connectionState: 'disconnected',
          lastError: reason 
        });
        
        // Stop heartbeat
        stopHeartbeat();
        
        // Auto-reconnect if connection was intentional
        if (shouldConnectRef.current && reason !== 'io client disconnect') {
          scheduleReconnect();
        }
      });

      newSocket.on('connect_error', (error: Error) => {
        console.error('💥 WebSocket connection error:', error);
        updateState({ 
          connectionState: 'failed',
          lastError: error.message 
        });
        
        // Try to reconnect on connection error
        if (shouldConnectRef.current) {
          scheduleReconnect();
        }
      });

      newSocket.on('error', (error: any) => {
        console.error('🚨 WebSocket error:', error);
        updateState({ lastError: error.message || 'Socket error' });
      });

      // Setup message handlers
      setupMessageHandlers(newSocket);

      // Connect and update state
      newSocket.connect();
      setState(prev => ({ ...prev, socket: newSocket }));

    } catch (error) {
      console.error('💥 Failed to create WebSocket connection:', error);
      updateState({ 
        connectionState: 'failed',
        lastError: error instanceof Error ? error.message : 'Connection failed' 
      });
    }
  }, [state.socket, state.reconnectAttempts, updateState]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket');
    shouldConnectRef.current = false;
    
    // Clear timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = undefined;
    }
    
    stopHeartbeat();
    
    // Disconnect socket
    if (state.socket) {
      state.socket.disconnect();
    }
    
    updateState({ 
      socket: null,
      isConnected: false, 
      connectionState: 'disconnected',
      reconnectAttempts: 0,
      lastError: null 
    });
  }, [state.socket, updateState]);

  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered');
    disconnect();
    
    // Connect after a brief delay
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  // ========== RECONNECTION LOGIC ==========

  const scheduleReconnect = useCallback(() => {
    if (!shouldConnectRef.current) return;

    const currentAttempts = state.reconnectAttempts;
    
    if (currentAttempts >= WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.log('❌ Max reconnection attempts reached');
      updateState({ 
        connectionState: 'failed',
        lastError: 'Max reconnection attempts reached' 
      });
      toast.error('Connection lost. Please refresh the page.');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(
      Math.pow(2, currentAttempts) * 1000,
      WEBSOCKET_CONFIG.RECONNECT_INTERVAL
    );

    console.log(`🔄 Scheduling reconnect attempt ${currentAttempts + 1} in ${delay}ms`);
    updateState({ 
      connectionState: 'reconnecting',
      reconnectAttempts: currentAttempts + 1 
    });

    reconnectTimerRef.current = setTimeout(() => {
      if (shouldConnectRef.current) {
        connect();
      }
    }, delay);
  }, [state.reconnectAttempts, updateState, connect]);

  // ========== HEARTBEAT ==========

  const startHeartbeat = useCallback((socket: Socket) => {
    const sendPing = () => {
      if (socket.connected) {
        pingTimeRef.current = Date.now();
        socket.emit('ping');
        updateState({ lastPingTime: pingTimeRef.current });
      }
    };

    // Send initial ping
    sendPing();
    
    // Setup interval
    heartbeatTimerRef.current = setInterval(sendPing, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
  }, [updateState]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = undefined;
    }
  }, []);

  // ========== MESSAGE HANDLERS ==========

  const setupMessageHandlers = useCallback((socket: Socket) => {
    // Handle pong response for latency calculation
    socket.on('pong', () => {
      const latency = Date.now() - pingTimeRef.current;
      updateState({ latency });
      console.log(`🏓 Pong received, latency: ${latency}ms`);
    });

    // Handle specific WebSocket events
    socket.on(WEBSOCKET_EVENTS.NEW_MESSAGE, (payload: NewMessagePayload) => {
      console.log('📩 New message received:', payload);
    });

    socket.on(WEBSOCKET_EVENTS.MESSAGE_STATUS, (payload: MessageStatusPayload) => {
      console.log('📊 Message status update:', payload);
    });

    socket.on(WEBSOCKET_EVENTS.MESSAGE_REACTION, (payload: MessageReactionPayload) => {
      console.log('😊 Message reaction:', payload);
    });

    socket.on(WEBSOCKET_EVENTS.TYPING_START, (payload: TypingPayload) => {
      console.log('⌨️ User started typing:', payload);
    });

    socket.on(WEBSOCKET_EVENTS.TYPING_STOP, (payload: TypingPayload) => {
      console.log('⌨️ User stopped typing:', payload);
    });

    socket.on(WEBSOCKET_EVENTS.USER_ONLINE, (payload: UserStatusPayload) => {
      console.log('🟢 User came online:', payload);
    });

    socket.on(WEBSOCKET_EVENTS.USER_OFFLINE, (payload: UserStatusPayload) => {
      console.log('🔴 User went offline:', payload);
    });

    socket.on(WEBSOCKET_EVENTS.FILE_UPLOAD_PROGRESS, (payload: FileUploadPayload) => {
      console.log('📁 File upload progress:', payload);
    });

    socket.on(WEBSOCKET_EVENTS.FILE_UPLOAD_COMPLETE, (payload: FileUploadPayload) => {
      console.log('✅ File upload complete:', payload);
    });

    socket.on(WEBSOCKET_EVENTS.FILE_UPLOAD_ERROR, (payload: FileUploadPayload) => {
      console.log('❌ File upload error:', payload);
    });
  }, [updateState]);

  // ========== EVENT MANAGEMENT ==========

  const on = useCallback((event: WSMessageType, callback: (...args: any[]) => void) => {
    if (state.socket) {
      state.socket.on(event, callback);
    } else {
      console.warn(`⚠️ Trying to add listener for ${event} but socket is not connected`);
    }
  }, [state.socket]);

  const off = useCallback((event: WSMessageType, callback: (...args: any[]) => void) => {
    if (state.socket) {
      state.socket.off(event, callback);
    }
  }, [state.socket]);

  const emit = useCallback((event: WSMessageType, payload?: any) => {
    if (state.socket?.connected) {
      state.socket.emit(event, payload);
      console.log(`📤 Emitted ${event}:`, payload);
    } else {
      console.warn(`⚠️ Cannot emit ${event}: Socket not connected`);
    }
  }, [state.socket]);

  const sendMessage = useCallback((type: WSMessageType, payload: any) => {
    const message: WSMessage = { type, payload };
    emit(WEBSOCKET_EVENTS.NEW_MESSAGE, message);
  }, [emit]);

  // ========== CONVENIENCE METHODS ==========

  const startTyping = useCallback((chatId: string) => {
    emit(WEBSOCKET_EVENTS.TYPING_START, { chatId });
  }, [emit]);

  const stopTyping = useCallback((chatId: string) => {
    emit(WEBSOCKET_EVENTS.TYPING_STOP, { chatId });
  }, [emit]);

  const setOnlineStatus = useCallback((isOnline: boolean) => {
    emit(isOnline ? WEBSOCKET_EVENTS.USER_ONLINE : WEBSOCKET_EVENTS.USER_OFFLINE, {});
  }, [emit]);

  const joinChat = useCallback((chatId: string) => {
    emit(WEBSOCKET_EVENTS.USER_JOIN_CHAT, { chatId });
  }, [emit]);

  const leaveChat = useCallback((chatId: string) => {
    emit(WEBSOCKET_EVENTS.USER_LEAVE_CHAT, { chatId });
  }, [emit]);

  const sendFileUploadProgress = useCallback((uploadId: string, progress: number) => {
    emit(WEBSOCKET_EVENTS.FILE_UPLOAD_PROGRESS, { uploadId, progress });
  }, [emit]);

  const sendFileUploadComplete = useCallback((uploadId: string, fileUrl: string) => {
    emit(WEBSOCKET_EVENTS.FILE_UPLOAD_COMPLETE, { uploadId, fileUrl });
  }, [emit]);

  const sendFileUploadError = useCallback((uploadId: string, error: string) => {
    emit(WEBSOCKET_EVENTS.FILE_UPLOAD_ERROR, { uploadId, error });
  }, [emit]);

  const ping = useCallback(() => {
    if (state.socket?.connected) {
      pingTimeRef.current = Date.now();
      state.socket.emit('ping');
      updateState({ lastPingTime: pingTimeRef.current });
    }
  }, [state.socket, updateState]);

  const getConnectionInfo = useCallback(() => ({
    state: state.connectionState,
    attempts: state.reconnectAttempts,
    latency: state.latency,
  }), [state.connectionState, state.reconnectAttempts, state.latency]);

  // ========== LIFECYCLE EFFECTS ==========

  // Auto-connect on mount if we have a token
  useEffect(() => {
    const tokens = getStoredTokens();
    if (tokens?.accessToken) {
      console.log('🚀 Auto-connecting WebSocket on mount');
      connect();
    }

    return () => {
      console.log('🧹 Cleaning up WebSocket on unmount');
      shouldConnectRef.current = false;
      disconnect();
    };
  }, []); // Only run on mount/unmount

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Browser came online');
      if (shouldConnectRef.current && !state.isConnected) {
        connect();
      }
    };

    const handleOffline = () => {
      console.log('🌐 Browser went offline');
      updateState({ 
        connectionState: 'disconnected',
        lastError: 'Network offline' 
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.isConnected, connect, updateState]);

  // Listen for visibility changes (tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && shouldConnectRef.current && !state.isConnected) {
        console.log('👁️ Tab became visible, checking connection');
        // Small delay to allow network to stabilize
        setTimeout(() => {
          if (!state.isConnected) {
            connect();
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isConnected, connect]);

  return {
    // State
    ...state,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    
    on,
    off,
    emit,
    sendMessage,
    
    startTyping,
    stopTyping,
    setOnlineStatus,
    joinChat,
    leaveChat,
    
    sendFileUploadProgress,
    sendFileUploadComplete,
    sendFileUploadError,
    
    ping,
    getConnectionInfo,
  };
}

// ========== HELPER HOOKS ==========

/**
 * Hook to subscribe to specific WebSocket events
 */
export function useSocketEvent<T = any>(
  event: WSMessageType,
  callback: (payload: T) => void,
  deps: React.DependencyList = []
) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handler = (payload: T) => {
      callback(payload);
    };

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, isConnected, event, ...deps]);
}

/**
 * Hook to emit WebSocket events with automatic connection checking
 */
export function useSocketEmit() {
  const { emit, isConnected } = useSocket();

  return useCallback((event: WSMessageType, payload?: any) => {
    if (isConnected) {
      emit(event, payload);
      return true;
    } else {
      console.warn(`⚠️ Cannot emit ${event}: Socket not connected`);
      return false;
    }
  }, [emit, isConnected]);
}

/**
 * Hook for connection status with human-readable labels
 */
export function useConnectionStatus() {
  const { connectionState, isConnected, reconnectAttempts, latency } = useSocket();

  const statusLabel = useMemo(() => {
    switch (connectionState) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'reconnecting': return `Reconnecting... (${reconnectAttempts}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS})`;
      case 'failed': return 'Connection failed';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  }, [connectionState, reconnectAttempts]);

  const statusColor = useMemo(() => {
    switch (connectionState) {
      case 'connected': return 'green';
      case 'connecting': 
      case 'reconnecting': return 'yellow';
      case 'failed':
      case 'disconnected': return 'red';
      default: return 'gray';
    }
  }, [connectionState]);

  return {
    isConnected,
    connectionState,
    statusLabel,
    statusColor,
    reconnectAttempts,
    latency,
    isHealthy: isConnected && latency !== null && latency < 1000,
  };
}