// src/hooks/use-chat.ts - Final simplified version matching Go API
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Chat,
  ChatWithUsers,
  CreateChatRequest,
} from '@/types/chat';
import type {
  Message,
  MessageWithUser,
  SendMessageRequest,
  MessageType,
  MessageReactionRequest,
  ForwardMessageRequest,
  DeleteMessageRequest,
  MessageResponse,
  ReactionType
} from '@/types/message';
import type { UploadResult } from '@/types/api';
import { chatApi, messageApi, fileApi } from '@/lib/api';
import { useSocket } from './use-socket';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

interface UseChatState {
  // Chat list
  chats: ChatWithUsers[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  
  // Current chat
  currentChatId: string | null;
  currentChat: ChatWithUsers | null;
  
  // Messages
  messages: Map<string, MessageWithUser>;
  hasMoreMessages: boolean;
  isLoadingMessages: boolean;
  messageOffset: number;
  
  // Typing indicators
  typingUsers: Set<string>;
  isTyping: boolean;
  
  // Search and media
  searchResults: MessageWithUser[];
  isSearching: boolean;
  mediaMessages: Map<string, MessageWithUser[]>;
  
  // Upload state
  uploadProgress: Map<string, number>;
  isUploading: boolean;
}

interface UseChatActions {
  // Chat Management
  createDirectChat: (participantId: string) => Promise<Chat>;
  createGroupChat: (name: string, participantIds: string[], description?: string) => Promise<Chat>;
  loadChats: () => Promise<ChatWithUsers[]>;
  switchChat: (chatId: string | null) => Promise<void>;
  
  // Message Management
  sendTextMessage: (content: string, replyToId?: string) => Promise<Message>;
  sendMediaMessage: (file: File, content?: string, replyToId?: string) => Promise<Message>;
  loadMessages: (limit?: number, offset?: number) => Promise<MessageWithUser[]>;
  loadMoreMessages: () => Promise<MessageWithUser[]>;
  refreshMessages: () => Promise<void>;
  
  // Message Actions
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteForEveryone?: boolean) => Promise<void>;
  forwardMessages: (messageIds: string[], toChatIds: string[]) => Promise<void>;
  
  // Message Status
  markAsRead: (messageId: string) => Promise<void>;
  markMultipleAsRead: (messageIds: string[]) => Promise<void>;
  getUnreadCount: () => Promise<number>;
  
  // Reactions
  addReaction: (messageId: string, reaction: ReactionType) => Promise<void>;
  removeReaction: (messageId: string, reaction: ReactionType) => Promise<void>;
  toggleReaction: (messageId: string, reaction: ReactionType) => Promise<void>;
  
  // File Upload
  uploadFile: (file: File, onProgress?: (progress: number) => void) => Promise<UploadResult>;
  
  // Search and Media
  searchMessages: (query: string) => Promise<MessageWithUser[]>;
  clearSearchResults: () => void;
  getMediaMessages: (mediaType?: string) => Promise<MessageWithUser[]>;
  
  // Typing Indicators
  startTyping: () => void;
  stopTyping: () => void;
  
  // Utilities
  getMessageById: (messageId: string) => MessageWithUser | null;
  getLastMessage: () => MessageWithUser | null;
  clearError: () => void;
  retryFailedMessage: (messageId: string) => Promise<void>;
}

const INITIAL_STATE: UseChatState = {
  chats: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  currentChatId: null,
  currentChat: null,
  
  messages: new Map(),
  hasMoreMessages: true,
  isLoadingMessages: false,
  messageOffset: 0,
  
  typingUsers: new Set(),
  isTyping: false,
  
  searchResults: [],
  isSearching: false,
  mediaMessages: new Map(),
  
  uploadProgress: new Map(),
  isUploading: false,
};

