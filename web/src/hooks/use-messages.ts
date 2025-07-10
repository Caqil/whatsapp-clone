// src/hooks/use-messages.ts
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { 
  Message,
  MessageWithUser,
  MessageType,
  MessageStatus,
  ReactionType,
  SendMessageRequest,
  MessageReactionRequest,
  ForwardMessageRequest,
  DeleteMessageRequest,
  MessageSearchResult,
  MessageListState,
  MessageResponse
} from '@/types/message';
import type { ApiResponse, PaginationParams, UploadResult } from '@/types/api';
import { messageApi, fileApi } from '@/lib/api';
import { useSocket } from './use-socket';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

interface UseMessagesState extends MessageListState {
  currentChatId: string | null;
  typingUsers: Set<string>;
  isTyping: boolean;
  searchResults: MessageSearchResult[];
  isSearching: boolean;
  error: string | null;
  
  // Upload state
  uploadProgress: Map<string, number>;
  isUploading: boolean;
}

interface UseMessagesActions {
  // Message Management
  sendMessage: (request: SendMessageRequest) => Promise<Message>;
  sendTextMessage: (chatId: string, content: string, replyToId?: string) => Promise<Message>;
  sendMediaMessage: (file: File, chatId: string, content?: string, replyToId?: string) => Promise<Message>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteForEveryone?: boolean) => Promise<void>;
  forwardMessages: (messageIds: string[], toChatIds: string[]) => Promise<void>;
  
  // Message Loading
  loadMessages: (chatId: string, limit?: number, offset?: number) => Promise<MessageWithUser[]>;
  loadMoreMessages: () => Promise<MessageWithUser[]>;
  refreshMessages: () => Promise<void>;
  
  // Message Status
  markAsRead: (messageId: string) => Promise<void>;
  markMultipleAsRead: (messageIds: string[]) => Promise<void>;
  getUnreadCount: (chatId: string) => Promise<number>;
  
  // Reactions
  addReaction: (messageId: string, reaction: ReactionType) => Promise<void>;
  removeReaction: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, reaction: ReactionType) => Promise<void>;
  
  // Search
  searchMessages: (chatId: string, query: string) => Promise<MessageSearchResult[]>;
  clearSearchResults: () => void;
  getMediaMessages: (chatId: string, mediaType?: MessageType) => Promise<MessageWithUser[]>;
  
  // Typing Indicators
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  
  // Utilities
  getMessageById: (messageId: string) => MessageWithUser | null;
  getLastMessage: (chatId: string) => MessageWithUser | null;
  switchChat: (chatId: string | null) => void;
  clearMessages: () => void;
  retryFailedMessage: (messageId: string) => Promise<void>;
}

const INITIAL_STATE: UseMessagesState = {
  messages: new Map(),
  hasMore: true,
  isLoading: false,
  offset: 0,
  limit: 50,
  currentChatId: null,
  typingUsers: new Set(),
  isTyping: false,
  searchResults: [],
  isSearching: false,
  error: null,
  uploadProgress: new Map(),
  isUploading: false,
};

