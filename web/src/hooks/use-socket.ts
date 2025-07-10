// src/hooks/use-socket.ts - Complete WebSocket hook with all event types
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type {
  WSMessage,
  WSMessageType,
  NewMessagePayload,
  MessageStatusPayload,
  MessageReactionPayload,
  TypingPayload,
  UserStatusPayload,
  ChatActionPayload,
  FileUploadPayload,
} from '@/types/api';
import { getStoredTokens } from '@/lib/storage';
import { buildWebSocketUrl } from '@/config/api-endpoints';
import { toast } from 'sonner';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'reconnecting';

interface UseSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  lastError: string | null;
  reconnectAttempts: number;
  lastMessageTime: number;
  messageQueue: WSMessage[];
}

interface UseSocketActions {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: WSMessage) => void;
  
  // Event subscriptions
  onMessage: (callback: (message: WSMessage) => void) => () => void;
  onNewMessage: (callback: (payload: NewMessagePayload) => void) => () => void;
  onMessageStatus: (callback: (payload: MessageStatusPayload) => void) => () => void;
  onMessageReaction: (callback: (payload: MessageReactionPayload) => void) => () => void;
  onTyping: (callback: (payload: TypingPayload) => void) => () => void;
  onUserStatus: (callback: (payload: UserStatusPayload) => void) => () => void;
  onChatAction: (callback: (payload: ChatActionPayload) => void) => () => void;
  onFileUpload: (callback: (payload: FileUploadPayload) => void) => () => void;
  onError: (callback: (error: string) => void) => () => void;
}

const INITIAL_STATE: UseSocketState = {
  socket: null,
  isConnected: false,
  connectionState: 'disconnected',
  lastError: null,
  reconnectAttempts: 0,
  lastMessageTime: 0,
  messageQueue: [],
};

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // 1 second
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MESSAGE_QUEUE_LIMIT = 100;

