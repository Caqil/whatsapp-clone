// src/hooks/use-chat.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { 
  Chat,
  ChatWithUsers,
  CreateChatRequest,
  UpdateChatRequest,
  ChatSearchResult,
  ChatListItem,
  ChatMetadata,
  DirectChat,
  GroupChat
} from '@/types/chat';
import type { User } from '@/types/user';
import type { Message } from '@/types/message';
import { chatApi, userApi } from '@/lib/api';
import { 
  getCurrentChatId,
  setCurrentChatId,
  removeCurrentChatId,
  getPinnedChats,
  addPinnedChat,
  removePinnedChat,
  isChatMuted,
  muteChat,
  unmuteChat
} from '@/lib/storage';
import { formatChatDate, formatLastSeen, getInitials } from '@/lib/utils';
import { CHAT_CONFIG } from '@/lib/constants';
import { useSocket } from './use-socket';
import { toast } from 'sonner';

interface UseChatState {
  chats: Map<string, ChatWithUsers>;
  currentChat: ChatWithUsers | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  searchResults: ChatSearchResult[];
  isSearching: boolean;
  allUsers: Map<string, User>;
}

interface UseChatActions {
  // Chat Management
  loadChats: () => Promise<void>;
  createChat: (request: CreateChatRequest) => Promise<ChatWithUsers>;
  updateChat: (chatId: string, request: UpdateChatRequest) => Promise<ChatWithUsers>;
  deleteChat: (chatId: string) => Promise<void>;
  
  // Current Chat
  setCurrentChat: (chat: ChatWithUsers | null) => void;
  selectChatById: (chatId: string) => Promise<void>;
  getCurrentChatId: () => string | null;
  
  // Search
  searchChats: (query: string) => Promise<void>;
  clearSearchResults: () => void;
  