export function useMessages(): UseMessagesState & UseMessagesActions {
  const [state, setState] = useState<UseMessagesState>(INITIAL_STATE);
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // Refs for managing timers and state
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<UseMessagesState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper function to add or update a message
  const addOrUpdateMessage = useCallback((message: MessageWithUser) => {
    setState(prev => {
      const newMessages = new Map(prev.messages);
      newMessages.set(message.id, message);
      return { ...prev, messages: newMessages };
    });
  }, []);

  // Helper function to remove a message
  const removeMessage = useCallback((messageId: string) => {
    setState(prev => {
      const newMessages = new Map(prev.messages);
      newMessages.delete(messageId);
      return { ...prev, messages: newMessages };
    });
  }, []);

  // Convert MessageResponse to MessageWithUser
  const convertMessageResponse = useCallback((msgResponse: MessageResponse): MessageWithUser => {
    // The MessageResponse from backend contains message and additional metadata
    const message = msgResponse.message || msgResponse; // Handle both formats
    
    return {
      ...message,
      sender: message.senderId || { id: message.senderId } as any, // Will be populated by backend
      isOwn: message.senderId === user?.id,
      senderName: msgResponse.senderName|| 'Unknown',
    };
  }, [user?.id]);

  // ========== MESSAGE MANAGEMENT ==========

  const sendMessage = useCallback(async (request: SendMessageRequest): Promise<Message> => {
    try {
      const message = await messageApi.send(request);
      
      // Add optimistic message to state
      const optimisticMessage: MessageWithUser = {
        ...message,
        sender: user!,
        isOwn: true,
        senderName: user?.username || 'You',
      };
      
      addOrUpdateMessage(optimisticMessage);
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  }, [user, addOrUpdateMessage]);

  const sendTextMessage = useCallback(async (
    chatId: string, 
    content: string, 
    replyToId?: string
  ): Promise<Message> => {
    return sendMessage({
      chatId,
      type: 'text',
      content,
      replyToId,
    });
  }, [sendMessage]);

  const sendMediaMessage = useCallback(async (
    file: File,
    chatId: string,
    content?: string,
    replyToId?: string
  ): Promise<Message> => {
    try {
      updateState({ isUploading: true });
      
      // Track upload progress
      setState(prev => {
        const newProgress = new Map(prev.uploadProgress);
        newProgress.set(file.name, 0);
        return { ...prev, uploadProgress: newProgress };
      });

      // Use the fileApi.sendMedia method which handles upload + message creation
      const message = await fileApi.sendMedia(file, chatId, content);

      // Add message to state
      const messageWithUser: MessageWithUser = {
        ...message,
        sender: user!,
        isOwn: true,
        senderName: user?.username || 'You',
      };
      
      addOrUpdateMessage(messageWithUser);
      
      // Clear upload progress
      setState(prev => {
        const newProgress = new Map(prev.uploadProgress);
        newProgress.delete(file.name);
        return { ...prev, uploadProgress: newProgress };
      });
      
      return message;
    } catch (error) {
      console.error('Error sending media message:', error);
      toast.error('Failed to send media message');
      throw error;
    } finally {
      updateState({ isUploading: false });
    }
  }, [user, addOrUpdateMessage, updateState]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await messageApi.edit(messageId, content);
      
      // Update message in state
      const message = state.messages.get(messageId);
      if (message) {
        addOrUpdateMessage({
          ...message,
          content,
          editedAt: new Date().toISOString(),
        });
      }
      
      toast.success('Message edited');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
      throw error;
    }
  }, [state.messages, addOrUpdateMessage]);

  const deleteMessage = useCallback(async (messageId: string, deleteForEveryone: boolean = false) => {
    try {
      await messageApi.delete({ messageId, deleteForMe: !deleteForEveryone });
      
      if (deleteForEveryone) {
        removeMessage(messageId);
      } else {
        // Update message to show as deleted for current user
        const message = state.messages.get(messageId);
        if (message) {
          addOrUpdateMessage({
            ...message,
            isDeleted: true,
            content: 'This message was deleted',
            deletedAt: new Date().toISOString(),
          });
        }
      }
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
      throw error;
    }
  }, [state.messages, addOrUpdateMessage, removeMessage]);

  const forwardMessages = useCallback(async (messageIds: string[], toChatIds: string[]) => {
    try {
      await messageApi.forward({ messageIds, toChatIds });
      toast.success(`Message${messageIds.length > 1 ? 's' : ''} forwarded to ${toChatIds.length} chat${toChatIds.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error forwarding messages:', error);
      toast.error('Failed to forward messages');
      throw error;
    }
  }, []);

  // ========== MESSAGE LOADING ==========

  const loadMessages = useCallback(async (
    chatId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessageWithUser[]> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const messageResponses = await messageApi.getChatMessages(chatId, limit, offset);
      const messages = messageResponses.map(convertMessageResponse);
      
      if (offset === 0) {
        // Replace messages for new chat
        setState(prev => ({
          ...prev,
          messages: new Map(messages.map(msg => [msg.id, msg])),
          currentChatId: chatId,
          hasMore: messages.length === limit,
          offset: messages.length,
          isLoading: false,
        }));
      } else {
        // Append messages for pagination
        setState(prev => {
          const newMessages = new Map(prev.messages);
          messages.forEach(msg => newMessages.set(msg.id, msg));
          
          return {
            ...prev,
            messages: newMessages,
            hasMore: messages.length === limit,
            offset: prev.offset + messages.length,
            isLoading: false,
          };
        });
      }
      
      return messages;
    } catch (error) {
      console.error('Error loading messages:', error);
      updateState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load messages' 
      });
      throw error;
    }
  }, [convertMessageResponse, updateState]);

  const loadMoreMessages = useCallback(async (): Promise<MessageWithUser[]> => {
    if (!state.currentChatId || !state.hasMore || state.isLoading) {
      return [];
    }
    
    return loadMessages(state.currentChatId, state.limit, state.offset);
  }, [state.currentChatId, state.hasMore, state.isLoading, state.limit, state.offset, loadMessages]);

  const refreshMessages = useCallback(async () => {
    if (!state.currentChatId) return;
    await loadMessages(state.currentChatId, state.limit, 0);
  }, [state.currentChatId, state.limit, loadMessages]);

  // ========== MESSAGE STATUS ==========

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await messageApi.markAsRead(messageId);
      
      // Update message status locally
      const message = state.messages.get(messageId);
      if (message && user) {
        const updatedMessage = {
          ...message,
          status: 'read' as MessageStatus,
          readBy: [
            ...message.readBy.filter(r => r.userId !== user.id),
            { userId: user.id, readAt: new Date().toISOString() }
          ]
        };
        addOrUpdateMessage(updatedMessage);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const markMultipleAsRead = useCallback(async (messageIds: string[]) => {
    try {
      await messageApi.markMultipleAsRead(messageIds);
      
      // Update multiple messages status locally
      messageIds.forEach(messageId => {
        const message = state.messages.get(messageId);
        if (message && user) {
          const updatedMessage = {
            ...message,
            status: 'read' as MessageStatus,
            readBy: [
              ...message.readBy.filter(r => r.userId !== user.id),
              { userId: user.id, readAt: new Date().toISOString() }
            ]
          };
          addOrUpdateMessage(updatedMessage);
        }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const getUnreadCount = useCallback(async (chatId: string): Promise<number> => {
    try {
      const response = await messageApi.getUnreadCount(chatId);
      return response.unreadCount || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }, []);

  // ========== REACTIONS ==========

  const addReaction = useCallback(async (messageId: string, reaction: ReactionType) => {
    try {
      await messageApi.addReaction({ messageId, reaction });
      
      // Update message reactions locally
      const message = state.messages.get(messageId);
      if (message && user) {
        const updatedReactions = [
          ...message.reactions.filter(r => r.userId !== user.id),
          { userId: user.id, reaction, addedAt: new Date().toISOString() }
        ];
        
        addOrUpdateMessage({
          ...message,
          reactions: updatedReactions,
        });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const removeReaction = useCallback(async (messageId: string) => {
    try {
      await messageApi.removeReaction(messageId);
      
      // Update message reactions locally
      const message = state.messages.get(messageId);
      if (message && user) {
        const updatedReactions = message.reactions.filter(r => r.userId !== user.id);
        
        addOrUpdateMessage({
          ...message,
          reactions: updatedReactions,
        });
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast.error('Failed to remove reaction');
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const toggleReaction = useCallback(async (messageId: string, reaction: ReactionType) => {
    const message = state.messages.get(messageId);
    if (!message || !user) return;
    
    const hasReaction = message.reactions.some(r => r.userId === user.id && r.reaction === reaction);
    
    if (hasReaction) {
      await removeReaction(messageId);
    } else {
      await addReaction(messageId, reaction);
    }
  }, [state.messages, user, addReaction, removeReaction]);

  // ========== SEARCH ==========

  const searchMessages = useCallback(async (chatId: string, query: string): Promise<MessageSearchResult[]> => {
    try {
      updateState({ isSearching: true });
      
      const messageResponses = await messageApi.search(chatId, query);
      
      // Convert MessageResponse[] to MessageSearchResult[]
      const searchResults: MessageSearchResult[] = messageResponses.map(msgResponse => {
        const message = convertMessageResponse(msgResponse);
        return {
          message,
          chatId,
          chatName: '', // Will be populated by the calling component
          context: [], // Context messages would need to be fetched separately
          matchText: query,
        };
      });
      
      updateState({ searchResults, isSearching: false });
      return searchResults;
    } catch (error) {
      console.error('Error searching messages:', error);
      updateState({ searchResults: [], isSearching: false, error: 'Search failed' });
      return [];
    }
  }, [convertMessageResponse, updateState]);

  const clearSearchResults = useCallback(() => {
    updateState({ searchResults: [], error: null });
  }, [updateState]);

  const getMediaMessages = useCallback(async (chatId: string, mediaType?: MessageType): Promise<MessageWithUser[]> => {
    try {
      const type = mediaType || 'image'; // Default to image if not specified
      const messageResponses = await messageApi.getMedia(chatId, type);
      return messageResponses.map(convertMessageResponse);
    } catch (error) {
      console.error('Error getting media messages:', error);
      return [];
    }
  }, [convertMessageResponse]);

  // ========== TYPING INDICATORS ==========

  const startTyping = useCallback((chatId: string) => {
    if (!socket || !isConnected) return;
    
    socket.emit('typing_start', { chatId });
    updateState({ isTyping: true });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(chatId);
    }, 3000);
  }, [socket, isConnected, updateState]);

  const stopTyping = useCallback((chatId: string) => {
    if (!socket || !isConnected) return;
    
    socket.emit('typing_stop', { chatId });
    updateState({ isTyping: false });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }
  }, [socket, isConnected, updateState]);

  // ========== UTILITIES ==========

  const getMessageById = useCallback((messageId: string): MessageWithUser | null => {
    return state.messages.get(messageId) || null;
  }, [state.messages]);

  const getLastMessage = useCallback((chatId: string): MessageWithUser | null => {
    const chatMessages = Array.from(state.messages.values())
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return chatMessages[0] || null;
  }, [state.messages]);

  const switchChat = useCallback((chatId: string | null) => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Stop typing if switching chats
    if (state.currentChatId && state.isTyping) {
      stopTyping(state.currentChatId);
    }
    
    // Clear messages and load new chat
    if (chatId && chatId !== state.currentChatId) {
      updateState({ 
        currentChatId: chatId,
        messages: new Map(),
        offset: 0,
        hasMore: true,
        error: null,
        searchResults: [],
      });
      
      loadMessages(chatId);
    } else if (!chatId) {
      updateState({ 
        currentChatId: null,
        messages: new Map(),
        offset: 0,
        hasMore: true,
        error: null,
        searchResults: [],
      });
    }
  }, [state.currentChatId, state.isTyping, stopTyping, updateState, loadMessages]);

  const clearMessages = useCallback(() => {
    updateState({ 
      messages: new Map(),
      offset: 0,
      hasMore: true,
      error: null,
      searchResults: [],
    });
  }, [updateState]);

  const retryFailedMessage = useCallback(async (messageId: string) => {
    const message = state.messages.get(messageId);
    if (!message) return;
    
    try {
      // Create retry request from failed message
      const retryRequest: SendMessageRequest = {
        chatId: message.chatId,
        type: message.type,
        content: message.content,
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType,
        fileName: message.fileName,
        fileSize: message.fileSize,
        duration: message.duration,
        dimensions: message.dimensions,
        replyToId: message.replyToId,
      };
      
      // Remove failed message
      removeMessage(messageId);
      
      // Retry sending
      await sendMessage(retryRequest);
    } catch (error) {
      console.error('Error retrying message:', error);
      toast.error('Failed to resend message');
    }
  }, [state.messages, removeMessage, sendMessage]);

  // ========== WEBSOCKET EVENT HANDLERS ==========

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle new messages
    const handleNewMessage = (payload: any) => {
      const message: MessageWithUser = {
        ...payload.message,
        sender: payload.sender || { id: payload.message.senderId },
        isOwn: payload.message.senderId === user?.id,
        senderName: payload.senderName || payload.sender?.username || 'Unknown',
      };
      addOrUpdateMessage(message);
    };

    // Handle message status updates
    const handleMessageStatus = (payload: any) => {
      const message = state.messages.get(payload.messageId);
      if (message) {
        addOrUpdateMessage({
          ...message,
          status: payload.status,
        });
      }
    };

    // Handle typing indicators
    const handleTypingStart = (payload: any) => {
      if (payload.userId !== user?.id) {
        setState(prev => {
          const newTypingUsers = new Set(prev.typingUsers);
          newTypingUsers.add(payload.userId);
          return { ...prev, typingUsers: newTypingUsers };
        });
      }
    };

    const handleTypingStop = (payload: any) => {
      if (payload.userId !== user?.id) {
        setState(prev => {
          const newTypingUsers = new Set(prev.typingUsers);
          newTypingUsers.delete(payload.userId);
          return { ...prev, typingUsers: newTypingUsers };
        });
      }
    };

    // Handle message reactions
    const handleMessageReaction = (payload: any) => {
      const message = state.messages.get(payload.messageId);
      if (message) {
        let updatedReactions = [...message.reactions];
        
        if (payload.action === 'add') {
          updatedReactions = updatedReactions.filter(r => r.userId !== payload.userId);
          updatedReactions.push({
            userId: payload.userId,
            reaction: payload.reaction,
            addedAt: payload.timestamp,
          });
        } else {
          updatedReactions = updatedReactions.filter(r => r.userId !== payload.userId);
        }
        
        addOrUpdateMessage({
          ...message,
          reactions: updatedReactions,
        });
      }
    };

    // Register event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('message_status', handleMessageStatus);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('message_reaction', handleMessageReaction);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status', handleMessageStatus);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('message_reaction', handleMessageReaction);
    };
  }, [socket, isConnected, user?.id, state.messages, addOrUpdateMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    sendMessage,
    sendTextMessage,
    sendMediaMessage,
    editMessage,
    deleteMessage,
    forwardMessages,
    
    loadMessages,
    loadMoreMessages,
    refreshMessages,
    
    markAsRead,
    markMultipleAsRead,
    getUnreadCount,
    
    addReaction,
    removeReaction,
    toggleReaction,
    
    searchMessages,
    clearSearchResults,
    getMediaMessages,
    
    startTyping,
    stopTyping,
    
    getMessageById,
    getLastMessage,
    switchChat,
    clearMessages,
    retryFailedMessage,
  };
}

// ========== HELPER FUNCTIONS ==========

function getMessageTypeFromFile(file: File): MessageType {
  const type = file.type.toLowerCase();
  
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  
  // Document types
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ];
  
  if (documentTypes.includes(type)) return 'document';
  
  return 'file';
}