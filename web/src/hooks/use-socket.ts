'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { toast } from 'sonner';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface UseSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempts: number;
  lastError: string | null;
  lastPingTime: number | null;
  latency: number | null;
}

interface UseSocketActions {
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  emit: (event: string, payload?: any) => void;
  sendMessage: (type: string, payload: any) => void;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendFileUploadProgress: (uploadId: string, progress: number) => void;
  sendFileUploadComplete: (uploadId: string, fileUrl: string) => void;
  sendFileUploadError: (uploadId: string, error: string) => void;
  ping: () => void;
  getConnectionInfo: () => {
    state: ConnectionState;
    attempts: number;
    latency: number | null;
  };
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
  
  const reconnectTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pingTimeRef = useRef<number>(0);
  const shouldConnectRef = useRef<boolean>(false);
  const eventListenersRef = useRef<Map<string, Set<(...args: any[]) => void>>>(new Map());

  const updateState = useCallback((updates: Partial<UseSocketState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // ========== CONNECTION MANAGEMENT ==========

  const connect = useCallback(() => {
    if (state.socket?.readyState === WebSocket.OPEN) {
      console.log('📡 Socket already connected');
      return;
    }

    const tokens = getStoredTokens();
    if (!tokens?.accessToken) {
      console.warn('⚠️ No access token found, cannot connect to WebSocket');
      updateState({
        connectionState: 'failed',
        lastError: 'No authentication token',
      });
      return;
    }

    try {
      updateState({ connectionState: 'connecting', lastError: null });
      shouldConnectRef.current = true;

      // Build correct WebSocket URL for your backend
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const wsUrl = `${baseUrl.replace('http', 'ws')}/api/ws?token=${encodeURIComponent(tokens.accessToken)}`;
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      const newSocket = new WebSocket(wsUrl);

      // Connection event handlers
      newSocket.onopen = () => {
        console.log('✅ WebSocket connected');
        updateState({
          isConnected: true,
          connectionState: 'connected',
          reconnectAttempts: 0,
          lastError: null,
        });

        // Start heartbeat
        startHeartbeat(newSocket);

        if (state.reconnectAttempts > 0) {
          toast.success('Reconnected to chat');
        }
      };

      newSocket.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        updateState({
          isConnected: false,
          connectionState: 'disconnected',
          lastError: event.reason,
        });

        stopHeartbeat();

        if (shouldConnectRef.current && event.code !== 1000) {
          scheduleReconnect();
        }
      };

      newSocket.onerror = (error) => {
        console.error('💥 WebSocket error:', error);
        updateState({
          connectionState: 'failed',
          lastError: 'WebSocket connection failed',
        });

        if (shouldConnectRef.current) {
          scheduleReconnect();
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      setState(prev => ({ ...prev, socket: newSocket }));

    } catch (error) {
      console.error('💥 Failed to create WebSocket connection:', error);
      updateState({
        connectionState: 'failed',
        lastError: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, [state.socket, state.reconnectAttempts, updateState]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket');
    shouldConnectRef.current = false;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = undefined;
    }

    stopHeartbeat();

    if (state.socket) {
      state.socket.close();
    }

    updateState({
      socket: null,
      isConnected: false,
      connectionState: 'disconnected',
      reconnectAttempts: 0,
      lastError: null,
    });
  }, [state.socket, updateState]);

  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered');
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  // ========== MESSAGE HANDLING ==========

  const handleWebSocketMessage = useCallback((data: WSMessage) => {
    console.log('📥 Received WebSocket message:', data.type);
    
    // Emit to registered listeners
    const listeners = eventListenersRef.current.get(data.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data.payload);
        } catch (error) {
          console.error(`❌ Error in event listener for ${data.type}:`, error);
        }
      });
    }

    // Handle pong for latency calculation
    if (data.type === 'pong') {
      const latency = Date.now() - pingTimeRef.current;
      updateState({ latency, lastPingTime: Date.now() });
    }
  }, [updateState]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (state.socket?.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
      return;
    }

    const message: WSMessage = { type, payload };
    
    try {
      state.socket.send(JSON.stringify(message));
      console.log('📤 Sent WebSocket message:', type);
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
    }
  }, [state.socket]);

