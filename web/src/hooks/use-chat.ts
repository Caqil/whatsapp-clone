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
  createChat: (request: CreateChatRequest) => Promise<Chat>;
  updateChat: (chatId: string, request: UpdateChatRequest) => Promise<Chat>;
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
  }, [updateState, toast]);

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

  // Transform chat data and load missing users
  const transformChatData = useCallback(async (chats: Chat[]): Promise<ChatWithUsers[]> => {
    // Collect all participant IDs
    const allParticipantIds = new Set<string>();
    chats.forEach(chat => {
      chat.participants.forEach(id => allParticipantIds.add(id));
      allParticipantIds.add(chat.createdBy);
    });

    // Load missing users
    await loadUsers(Array.from(allParticipantIds));

    // Transform chats with user data
    return chats.map(chat => {
      const participants = chat.participants
        .map(id => state.allUsers.get(id))
        .filter((user): user is User => user !== null);

      const createdByUser = state.allUsers.get(chat.createdBy);

      return {
        ...chat,
        participants,
        createdByUser: createdByUser || {
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
        },
        unreadCount: 0, // This would come from the API
        isTyping: false,
        typingUsers: [],
        isPinned: getPinnedChats()?.includes(chat.id) || false,
        isMuted: isChatMuted(chat.id),
        isArchived: false, // This would come from the API
      } as ChatWithUsers;
    });
  }, [state.allUsers, loadUsers]);

  // ========== Chat Management ==========

  const loadChats = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });
      const chatsData = await chatApi.getUserChats();
      const transformedChats = await transformChatData(chatsData);

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
  }, [updateState, handleError, transformChatData, joinChat]);

  const createChat = useCallback(async (request: CreateChatRequest): Promise<Chat> => {
    try {
      updateState({ isCreating: true, error: null });
      const chat = await chatApi.create(request);
      
      // Transform and add to state
      const transformedChats = await transformChatData([chat]);
      const transformedChat = transformedChats[0];
      
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

      toast({
        title: 'Chat created',
        description: `${chat.type === 'group' ? 'Group' : 'Chat'} created successfully.`,
        variant: 'default',
      });

      return chat;
    } catch (error) {
      handleError(error, 'createChat');
      throw error;
    }
  }, [updateState, handleError, transformChatData, joinChat, router, toast]);

  const updateChat = useCallback(async (chatId: string, request: UpdateChatRequest): Promise<Chat> => {
    try {
      updateState({ isUpdating: true, error: null });
      // Note: This endpoint might not exist in your backend yet
      // const updatedChat = await chatApi.updateChat(chatId, request);
      
      // For now, simulate the update
      const updatedChat = { ...state.chats.get(chatId)!, ...request };
      
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

      toast({
        title: 'Chat updated',
        description: 'Chat information updated successfully.',
        variant: 'default',
      });

      return updatedChat as Chat;
    } catch (error) {
      handleError(error, 'updateChat');
      throw error;
    }
  }, [state.chats, updateState, handleError, toast]);

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

      toast({
        title: 'Chat deleted',
        description: 'Chat deleted successfully.',
        variant: 'default',
      });
    } catch (error) {
      handleError(error, 'deleteChat');
    }
  }, [state.currentChat, updateState, handleError, socketLeaveChat, router, toast]);

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
        const chatData = await chatApi.getChat(chatId);
        const transformedChats = await transformChatData([chatData]);
        chat = transformedChats[0];
        
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
  }, [state.chats, setCurrentChat, handleError, transformChatData]);

  const getCurrentChatId = useCallback((): string | null => {
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

      toast({
        title: 'Chat pinned',
        description: 'Chat has been pinned to the top.',
        variant: 'default',
      });
    } catch (error) {
      handleError(error, 'pinChat');
    }
  }, [handleError, toast]);

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

      toast({
        title: 'Chat unpinned',
        description: 'Chat has been unpinned.',
        variant: 'default',
      });
    } catch (error) {
      handleError(error, 'unpinChat');
    }
  }, [handleError, toast]);

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

      toast({
        title: 'Chat muted',
        description: duration === -1 ? 'Chat muted forever.' : 'Chat muted.',
        variant: 'default',
      });
    } catch (error) {
      handleError(error, 'muteChat');
    }
  }, [handleError, toast]);

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

      toast({
        title: 'Chat unmuted',
        description: 'Chat has been unmuted.',
        variant: 'default',
      });
    } catch (error) {
      handleError(error, 'unmuteChat');
    }
  }, [handleError, toast]);

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
    toast({
      title: 'Feature coming soon',
      description: 'Chat archiving will be available soon.',
      variant: 'default',
    });
  }, [toast]);

  const unarchiveChat = useCallback(async (chatId: string): Promise<void> => {
    // Implementation would depend on your backend
    toast({
      title: 'Feature coming soon',
      description: 'Chat unarchiving will be available soon.',
      variant: 'default',
    });
  }, [toast]);

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
    const otherParticipant = chat.participants.find(p => p.id !== getCurrentChatId());
    if (otherParticipant) {
      return `${otherParticipant.firstName} ${otherParticipant.lastName}`;
    }

    return 'Direct Chat';
  }, []);

  const getChatAvatar = useCallback((chat: ChatWithUsers): string => {
    if (chat.avatar) return chat.avatar;
    
    if (chat.type === 'group') {
      return CHAT_CONFIG.GROUP.DEFAULT_AVATAR;
    }

    // For direct chats, use other participant's avatar
    const otherParticipant = chat.participants.find(p => p.id !== getCurrentChatId());
    return otherParticipant?.avatar || '/images/default-avatar.png';
  }, []);

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
    toast({
      title: 'Feature coming soon',
      description: 'Adding participants will be available soon.',
      variant: 'default',
    });
  }, [toast]);

  const removeParticipant = useCallback(async (chatId: string, userId: string): Promise<void> => {
    toast({
      title: 'Feature coming soon',
      description: 'Removing participants will be available soon.',
      variant: 'default',
    });
  }, [toast]);

  const makeAdmin = useCallback(async (chatId: string, userId: string): Promise<void> => {
    toast({
      title: 'Feature coming soon',
      description: 'Admin management will be available soon.',
      variant: 'default',
    });
  }, [toast]);

  const removeAdmin = useCallback(async (chatId: string, userId: string): Promise<void> => {
    toast({
      title: 'Feature coming soon',
      description: 'Admin management will be available soon.',
      variant: 'default',
    });
  }, [toast]);

  const leaveChat = useCallback(async (chatId: string): Promise<void> => {
    toast({
      title: 'Feature coming soon',
      description: 'Leave chat will be available soon.',
      variant: 'default',
    });
  }, [toast]);

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
    getCurrentChatId,

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