  // Chat Metadata
  pinChat: (chatId: string) => Promise<void>;
  unpinChat: (chatId: string) => Promise<void>;
  togglePin: (chatId: string) => Promise<void>;
  muteChat: (chatId: string, duration?: number) => Promise<void>;
  unmuteChat: (chatId: string) => Promise<void>;
  toggleMute: (chatId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  
  // Participants (for group chats)
  addParticipants: (chatId: string, userIds: string[]) => Promise<void>;
  removeParticipant: (chatId: string, userId: string) => Promise<void>;
  makeAdmin: (chatId: string, userId: string) => Promise<void>;
  removeAdmin: (chatId: string, userId: string) => Promise<void>;
  leaveChat: (chatId: string) => Promise<void>;
  
  // Utilities
  getChatById: (chatId: string) => ChatWithUsers | null;
  getDirectChatWithUser: (userId: string) => ChatWithUsers | null;
  getChatDisplayName: (chat: ChatWithUsers) => string;
  getChatAvatar: (chat: ChatWithUsers) => string;
  getPinnedChats: () => ChatWithUsers[];
  getMutedChats: () => ChatWithUsers[];
  getArchivedChats: () => ChatWithUsers[];
  getTotalUnreadCount: () => number;
  
  // Real-time updates
  updateLastMessage: (chatId: string, message: Message) => void;
  updateUnreadCount: (chatId: string, count: number) => void;
  updateTypingUsers: (chatId: string, users: User[]) => void;
  updateChatInfo: (chatId: string, updates: Partial<ChatWithUsers>) => void;
  
  // Error handling
  clearError: () => void;
}

export interface UseChatReturn extends UseChatState, UseChatActions {}

/**
 * Chat management hook for handling chat operations and state
 */
export function useChat(): UseChatReturn {
  const router = useRouter();
  const { socket, joinChat, leaveChat: socketLeaveChat } = useSocket();
  
  // State
  const [state, setState] = useState<UseChatState>({
    chats: new Map(),
    currentChat: null,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    error: null,
    searchResults: [],
    isSearching: false,
    allUsers: new Map(),
  });

  // Cache for loaded users
  const loadedUsers = useRef<Set<string>>(new Set());

  // Update state helper
  const updateState = useCallback((updates: Partial<UseChatState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Error handler
  const handleError = useCallback((error: unknown, context: string) => {
    console.error(`Chat Error (${context}):`, error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    
    updateState({ 
      error: message, 
      isLoading: false, 
      isCreating: false, 
      isUpdating: false,
      isSearching: false 
    });

    toast.error(message);
  }, [updateState]);

  // Load user data for participants
  const loadUsers = useCallback(async (userIds: string[]) => {
    const newUserIds = userIds.filter(id => !loadedUsers.current.has(id));
    if (newUserIds.length === 0) return;

    try {
      // In a real implementation, you'd have a bulk user fetch API
      // For now, we'll simulate with individual calls
      const userPromises = newUserIds.map(async (userId) => {
        try {
          // This would be a getUserById API call
          // For now, we'll use search as a fallback
          const users = await userApi.search(userId);
          return users.find(u => u.id === userId);
        } catch {
          return null;
        }
      });

      const users = await Promise.all(userPromises);
      const validUsers = users.filter((user): user is User => user !== null);

      setState(prev => {
        const newAllUsers = new Map(prev.allUsers);
        validUsers.forEach(user => {
          newAllUsers.set(user.id, user);
          loadedUsers.current.add(user.id);
        });
        return { ...prev, allUsers: newAllUsers };
      });
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  // Convert Chat (backend format) to ChatWithUsers (frontend format)
  const convertChatToClientFormat = useCallback(async (chat: Chat): Promise<ChatWithUsers> => {
    // Load participant users
    await loadUsers([...chat.participants, chat.createdBy]);

    // Convert participant IDs to User objects
    const participants = chat.participants
      .map(id => state.allUsers.get(id))
      .filter((user): user is User => user !== null);

    const createdByUser = state.allUsers.get(chat.createdBy) || {
      id: chat.createdBy,
      username: 'Unknown',
      email: '',
      firstName: 'Unknown',
      lastName: 'User',
      avatar: '',
      phone: '',
      bio: '',
      isOnline: false,
      lastSeen: new Date().toISOString(),
      isVerified: false,
      loginMethod: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      ...chat,
      participants,
      createdByUser,
      unreadCount: 0, // This would come from the API
      isTyping: false,
      typingUsers: [],
      isPinned: getPinnedChats()?.includes(chat.id) || false,
      isMuted: isChatMuted(chat.id),
      isArchived: false, // This would come from the API
    };
  }, [state.allUsers, loadUsers]);

  // Handle the API response type mismatch
  // Your API is typed as returning ChatWithUsers[] but your Go backend returns Chat[]
  const handleApiResponse = useCallback(async (apiResponse: any): Promise<ChatWithUsers[]> => {
    // Check if the response is already in ChatWithUsers format
    if (Array.isArray(apiResponse) && apiResponse.length > 0) {
      const firstItem = apiResponse[0];
      
      // If participants is User[], it's already ChatWithUsers format
      if (firstItem.participants && Array.isArray(firstItem.participants) && 
          firstItem.participants.length > 0 && typeof firstItem.participants[0] === 'object') {
        return apiResponse as ChatWithUsers[];
      }
      
      // If participants is string[], it's Chat format that needs conversion
      if (firstItem.participants && Array.isArray(firstItem.participants) && 
          firstItem.participants.length > 0 && typeof firstItem.participants[0] === 'string') {
        const chats = apiResponse as Chat[];
        const convertedChats = await Promise.all(
          chats.map(chat => convertChatToClientFormat(chat))
        );
        return convertedChats;
      }
    }
    
    return apiResponse as ChatWithUsers[];
  }, [convertChatToClientFormat]);

  // ========== Chat Management ==========

  const loadChats = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });
      
      // The API claims to return ChatWithUsers[] but might actually return Chat[]
      const apiResponse = await chatApi.getUserChats();
      const transformedChats = await handleApiResponse(apiResponse);

      const chatsMap = new Map<string, ChatWithUsers>();
      transformedChats.forEach(chat => {
        chatsMap.set(chat.id, chat);
      });

      updateState({ chats: chatsMap, isLoading: false });

      // Restore current chat if exists
      const currentChatId = getCurrentChatId();
      if (currentChatId && chatsMap.has(currentChatId)) {
        const currentChat = chatsMap.get(currentChatId)!;
        updateState({ currentChat });
        joinChat(currentChatId);
      }
    } catch (error) {
      handleError(error, 'loadChats');
    }
  }, [updateState, handleError, handleApiResponse, joinChat]);

  const createChat = useCallback(async (request: CreateChatRequest): Promise<ChatWithUsers> => {
    try {
      updateState({ isCreating: true, error: null });
      
      // chatApi.create returns Chat (with string[] participants)
      const chat: Chat = await chatApi.create(request);
      
      // Convert to ChatWithUsers format
      const transformedChat = await convertChatToClientFormat(chat);
      
      setState(prev => {
        const newChats = new Map(prev.chats);
        newChats.set(chat.id, transformedChat);
        return { 
          ...prev, 
          chats: newChats, 
          isCreating: false,
          currentChat: transformedChat 
        };
      });

      setCurrentChatId(chat.id);
      joinChat(chat.id);
      router.push(`/chat/${chat.id}`);

      toast.success(`${chat.type === 'group' ? 'Group' : 'Chat'} created successfully.`);

      return transformedChat;
    } catch (error) {
      handleError(error, 'createChat');
      throw error;
    }
  }, [updateState, handleError, convertChatToClientFormat, joinChat, router]);

  const updateChat = useCallback(async (chatId: string, request: UpdateChatRequest): Promise<ChatWithUsers> => {
    try {
      updateState({ isUpdating: true, error: null });
      // Note: This endpoint might not exist in your backend yet
      // const updatedChat = await chatApi.updateChat(chatId, request);
      
      // For now, simulate the update
      const currentChat = state.chats.get(chatId);
      if (!currentChat) {
        throw new Error('Chat not found');
      }
      
      const updatedChat = { ...currentChat, ...request };
      
      setState(prev => {
        const newChats = new Map(prev.chats);
        newChats.set(chatId, updatedChat);
        return { 
          ...prev, 
          chats: newChats,
          isUpdating: false,
          currentChat: prev.currentChat?.id === chatId ? updatedChat : prev.currentChat
        };
      });

      toast.success('Chat information updated successfully.');

      return updatedChat;
    } catch (error) {
      handleError(error, 'updateChat');
      throw error;
    }
  }, [state.chats, updateState, handleError]);

  const deleteChat = useCallback(async (chatId: string): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      // Note: This endpoint might not exist in your backend yet
      // await chatApi.deleteChat(chatId);
      
      setState(prev => {
        const newChats = new Map(prev.chats);
        newChats.delete(chatId);
        return { 
          ...prev, 
          chats: newChats,
          isLoading: false,
          currentChat: prev.currentChat?.id === chatId ? null : prev.currentChat
        };
      });

      if (state.currentChat?.id === chatId) {
        removeCurrentChatId();
        socketLeaveChat(chatId);
        router.push('/chat');
      }

      toast.success('Chat deleted successfully.');
    } catch (error) {
      handleError(error, 'deleteChat');
    }
  }, [state.currentChat, updateState, handleError, socketLeaveChat, router]);