  // ========== EVENT LISTENERS ==========

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    const listeners = eventListenersRef.current.get(event) || new Set();
    listeners.add(callback);
    eventListenersRef.current.set(event, listeners);
  }, []);

  const off = useCallback((event: string, callback: (...args: any[]) => void) => {
    const listeners = eventListenersRef.current.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }, []);

  // ========== HELPER FUNCTIONS ==========

  const startHeartbeat = useCallback((socket: WebSocket) => {
    stopHeartbeat();
    
    heartbeatTimerRef.current = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        pingTimeRef.current = Date.now();
        sendMessage('ping', { timestamp: pingTimeRef.current });
      }
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL || 30000);
  }, [sendMessage]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = undefined;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!shouldConnectRef.current) return;

    const currentAttempts = state.reconnectAttempts;
    
    if (currentAttempts >= (WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS || 5)) {
      console.log('❌ Max reconnection attempts reached');
      updateState({
        connectionState: 'failed',
        lastError: 'Max reconnection attempts reached',
      });
      toast.error('Connection lost. Please refresh the page.');
      return;
    }

    const delay = Math.min(
      (WEBSOCKET_CONFIG.RECONNECT_DELAY || 1000) * Math.pow(2, currentAttempts),
      WEBSOCKET_CONFIG.MAX_RECONNECT_DELAY || 30000
    );

    console.log(`🔄 Scheduling reconnect attempt ${currentAttempts + 1} in ${delay}ms`);
    
    updateState({
      connectionState: 'reconnecting',
      reconnectAttempts: currentAttempts + 1,
    });

    reconnectTimerRef.current = setTimeout(() => {
      if (shouldConnectRef.current) {
        connect();
      }
    }, delay);
  }, [state.reconnectAttempts, updateState, connect]);

  // ========== ACTION FUNCTIONS ==========

  const emit = useCallback((event: string, payload?: any) => {
    sendMessage(event, payload);
  }, [sendMessage]);

  const startTyping = useCallback((chatId: string) => {
    sendMessage(WEBSOCKET_EVENTS.TYPING_START, { chatId });
  }, [sendMessage]);

  const stopTyping = useCallback((chatId: string) => {
    sendMessage(WEBSOCKET_EVENTS.TYPING_STOP, { chatId });
  }, [sendMessage]);

  const setOnlineStatus = useCallback((isOnline: boolean) => {
    sendMessage(isOnline ? WEBSOCKET_EVENTS.USER_ONLINE : WEBSOCKET_EVENTS.USER_OFFLINE, { isOnline });
  }, [sendMessage]);

  const joinChat = useCallback((chatId: string) => {
    sendMessage(WEBSOCKET_EVENTS.USER_JOIN_CHAT, { chatId });
  }, [sendMessage]);

  const leaveChat = useCallback((chatId: string) => {
    sendMessage(WEBSOCKET_EVENTS.USER_LEAVE_CHAT, { chatId });
  }, [sendMessage]);

  const sendFileUploadProgress = useCallback((uploadId: string, progress: number) => {
    sendMessage(WEBSOCKET_EVENTS.FILE_UPLOAD_PROGRESS, { uploadId, progress });
  }, [sendMessage]);

  const sendFileUploadComplete = useCallback((uploadId: string, fileUrl: string) => {
    sendMessage(WEBSOCKET_EVENTS.FILE_UPLOAD_COMPLETE, { uploadId, fileUrl });
  }, [sendMessage]);

  const sendFileUploadError = useCallback((uploadId: string, error: string) => {
    sendMessage(WEBSOCKET_EVENTS.FILE_UPLOAD_ERROR, { uploadId, error });
  }, [sendMessage]);

  const ping = useCallback(() => {
    pingTimeRef.current = Date.now();
    sendMessage('ping', { timestamp: pingTimeRef.current });
  }, [sendMessage]);

  const getConnectionInfo = useCallback(() => ({
    state: state.connectionState,
    attempts: state.reconnectAttempts,
    latency: state.latency,
  }), [state.connectionState, state.reconnectAttempts, state.latency]);

  // ========== LIFECYCLE ==========

  useEffect(() => {
    return () => {
      shouldConnectRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    ...state,
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