export function useSocket(): UseSocketState & UseSocketActions {
  const [state, setState] = useState<UseSocketState>(INITIAL_STATE);
  const router = useRouter();
  
  // Refs for managing connections and timers
  const shouldConnectRef = useRef(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventCallbacksRef = useRef<Map<string, Set<Function>>>(new Map());

  // Helper function to update state
  const updateState = useCallback((updates: Partial<UseSocketState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // ========== Event Management ==========

  const addEventCallback = useCallback((event: string, callback: Function): (() => void) => {
    if (!eventCallbacksRef.current.has(event)) {
      eventCallbacksRef.current.set(event, new Set());
    }
    eventCallbacksRef.current.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      eventCallbacksRef.current.get(event)?.delete(callback);
    };
  }, []);

  const triggerEventCallbacks = useCallback((event: string, payload: any) => {
    const callbacks = eventCallbacksRef.current.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }, []);

  // ========== WebSocket Message Handling ==========

  const handleWebSocketMessage = useCallback((data: WSMessage) => {
    console.log('📨 WebSocket message received:', data.type);
    
    updateState({ lastMessageTime: Date.now() });
    
    // Trigger generic message callbacks
    triggerEventCallbacks('message', data);
    
    // Handle specific message types
    switch (data.type) {
      case 'new_message':
        triggerEventCallbacks('new_message', data.payload as NewMessagePayload);
        break;
        
      case 'message_status':
        triggerEventCallbacks('message_status', data.payload as MessageStatusPayload);
        break;
        
      case 'message_reaction':
        triggerEventCallbacks('message_reaction', data.payload as MessageReactionPayload);
        break;
        
      case 'message_deleted':
        triggerEventCallbacks('message_deleted', data.payload);
        break;
        
      case 'message_edited':
        triggerEventCallbacks('message_edited', data.payload);
        break;
        
      case 'typing_start':
      case 'typing_stop':
        triggerEventCallbacks('typing', data.payload as TypingPayload);
        break;
        
      case 'user_online':
      case 'user_offline':
        triggerEventCallbacks('user_status', data.payload as UserStatusPayload);
        break;
        
      case 'user_join_chat':
      case 'user_leave_chat':
        triggerEventCallbacks('chat_action', data.payload as ChatActionPayload);
        break;
        
      case 'chat_created':
      case 'chat_updated':
        triggerEventCallbacks('chat_action', data.payload as ChatActionPayload);
        break;
        
      case 'file_upload_progress':
      case 'file_upload_complete':
      case 'file_upload_error':
        triggerEventCallbacks('file_upload', data.payload as FileUploadPayload);
        break;
        
      case 'error':
        const errorMessage = typeof data.payload === 'string' ? data.payload : data.payload?.message || 'Unknown error';
        triggerEventCallbacks('error', errorMessage);
        toast.error(`WebSocket Error: ${errorMessage}`);
        break;
        
      case 'pong':
        console.log('🏓 Pong received');
        break;
        
      default:
        console.warn('🤷 Unknown WebSocket message type:', data.type);
    }
  }, [updateState, triggerEventCallbacks]);

  // ========== Heartbeat Management ==========

  const startHeartbeat = useCallback((socket: WebSocket) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        console.log('🏓 Sending ping');
        socket.send(JSON.stringify({ type: 'ping', payload: {} }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ========== Reconnection Logic ==========

  const scheduleReconnect = useCallback(() => {
    if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
      updateState({
        connectionState: 'failed',
        lastError: 'Connection failed after multiple attempts',
      });
      toast.error('Connection failed. Please refresh the page.');
      return;
    }

    const delay = RECONNECT_DELAY * Math.pow(2, state.reconnectAttempts); // Exponential backoff
    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${state.reconnectAttempts + 1})`);

    updateState({
      connectionState: 'reconnecting',
      reconnectAttempts: state.reconnectAttempts + 1,
    });

    reconnectTimeoutRef.current = setTimeout(() => {
      if (shouldConnectRef.current) {
        connect();
      }
    }, delay);
  }, [state.reconnectAttempts, updateState]);

  // ========== Connection Management ==========

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

      const wsUrl = buildWebSocketUrl(tokens.accessToken);
      console.log('🔌 Connecting to WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'));

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

        // Send queued messages
        if (state.messageQueue.length > 0) {
          console.log(`📤 Sending ${state.messageQueue.length} queued messages`);
          state.messageQueue.forEach(message => {
            newSocket.send(JSON.stringify(message));
          });
          updateState({ messageQueue: [] });
        }

        if (state.reconnectAttempts > 0) {
          toast.success('Reconnected to chat');
        }
      };

      newSocket.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        updateState({
          isConnected: false,
          connectionState: 'disconnected',
          lastError: event.reason || `Connection closed (${event.code})`,
        });

        stopHeartbeat();

        // Handle different close codes
        if (event.code === 1000) {
          // Normal closure
          console.log('✅ WebSocket closed normally');
        } else if (event.code === 1001) {
          // Going away
          console.log('👋 WebSocket closed - going away');
        } else if (event.code === 1006) {
          // Abnormal closure
          console.log('💥 WebSocket closed abnormally');
          if (shouldConnectRef.current) {
            scheduleReconnect();
          }
        } else if (event.code === 1008 || event.code === 1011) {
          // Server error
          console.error('🚨 WebSocket server error');
          updateState({
            connectionState: 'failed',
            lastError: 'Server error',
          });
          toast.error('Server connection error');
        } else if (event.code === 4001) {
          // Unauthorized
          console.error('🚫 WebSocket unauthorized');
          updateState({
            connectionState: 'failed',
            lastError: 'Unauthorized',
          });
          toast.error('Authentication failed');
          router.push('/auth');
        } else {
          // Other errors
          if (shouldConnectRef.current) {
            scheduleReconnect();
          }
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
          triggerEventCallbacks('error', 'Failed to parse message');
        }
      };

      setState(prev => ({ ...prev, socket: newSocket }));

    } catch (error) {
      console.error('💥 Failed to create WebSocket connection:', error);
      updateState({
        connectionState: 'failed',
        lastError: error instanceof Error ? error.message : 'Connection failed',
      });

      if (shouldConnectRef.current) {
        scheduleReconnect();
      }
    }
  }, [state.socket, state.messageQueue, state.reconnectAttempts, updateState, startHeartbeat, stopHeartbeat, scheduleReconnect, handleWebSocketMessage, triggerEventCallbacks, router]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket');
    shouldConnectRef.current = false;

    // Clear timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHeartbeat();

    // Close socket
    if (state.socket) {
      state.socket.close(1000, 'Manual disconnect');
    }

    updateState({
      socket: null,
      isConnected: false,
      connectionState: 'disconnected',
      reconnectAttempts: 0,
      lastError: null,
    });
  }, [state.socket, updateState, stopHeartbeat]);

  // ========== Message Sending ==========

  const sendMessage = useCallback((message: WSMessage) => {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, queueing message');
      
      // Queue message for when connection is restored
      setState(prev => ({
        ...prev,
        messageQueue: [...prev.messageQueue.slice(-MESSAGE_QUEUE_LIMIT + 1), message],
      }));
      
      // Try to reconnect if not already trying
      if (shouldConnectRef.current && state.connectionState === 'disconnected') {
        connect();
      }
      
      return;
    }

    try {
      const messageString = JSON.stringify(message);
      state.socket.send(messageString);
      console.log('📤 WebSocket message sent:', message.type);
    } catch (error) {
      console.error('❌ Failed to send WebSocket message:', error);
      triggerEventCallbacks('error', 'Failed to send message');
    }
  }, [state.socket, state.connectionState, connect, triggerEventCallbacks]);

  // ========== Event Subscription Methods ==========

  const onMessage = useCallback((callback: (message: WSMessage) => void) => {
    return addEventCallback('message', callback);
  }, [addEventCallback]);

  const onNewMessage = useCallback((callback: (payload: NewMessagePayload) => void) => {
    return addEventCallback('new_message', callback);
  }, [addEventCallback]);

  const onMessageStatus = useCallback((callback: (payload: MessageStatusPayload) => void) => {
    return addEventCallback('message_status', callback);
  }, [addEventCallback]);

  const onMessageReaction = useCallback((callback: (payload: MessageReactionPayload) => void) => {
    return addEventCallback('message_reaction', callback);
  }, [addEventCallback]);

  const onTyping = useCallback((callback: (payload: TypingPayload) => void) => {
    return addEventCallback('typing', callback);
  }, [addEventCallback]);

  const onUserStatus = useCallback((callback: (payload: UserStatusPayload) => void) => {
    return addEventCallback('user_status', callback);
  }, [addEventCallback]);

  const onChatAction = useCallback((callback: (payload: ChatActionPayload) => void) => {
    return addEventCallback('chat_action', callback);
  }, [addEventCallback]);

  const onFileUpload = useCallback((callback: (payload: FileUploadPayload) => void) => {
    return addEventCallback('file_upload', callback);
  }, [addEventCallback]);

  const onError = useCallback((callback: (error: string) => void) => {
    return addEventCallback('error', callback);
  }, [addEventCallback]);

  // ========== Lifecycle Management ==========

  useEffect(() => {
    // Auto-connect when component mounts
    const tokens = getStoredTokens();
    if (tokens?.accessToken) {
      connect();
    }

    return () => {
      shouldConnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
      
      if (state.socket) {
        state.socket.close(1000, 'Component unmounting');
      }
    };
  }, []); // Only run on mount

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, reconnect if needed
        const tokens = getStoredTokens();
        if (tokens?.accessToken && !state.isConnected && shouldConnectRef.current) {
          console.log('👁️ Page visible, attempting to reconnect');
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isConnected, connect]);

  return {
    // State
    ...state,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    
    // Event subscriptions
    onMessage,
    onNewMessage,
    onMessageStatus,
    onMessageReaction,
    onTyping,
    onUserStatus,
    onChatAction,
    onFileUpload,
    onError,
  };
}