export function useChat(): UseChatState & UseChatActions {
  const [state, setState] = useState<UseChatState>(INITIAL_STATE);
  const { user } = useAuth();
  const { socket, isConnected, sendMessage: sendSocketMessage } = useSocket();
  
  // Refs for managing timers and state
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<UseChatState>) => {
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

  // Convert MessageResponse to MessageWithUser (simplified)
  const convertMessageResponse = useCallback((msgResponse: MessageResponse): MessageWithUser => {
    const message = msgResponse.message;
    
    return {
      ...message,
      senderName: msgResponse.senderName || 'Unknown',
      isOwn: message.senderId === user?.id,
      replyToMessage: msgResponse.replyToMessage,
    };
  }, [user]);

  // ========== Chat Management ==========

  const createDirectChat = useCallback(async (participantId: string): Promise<Chat> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const request: CreateChatRequest = {
        type: 'direct',
        participants: [participantId],
      };
      
      const chat = await chatApi.createChat(request);
      
      // For simplicity, reload chats after creation
      await loadChats();
      
      toast.success('Chat created successfully');
      return chat;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create chat';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState]);

  const createGroupChat = useCallback(async (name: string, participantIds: string[], description?: string): Promise<Chat> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const request: CreateChatRequest = {
        type: 'group',
        name,
        description,
        participants: participantIds,
      };
      
      const chat = await chatApi.createChat(request);
      
      // For simplicity, reload chats after creation
      await loadChats();
      
      toast.success(`Group "${name}" created successfully`);
      return chat;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create group chat';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState]);

  const loadChats = useCallback(async (): Promise<ChatWithUsers[]> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const chats = await chatApi.getUserChats();
      
      updateState({
        chats,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
      });
      
      return chats;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load chats';
      updateState({ isLoading: false, error: errorMessage });
      console.error('Error loading chats:', error);
      return [];
    }
  }, [updateState]);

  const switchChat = useCallback(async (chatId: string | null): Promise<void> => {
    try {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear current state
      updateState({
        currentChatId: chatId,
        currentChat: null,
        messages: new Map(),
        hasMoreMessages: true,
        messageOffset: 0,
        searchResults: [],
        error: null,
      });

      if (!chatId) return;

      // Load chat details and messages
      updateState({ isLoadingMessages: true });

      const [chat, messageResponses] = await Promise.all([
        chatApi.getChat(chatId),
        messageApi.getChatMessages(chatId, 50, 0),
      ]);

      // Convert message responses to MessageWithUser
      const messages = new Map<string, MessageWithUser>();
      messageResponses.forEach(msgResponse => {
        const message = convertMessageResponse(msgResponse);
        messages.set(message.id, message);
      });

      updateState({
        currentChat: chat,
        messages,
        hasMoreMessages: messageResponses.length === 50,
        isLoadingMessages: false,
      });

      // Mark messages as read
      const unreadMessages = messageResponses
        .filter(msg => !msg.isRead && msg.message.senderId !== user?.id)
        .map(msg => msg.message.id);
      
      if (unreadMessages.length > 0) {
        markMultipleAsRead(unreadMessages);
      }

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to switch chat';
      updateState({ isLoadingMessages: false, error: errorMessage });
      console.error('Error switching chat:', error);
    }
  }, [updateState, convertMessageResponse, user]);

  // ========== Message Management ==========

  const sendTextMessage = useCallback(async (content: string, replyToId?: string): Promise<Message> => {
    if (!state.currentChatId || !content.trim()) {
      throw new Error('Invalid message data');
    }

    try {
      const request: SendMessageRequest = {
        chatId: state.currentChatId,
        type: 'text',
        content: content.trim(),
        replyToId,
      };

      const message = await messageApi.sendMessage(request);
      
      // Add to local state immediately
      const messageWithUser: MessageWithUser = {
        ...message,
        senderName: user?.username || 'You',
        isOwn: true,
      };
      
      addOrUpdateMessage(messageWithUser);
      
      return message;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      toast.error(errorMessage);
      throw error;
    }
  }, [state.currentChatId, user, addOrUpdateMessage]);

  const sendMediaMessage = useCallback(async (file: File, content?: string, replyToId?: string): Promise<Message> => {
    if (!state.currentChatId) {
      throw new Error('No chat selected');
    }

    try {
      updateState({ isUploading: true });
      
      // Determine message type based on file
      let messageType: MessageType = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'audio';
      else if (file.type.includes('pdf') || file.type.includes('document')) messageType = 'document';

      const message = await messageApi.sendMediaMessage(
        file,
        state.currentChatId,
        messageType,
        content,
        replyToId
      );

      // Add to local state
      const messageWithUser: MessageWithUser = {
        ...message,
        senderName: user?.username || 'You',
        isOwn: true,
      };
      
      addOrUpdateMessage(messageWithUser);
      updateState({ isUploading: false });
      
      toast.success('Media message sent successfully');
      return message;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send media message';
      updateState({ isUploading: false });
      toast.error(errorMessage);
      throw error;
    }
  }, [state.currentChatId, user, addOrUpdateMessage, updateState]);

  const loadMessages = useCallback(async (limit: number = 50, offset: number = 0): Promise<MessageWithUser[]> => {
    if (!state.currentChatId) return [];

    try {
      updateState({ isLoadingMessages: true, error: null });
      
      const messageResponses = await messageApi.getChatMessages(state.currentChatId, limit, offset);
      
      const messages: MessageWithUser[] = messageResponses.map(convertMessageResponse);
      
      // Update state with new messages
      setState(prev => {
        const newMessages = new Map(prev.messages);
        messages.forEach(msg => newMessages.set(msg.id, msg));
        
        return {
          ...prev,
          messages: newMessages,
          hasMoreMessages: messageResponses.length === limit,
          messageOffset: offset + messageResponses.length,
          isLoadingMessages: false,
        };
      });
      
      return messages;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load messages';
      updateState({ isLoadingMessages: false, error: errorMessage });
      console.error('Error loading messages:', error);
      return [];
    }
  }, [state.currentChatId, convertMessageResponse, updateState]);

  const loadMoreMessages = useCallback(async (): Promise<MessageWithUser[]> => {
    if (!state.hasMoreMessages || state.isLoadingMessages) return [];
    
    return loadMessages(50, state.messageOffset);
  }, [state.hasMoreMessages, state.isLoadingMessages, state.messageOffset, loadMessages]);

  const refreshMessages = useCallback(async (): Promise<void> => {
    if (!state.currentChatId) return;
    
    updateState({ messageOffset: 0 });
    await loadMessages(50, 0);
  }, [state.currentChatId, loadMessages, updateState]);

  // ========== Message Actions ==========

  const editMessage = useCallback(async (messageId: string, content: string): Promise<void> => {
    try {
      await messageApi.editMessage(messageId, content);
      
      // Update local message
      const message = state.messages.get(messageId);
      if (message) {
        addOrUpdateMessage({
          ...message,
          content,
          editedAt: new Date().toISOString(),
        });
      }
      
      toast.success('Message edited successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to edit message';
      toast.error(errorMessage);
      throw error;
    }
  }, [state.messages, addOrUpdateMessage]);

  const deleteMessage = useCallback(async (messageId: string, deleteForEveryone: boolean = false): Promise<void> => {
    try {
      await messageApi.deleteMessage({
        messageId,
        deleteForMe: !deleteForEveryone,
      });
      
      if (deleteForEveryone) {
        // Remove from local state
        removeMessage(messageId);
      } else {
        // Mark as deleted for current user
        const message = state.messages.get(messageId);
        if (message) {
          addOrUpdateMessage({
            ...message,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedFor: [user?.id || ''],
          });
        }
      }
      
      toast.success('Message deleted successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete message';
      toast.error(errorMessage);
      throw error;
    }
  }, [state.messages, user, addOrUpdateMessage, removeMessage]);

  const forwardMessages = useCallback(async (messageIds: string[], toChatIds: string[]): Promise<void> => {
    try {
      await messageApi.forwardMessages({
        messageIds,
        toChatIds,
      });
      
      toast.success(`Messages forwarded to ${toChatIds.length} chat(s)`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to forward messages';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // ========== Message Status ==========

  const markAsRead = useCallback(async (messageId: string): Promise<void> => {
    try {
      await messageApi.markAsRead(messageId);
      
      // Update local message status
      const message = state.messages.get(messageId);
      if (message && user) {
        const updatedReadBy = [
          ...message.readBy.filter(r => r.userId !== user.id),
          { userId: user.id, readAt: new Date().toISOString() }
        ];
        
        addOrUpdateMessage({
          ...message,
          readBy: updatedReadBy,
          status: 'read',
        });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const markMultipleAsRead = useCallback(async (messageIds: string[]): Promise<void> => {
    try {
      await messageApi.markMultipleAsRead(messageIds);
      
      // Update local message statuses
      messageIds.forEach(messageId => {
        const message = state.messages.get(messageId);
        if (message && user) {
          const updatedReadBy = [
            ...message.readBy.filter(r => r.userId !== user.id),
            { userId: user.id, readAt: new Date().toISOString() }
          ];
          
          addOrUpdateMessage({
            ...message,
            readBy: updatedReadBy,
            status: 'read',
          });
        }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const getUnreadCount = useCallback(async (): Promise<number> => {
    if (!state.currentChatId) return 0;
    
    try {
      const response = await messageApi.getUnreadCount(state.currentChatId);
      return response.unreadCount || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }, [state.currentChatId]);

  // ========== Reactions ==========

  const addReaction = useCallback(async (messageId: string, reaction: ReactionType): Promise<void> => {
    try {
      await messageApi.addReaction({ messageId, reaction });
      
      // Update local message reactions
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
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add reaction';
      toast.error(errorMessage);
      throw error;
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const removeReaction = useCallback(async (messageId: string, reaction: ReactionType): Promise<void> => {
    try {
      await messageApi.removeReaction(messageId, reaction);
      
      // Update local message reactions
      const message = state.messages.get(messageId);
      if (message && user) {
        const updatedReactions = message.reactions.filter(r => 
          !(r.userId === user.id && r.reaction === reaction)
        );
        
        addOrUpdateMessage({
          ...message,
          reactions: updatedReactions,
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove reaction';
      toast.error(errorMessage);
      throw error;
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const toggleReaction = useCallback(async (messageId: string, reaction: ReactionType): Promise<void> => {
    const message = state.messages.get(messageId);
    if (!message || !user) return;
    
    const hasReaction = message.reactions.some(r => r.userId === user.id && r.reaction === reaction);
    
    if (hasReaction) {
      await removeReaction(messageId, reaction);
    } else {
      await addReaction(messageId, reaction);
    }
  }, [state.messages, user, addReaction, removeReaction]);

  // ========== File Upload ==========

  const uploadFile = useCallback(async (file: File, onProgress?: (progress: number) => void): Promise<UploadResult> => {
    try {
      updateState({ isUploading: true });
      
      if (onProgress) {
        onProgress(0);
      }
      
      const result = await fileApi.upload(file);
      
      if (onProgress) {
        onProgress(100);
      }
      
      updateState({ isUploading: false });
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'File upload failed';
      updateState({ isUploading: false });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState]);

  // ========== Search and Media ==========

  const searchMessages = useCallback(async (query: string): Promise<MessageWithUser[]> => {
    if (!state.currentChatId || !query.trim()) return [];

    try {
      updateState({ isSearching: true });
      
      const messageResponses = await messageApi.search(state.currentChatId, query.trim());
      const searchResults = messageResponses.map(convertMessageResponse);
      
      updateState({ searchResults, isSearching: false });
      return searchResults;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Search failed';
      updateState({ searchResults: [], isSearching: false });
      console.error('Search error:', error);
      return [];
    }
  }, [state.currentChatId, convertMessageResponse, updateState]);

  const clearSearchResults = useCallback(() => {
    updateState({ searchResults: [] });
  }, [updateState]);

  const getMediaMessages = useCallback(async (mediaType?: string): Promise<MessageWithUser[]> => {
    if (!state.currentChatId) return [];

    try {
      const messageResponses = await messageApi.getMediaMessages(state.currentChatId, mediaType);
      const mediaMessages = messageResponses.map(convertMessageResponse);
      
      // Cache media messages
      setState(prev => {
        const newMediaMessages = new Map(prev.mediaMessages);
        newMediaMessages.set(mediaType || 'all', mediaMessages);
        return { ...prev, mediaMessages: newMediaMessages };
      });
      
      return mediaMessages;
    } catch (error: any) {
      console.error('Error loading media messages:', error);
      return [];
    }
  }, [state.currentChatId, convertMessageResponse]);

  // ========== Typing Indicators ==========

  const startTyping = useCallback(() => {
    if (!state.currentChatId || !isConnected) return;

    updateState({ isTyping: true });
    
    // Send typing indicator via WebSocket
    sendSocketMessage({
      type: 'typing_start',
      payload: {
        chatId: state.currentChatId,
        userId: user?.id,
        username: user?.username,
        isTyping: true,
      },
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [state.currentChatId, isConnected, user, sendSocketMessage, updateState]);

  const stopTyping = useCallback(() => {
    if (!state.currentChatId || !isConnected) return;

    updateState({ isTyping: false });
    
    // Send typing stop via WebSocket
    sendSocketMessage({
      type: 'typing_stop',
      payload: {
        chatId: state.currentChatId,
        userId: user?.id,
        username: user?.username,
        isTyping: false,
      },
    });

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [state.currentChatId, isConnected, user, sendSocketMessage, updateState]);

  // ========== Utilities ==========

  const getMessageById = useCallback((messageId: string): MessageWithUser | null => {
    return state.messages.get(messageId) || null;
  }, [state.messages]);

  const getLastMessage = useCallback((): MessageWithUser | null => {
    if (state.messages.size === 0) return null;
    
    const messages = Array.from(state.messages.values());
    return messages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [state.messages]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const retryFailedMessage = useCallback(async (messageId: string): Promise<void> => {
    const message = state.messages.get(messageId);
    if (!message || message.status !== 'failed') return;

    try {
      // Retry sending the message
      const request: SendMessageRequest = {
        chatId: message.chatId,
        type: message.type,
        content: message.content,
        replyToId: message.replyToId,
      };

      const newMessage = await messageApi.sendMessage(request);
      
      // Remove failed message and add new one
      removeMessage(messageId);
      addOrUpdateMessage({
        ...newMessage,
        senderName: user?.username || 'You',
        isOwn: true,
      });
      
      toast.success('Message sent successfully');
    } catch (error: any) {
      toast.error('Failed to retry message');
      throw error;
    }
  }, [state.messages, user, addOrUpdateMessage, removeMessage]);

  // ========== Cleanup ==========

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
    
    // Chat Management
    createDirectChat,
    createGroupChat,
    loadChats,
    switchChat,
    
    // Message Management
    sendTextMessage,
    sendMediaMessage,
    loadMessages,
    loadMoreMessages,
    refreshMessages,
    
    // Message Actions
    editMessage,
    deleteMessage,
    forwardMessages,
    
    // Message Status
    markAsRead,
    markMultipleAsRead,
    getUnreadCount,
    
    // Reactions
    addReaction,
    removeReaction,
    toggleReaction,
    
    // File Upload
    uploadFile,
    
    // Search and Media
    searchMessages,
    clearSearchResults,
    getMediaMessages,
    
    // Typing Indicators
    startTyping,
    stopTyping,
    
    // Utilities
    getMessageById,
    getLastMessage,
    clearError,
    retryFailedMessage,
  };
}