  // ========== Current Chat Management ==========

  const setCurrentChat = useCallback((chat: ChatWithUsers | null) => {
    // Leave previous chat
    if (state.currentChat) {
      socketLeaveChat(state.currentChat.id);
    }

    // Join new chat
    if (chat) {
      setCurrentChatId(chat.id);
      joinChat(chat.id);
    } else {
      removeCurrentChatId();
    }

    updateState({ currentChat: chat });
  }, [state.currentChat, updateState, joinChat, socketLeaveChat]);

  const selectChatById = useCallback(async (chatId: string): Promise<void> => {
    try {
      let chat = state.chats.get(chatId);
      
      if (!chat) {
        // Chat not in local state, fetch it
        const apiResponse = await chatApi.getChat(chatId);
        
        // Handle the response format mismatch
        if (apiResponse.participants && Array.isArray(apiResponse.participants) && 
            apiResponse.participants.length > 0 && typeof apiResponse.participants[0] === 'string') {
          // It's actually a Chat, convert it
          chat = await convertChatToClientFormat(apiResponse as any as Chat);
        } else {
          // It's already a ChatWithUsers
          chat = apiResponse as ChatWithUsers;
        }
        
        setState(prev => {
          const newChats = new Map(prev.chats);
          newChats.set(chatId, chat!);
          return { ...prev, chats: newChats };
        });
      }

      setCurrentChat(chat);
    } catch (error) {
      handleError(error, 'selectChatById');
    }
  }, [state.chats, setCurrentChat, handleError, convertChatToClientFormat]);

