// Fixed useChat hook - addresses forEach and find errors
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from '@/hooks/use-socket';
import { toast } from 'sonner';
import type { 
  Chat, 
  ChatWithUsers, 
  CreateChatRequest 
} from '@/types/chat';
import type { 
  Message, 
  MessageWithUser, 
  MessageResponse,
  MessageType,
  MessageStatus,
  ReactionType 
} from '@/types/message';
import { chatApi, messageApi } from '@/lib/api';

interface ChatState {
  chats: ChatWithUsers[];
  currentChat: ChatWithUsers | null;
  currentChatId: string | null;
  messages: Map<string, MessageWithUser>;
  isLoading: boolean;
  isLoadingMessages: boolean;
  isUploading: boolean;
  hasMoreMessages: boolean;
  messageOffset: number;
  typingUsers: Map<string, string[]>;
  searchResults: MessageWithUser[];
  error: string | null;
  lastUpdated: string | null;
}

const initialState: ChatState = {
  chats: [],
  currentChat: null,
  currentChatId: null,
  messages: new Map(),
  isLoading: false,
  isLoadingMessages: false,
  isUploading: false,
  hasMoreMessages: true,
  messageOffset: 0,
  typingUsers: new Map(),
  searchResults: [],
  error: null,
  lastUpdated: null,
};