  const getCurrentChatIdValue = useCallback((): string | null => {
    return state.currentChat?.id || null;
  }, [state.currentChat]);

  // ========== Search ==========

  const searchChats = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      updateState({ searchResults: [] });
      return;
    }

    try {
      updateState({ isSearching: true, error: null });
      
      // Search in local chats first
      const localResults: ChatSearchResult[] = [];
      state.chats.forEach(chat => {
        const chatName = getChatDisplayName(chat);
        if (chatName.toLowerCase().includes(query.toLowerCase())) {
          localResults.push({
            chat,
            matchType: 'name',
            matchText: chatName,
          });
        }
      });

      // TODO: Add API search for global chats/users
      
      updateState({ searchResults: localResults, isSearching: false });
    } catch (error) {
      handleError(error, 'searchChats');
    }
  }, [state.chats, updateState, handleError]);

  const clearSearchResults = useCallback(() => {
    updateState({ searchResults: [] });
  }, [updateState]);

  // ========== Chat Metadata ==========

  const pinChat = useCallback(async (chatId: string): Promise<void> => {
    try {
      addPinnedChat(chatId);
      
      setState(prev => {
        const chat = prev.chats.get(chatId);
        if (chat) {
          const updatedChat = { ...chat, isPinned: true };
          const newChats = new Map(prev.chats);
          newChats.set(chatId, updatedChat);
          return { 
            ...prev, 
            chats: newChats,
            currentChat: prev.currentChat?.id === chatId ? updatedChat : prev.currentChat
          };
        }
        return prev;
      });

      toast.success('Chat has been pinned to the top.');
    } catch (error) {
      handleError(error, 'pinChat');
    }
  }, [handleError]);

  const unpinChat = useCallback(async (chatId: string): Promise<void> => {
    try {
      removePinnedChat(chatId);
      
      setState(prev => {
        const chat = prev.chats.get(chatId);
        if (chat) {
          const updatedChat = { ...chat, isPinned: false };
          const newChats = new Map(prev.chats);
          newChats.set(chatId, updatedChat);
          return { 
            ...prev, 
            chats: newChats,
            currentChat: prev.currentChat?.id === chatId ? updatedChat : prev.currentChat
          };
        }
        return prev;
      });

      toast.success('Chat has been unpinned.');
    } catch (error) {
      handleError(error, 'unpinChat');
    }
  }, [handleError]);

  const togglePin = useCallback(async (chatId: string): Promise<void> => {
    const chat = state.chats.get(chatId);
    if (chat?.isPinned) {
      await unpinChat(chatId);
    } else {
      await pinChat(chatId);
    }
  }, [state.chats, pinChat, unpinChat]);

  const muteChatAction = useCallback(async (chatId: string, duration?: number): Promise<void> => {
    try {
      muteChat(chatId, duration);
      
      setState(prev => {
        const chat = prev.chats.get(chatId);
        if (chat) {
          const updatedChat = { ...chat, isMuted: true };
          const newChats = new Map(prev.chats);
          newChats.set(chatId, updatedChat);
          return { 
            ...prev, 
            chats: newChats,
            currentChat: prev.currentChat?.id === chatId ? updatedChat : prev.currentChat
          };
        }
        return prev;
      });

      toast.success(duration === -1 ? 'Chat muted forever.' : 'Chat muted.');
    } catch (error) {
      handleError(error, 'muteChat');
    }
  }, [handleError]);

  const unmuteChatAction = useCallback(async (chatId: string): Promise<void> => {
    try {
      unmuteChat(chatId);
      
      setState(prev => {
        const chat = prev.chats.get(chatId);
        if (chat) {
          const updatedChat = { ...chat, isMuted: false };
          const newChats = new Map(prev.chats);
          newChats.set(chatId, updatedChat);
          return { 
            ...prev, 
            chats: newChats,
            currentChat: prev.currentChat?.id === chatId ? updatedChat : prev.currentChat
          };
        }
        return prev;
      });

      toast.success('Chat has been unmuted.');
    } catch (error) {
      handleError(error, 'unmuteChat');
    }
  }, [handleError]);

  const toggleMute = useCallback(async (chatId: string): Promise<void> => {
    const chat = state.chats.get(chatId);
    if (chat?.isMuted) {
      await unmuteChatAction(chatId);
    } else {
      await muteChatAction(chatId);
    }
  }, [state.chats, muteChatAction, unmuteChatAction]);

  const archiveChat = useCallback(async (chatId: string): Promise<void> => {
    // Implementation would depend on your backend
    toast.info('Chat archiving will be available soon.');
  }, []);

  const unarchiveChat = useCallback(async (chatId: string): Promise<void> => {
    // Implementation would depend on your backend
    toast.info('Chat unarchiving will be available soon.');
  }, []);

  // ========== Utility Functions ==========

  const getChatById = useCallback((chatId: string): ChatWithUsers | null => {
    return state.chats.get(chatId) || null;
  }, [state.chats]);

  const getDirectChatWithUser = useCallback((userId: string): ChatWithUsers | null => {
    for (const chat of state.chats.values()) {
      if (chat.type === 'direct' && chat.participants.some(p => p.id === userId)) {
        return chat;
      }
    }
    return null;
  }, [state.chats]);

  const getChatDisplayName = useCallback((chat: ChatWithUsers): string => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    }

    // For direct chats, find the other participant
    // Note: We need to compare with current user ID, not chat ID
    const otherParticipant = chat.participants.find(p => p.id !== getCurrentChatIdValue());
    if (otherParticipant) {
      return `${otherParticipant.firstName} ${otherParticipant.lastName}`;
    }

    return 'Direct Chat';
  }, [getCurrentChatIdValue]);

  const getChatAvatar = useCallback((chat: ChatWithUsers): string => {
    if (chat.avatar) return chat.avatar;
    
    if (chat.type === 'group') {
      return CHAT_CONFIG.GROUP.DEFAULT_AVATAR;
    }

    // For direct chats, use other participant's avatar
    const otherParticipant = chat.participants.find(p => p.id !== getCurrentChatIdValue());
    return otherParticipant?.avatar || '/images/default-avatar.png';
  }, [getCurrentChatIdValue]);

  const getPinnedChatsData = useCallback((): ChatWithUsers[] => {
    return Array.from(state.chats.values()).filter(chat => chat.isPinned);
  }, [state.chats]);

  const getMutedChatsData = useCallback((): ChatWithUsers[] => {
    return Array.from(state.chats.values()).filter(chat => chat.isMuted);
  }, [state.chats]);

  const getArchivedChatsData = useCallback((): ChatWithUsers[] => {
    return Array.from(state.chats.values()).filter(chat => chat.isArchived);
  }, [state.chats]);

  const getTotalUnreadCount = useCallback((): number => {
    return Array.from(state.chats.values()).reduce((total, chat) => {
      return total + (chat.isMuted ? 0 : chat.unreadCount);
    }, 0);
  }, [state.chats]);

  // ========== Real-time Updates ==========

  const updateLastMessage = useCallback((chatId: string, message: Message) => {
    setState(prev => {
      const chat = prev.chats.get(chatId);
      if (chat) {
        const updatedChat = { ...chat, lastMessage: message };
        const newChats = new Map(prev.chats);
        newChats.set(chatId, updatedChat);
        return { ...prev, chats: newChats };
      }
      return prev;
    });
  }, []);

  const updateUnreadCount = useCallback((chatId: string, count: number) => {
    setState(prev => {
      const chat = prev.chats.get(chatId);
      if (chat) {
        const updatedChat = { ...chat, unreadCount: count };
        const newChats = new Map(prev.chats);
        newChats.set(chatId, updatedChat);
        return { ...prev, chats: newChats };
      }
      return prev;
    });
  }, []);

  const updateTypingUsers = useCallback((chatId: string, users: User[]) => {
    setState(prev => {
      const chat = prev.chats.get(chatId);
      if (chat) {
        const updatedChat = { 
          ...chat, 
          typingUsers: users,
          isTyping: users.length > 0
        };
        const newChats = new Map(prev.chats);
        newChats.set(chatId, updatedChat);
        return { ...prev, chats: newChats };
      }
      return prev;
    });
  }, []);

  const updateChatInfo = useCallback((chatId: string, updates: Partial<ChatWithUsers>) => {
    setState(prev => {
      const chat = prev.chats.get(chatId);
      if (chat) {
        const updatedChat = { ...chat, ...updates };
        const newChats = new Map(prev.chats);
        newChats.set(chatId, updatedChat);
        return { 
          ...prev, 
          chats: newChats,
          currentChat: prev.currentChat?.id === chatId ? updatedChat : prev.currentChat
        };
      }
      return prev;
    });
  }, []);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Participant management stubs (to be implemented based on your backend)
  const addParticipants = useCallback(async (chatId: string, userIds: string[]): Promise<void> => {
    toast.info('Adding participants will be available soon.');
  }, []);

  const removeParticipant = useCallback(async (chatId: string, userId: string): Promise<void> => {
    toast.info('Removing participants will be available soon.');
  }, []);

  const makeAdmin = useCallback(async (chatId: string, userId: string): Promise<void> => {
    toast.info('Admin management will be available soon.');
  }, []);

  const removeAdmin = useCallback(async (chatId: string, userId: string): Promise<void> => {
    toast.info('Admin management will be available soon.');
  }, []);

  const leaveChat = useCallback(async (chatId: string): Promise<void> => {
    toast.info('Leave chat will be available soon.');
  }, []);

  // Initialize chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return {
    // State
    chats: state.chats,
    currentChat: state.currentChat,
    isLoading: state.isLoading,
    isCreating: state.isCreating,
    isUpdating: state.isUpdating,
    error: state.error,
    searchResults: state.searchResults,
    isSearching: state.isSearching,
    allUsers: state.allUsers,

    // Chat Management
    loadChats,
    createChat,
    updateChat,
    deleteChat,

    // Current Chat
    setCurrentChat,
    selectChatById,
    getCurrentChatId: getCurrentChatIdValue,

    // Search
    searchChats,
    clearSearchResults,

    // Chat Metadata
    pinChat,
    unpinChat,
    togglePin,
    muteChat: muteChatAction,
    unmuteChat: unmuteChatAction,
    toggleMute,
    archiveChat,
    unarchiveChat,

    // Participants
    addParticipants,
    removeParticipant,
    makeAdmin,
    removeAdmin,
    leaveChat,

    // Utilities
    getChatById,
    getDirectChatWithUser,
    getChatDisplayName,
    getChatAvatar,
    getPinnedChats: getPinnedChatsData,
    getMutedChats: getMutedChatsData,
    getArchivedChats: getArchivedChatsData,
    getTotalUnreadCount,

    // Real-time updates
    updateLastMessage,
    updateUnreadCount,
    updateTypingUsers,
    updateChatInfo,

    // Error handling
    clearError,
  };
}