export function useChat() {
  const [state, setState] = useState<ChatState>(initialState);
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const abortControllerRef = useRef<AbortController | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>();

  // Helper function to update state
  const updateState = useCallback((updates: Partial<ChatState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper function to add/update message
  const addOrUpdateMessage = useCallback((message: MessageWithUser) => {
    setState(prev => {
      const newMessages = new Map(prev.messages);
      newMessages.set(message.id, message);
      return { ...prev, messages: newMessages };
    });
  }, []);

  // Helper function to remove message
  const removeMessage = useCallback((messageId: string) => {
    setState(prev => {
      const newMessages = new Map(prev.messages);
      newMessages.delete(messageId);
      return { ...prev, messages: newMessages };
    });
  }, []);

  // Convert message response to MessageWithUser
  const convertMessageResponse = useCallback((msgResponse: MessageResponse): MessageWithUser => {
    const message = msgResponse.message;
    return {
      ...message,
      senderName: msgResponse.senderName || user?.username || 'Unknown',
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
      
      // Reload chats after creation
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
      
      // Reload chats after creation
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
      
      // Ensure chats is always an array
      const chatsArray = Array.isArray(chats) ? chats : [];
      
      updateState({
        chats: chatsArray,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
      });
      
      return chatsArray;
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

      // Ensure messageResponses is always an array
      const messagesArray = Array.isArray(messageResponses) ? messageResponses : [];

      // Convert message responses to MessageWithUser
      const messages = new Map<string, MessageWithUser>();
      messagesArray.forEach(msgResponse => {
        const message = convertMessageResponse(msgResponse);
        messages.set(message.id, message);
      });

      updateState({
        currentChat: chat,
        messages,
        hasMoreMessages: messagesArray.length === 50,
        isLoadingMessages: false,
      });

      // Mark messages as read
      const unreadMessages = messagesArray
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
    if (!state.currentChatId) {
      throw new Error('No chat selected');
    }

    try {
      const message = await messageApi.sendMessage({
        chatId: state.currentChatId,
        content,
        type: 'text',
        replyToId,
      });

      // Add to local state
      const messageWithUser: MessageWithUser = {
        ...message,
        senderName: user?.username || user?.firstName || 'You',
        isOwn: true,
      };
      
      addOrUpdateMessage(messageWithUser);
      
      toast.success('Message sent successfully');
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
        senderName: user?.username || user?.firstName || 'You',
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
      
      // Ensure messageResponses is always an array
      const messagesArray = Array.isArray(messageResponses) ? messageResponses : [];
      
      const messages: MessageWithUser[] = messagesArray.map(convertMessageResponse);
      
      // Update state with new messages
      setState(prev => {
        const newMessages = new Map(prev.messages);
        messages.forEach(msg => newMessages.set(msg.id, msg));
        
        return {
          ...prev,
          messages: newMessages,
          hasMoreMessages: messagesArray.length === limit,
          messageOffset: offset + messagesArray.length,
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
      console.error('Error marking multiple messages as read:', error);
    }
  }, [state.messages, user, addOrUpdateMessage]);

  // ========== Reactions ==========

  const addReaction = useCallback(async (messageId: string, reaction: ReactionType): Promise<void> => {
    try {
      await messageApi.addReaction({ messageId, reaction });
      
      // Update local message
      const message = state.messages.get(messageId);
      if (message && user) {
        const updatedReactions = [
          ...message.reactions.filter(r => r.userId !== user.id || r.reaction !== reaction),
          { userId: user.id, reaction: reaction, addedAt: new Date().toISOString() }
        ];
        
        addOrUpdateMessage({
          ...message,
          reactions: updatedReactions,
        });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const removeReaction = useCallback(async (messageId: string, reaction: ReactionType): Promise<void> => {
    try {
      await messageApi.removeReaction(messageId, reaction);
      
      // Update local message
      const message = state.messages.get(messageId);
      if (message && user) {
        const updatedReactions = message.reactions.filter(
          r => !(r.userId === user.id && r.reaction === reaction)
        );
        
        addOrUpdateMessage({
          ...message,
          reactions: updatedReactions,
        });
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }, [state.messages, user, addOrUpdateMessage]);

  const toggleReaction = useCallback(async (messageId: string, reaction: ReactionType): Promise<void> => {
    const message = state.messages.get(messageId);
    if (!message || !user) return;
    
    const existingReaction = message.reactions.find(
      r => r.userId === user.id && r.reaction === reaction
    );
    
    if (existingReaction) {
      await removeReaction(messageId, reaction);
    } else {
      await addReaction(messageId, reaction);
    }
  }, [state.messages, user, addReaction, removeReaction]);

  // ========== Typing Indicators ==========

  const startTyping = useCallback((chatId: string) => {
    if (!socket || !isConnected) return;
    
    // If socket is Socket.IO client, use emit; if native WebSocket, use send
    if (typeof (socket as any).emit === 'function') {
      (socket as any).emit('typing_start', { chatId });
    } else if (typeof (socket as any).send === 'function') {
      (socket as any).send(JSON.stringify({ type: 'typing_start', chatId }));
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(chatId);
    }, 3000);
  }, [socket, isConnected]);

  const stopTyping = useCallback((chatId: string) => {
    if (!socket || !isConnected) return;
    
    // If socket is Socket.IO client, use emit; if native WebSocket, use send
    if (typeof (socket as any).emit === 'function') {
      (socket as any).emit('typing_stop', { chatId });
    } else if (typeof (socket as any).send === 'function') {
      (socket as any).send(JSON.stringify({ type: 'typing_stop', chatId }));
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }
  }, [socket, isConnected]);

  // ========== Utilities ==========

  const getMessageById = useCallback((messageId: string): MessageWithUser | null => {
    return state.messages.get(messageId) || null;
  }, [state.messages]);

  const getLastMessage = useCallback((chatId: string): MessageWithUser | null => {
    const chatMessages = Array.from(state.messages.values())
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return chatMessages[0] || null;
  }, [state.messages]);

  const getUnreadCount = useCallback((chatId?: string): number => {
    if (chatId) {
      return Array.from(state.messages.values())
        .filter(msg => msg.chatId === chatId && !msg.isOwn && msg.status !== 'read')
        .length;
    }
    
    return Array.from(state.messages.values())
      .filter(msg => !msg.isOwn && msg.status !== 'read')
      .length;
  }, [state.messages]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // ========== Search ==========

  const searchMessages = useCallback(async (query: string): Promise<MessageWithUser[]> => {
    if (!state.currentChatId || !query.trim()) return [];
    
    try {
      const messages = await messageApi.searchMessages(state.currentChatId, query, 50);
      const messagesWithUser = messages.map(msg => ({
        ...msg,
        senderName: msg.senderId === user?.id ? (user?.username || user?.firstName || 'You') : 'Unknown',
        isOwn: msg.senderId === user?.id,
      }));
      
      updateState({ searchResults: messagesWithUser });
      return messagesWithUser;
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, [state.currentChatId, user, updateState]);

  const clearSearchResults = useCallback(() => {
    updateState({ searchResults: [] });
  }, [updateState]);

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
    
    // Typing Indicators
    startTyping,
    stopTyping,
    
    // Search
    searchMessages,
    clearSearchResults,
    
    // Utilities
    getMessageById,
    getLastMessage,
    clearError,
  };
}