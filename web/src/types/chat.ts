// src/types/chat.ts
import type { User } from './user';
import type { Message } from './message';

// Chat types (matches Go backend)
export type ChatType = 'direct' | 'group';

// Main Chat entity
export interface Chat {
  id: string;
  type: ChatType;
  name?: string;
  description?: string;
  avatar?: string;
  participants: string[]; // User IDs
  createdBy: string;
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;

  owner?: string;
  admins?: string[];
  settings?: {
    whoCanSendMessages: 'everyone' | 'admins';
    whoCanEditInfo: 'everyone' | 'admins';
    whoCanAddMembers: 'everyone' | 'admins';
    disappearingMessages: boolean;
    disappearingTime?: number;
  };
  isPinned: boolean;
  isMuted: boolean;
  mutedUntil?: string;
  isArchived: boolean;
}

// Extended chat with populated user data
export interface ChatWithUsers {
  id: string;
  type: ChatType;
  name?: string;
  description?: string;
  avatar?: string;
  participants: User[];
  createdBy: string;
  createdByUser: User;
  lastMessage?: Message;
  unreadCount: number;
  isTyping: boolean;
  typingUsers: User[];
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Chat creation request
export interface CreateChatRequest {
  type: ChatType;
  name?: string;
  description?: string;
  participants: string[]; // User IDs
}

// Chat update request
export interface UpdateChatRequest {
  name?: string;
  description?: string;
  avatar?: string;
}

// Group chat specific types
export interface GroupChat extends Chat {
  type: 'group';
  name: string;
  admins: string[]; // User IDs with admin permissions
  settings: GroupSettings;
}

export interface GroupSettings {
  whoCanSendMessages: 'everyone' | 'admins';
  whoCanEditInfo: 'everyone' | 'admins';
  whoCanAddMembers: 'everyone' | 'admins';
  disappearingMessages: boolean;
  disappearingTime?: number; // in seconds
}

// Direct chat specific types
export interface DirectChat extends Chat {
  type: 'direct';
  otherParticipant: User;
}

// Chat participant with role
export interface ChatParticipant {
  user: User;
  role: 'member' | 'admin' | 'owner';
  joinedAt: string;
  addedBy?: string;
}

// Chat list item (for sidebar)
export interface ChatListItem {
  chat: ChatWithUsers;
  lastMessagePreview: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean; // For direct chats
  isTyping: boolean;
  isPinned: boolean;
  isMuted: boolean;
}

// Chat status
export type ChatStatus = 'active' | 'archived' | 'deleted';

// Chat metadata
export interface ChatMetadata {
  id: string;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  mutedUntil?: string;
  customWallpaper?: string;
  customNotificationSound?: string;
  lastReadMessageId?: string;
  lastReadAt?: string;
}

// Chat search result
export interface ChatSearchResult {
  chat: ChatWithUsers;
  matchType: 'name' | 'participant' | 'message';
  matchText?: string;
  messageMatch?: Message;
}

// Chat statistics
export interface ChatStats {
  chatId: string;
  totalMessages: number;
  mediaMessages: number;
  textMessages: number;
  participantCount: number;
  lastActivity: string;
  createdAt: string;
}

// Chat context types
export interface ChatContextType {
  // Current chat state
  currentChat: ChatWithUsers | null;
  chats: ChatWithUsers[];
  isLoading: boolean;
  
  // Chat management
  createChat: (request: CreateChatRequest) => Promise<Chat>;
  updateChat: (chatId: string, request: UpdateChatRequest) => Promise<Chat>;
  deleteChat: (chatId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  
  // Current chat
  setCurrentChat: (chat: ChatWithUsers | null) => void;
  getCurrentChat: () => ChatWithUsers | null;
  
  // Chat list
  loadChats: () => Promise<void>;
  searchChats: (query: string) => Promise<ChatSearchResult[]>;
  
  // Participants
  addParticipants: (chatId: string, userIds: string[]) => Promise<void>;
  removeParticipant: (chatId: string, userId: string) => Promise<void>;
  makeAdmin: (chatId: string, userId: string) => Promise<void>;
  removeAdmin: (chatId: string, userId: string) => Promise<void>;
  
  // Chat metadata
  pinChat: (chatId: string) => Promise<void>;
  unpinChat: (chatId: string) => Promise<void>;
  muteChat: (chatId: string, duration?: number) => Promise<void>;
  unmuteChat: (chatId: string) => Promise<void>;
  
  // Typing indicators
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  setTypingUsers: (chatId: string, users: User[]) => void;
  
  // Unread management
  markAsRead: (chatId: string) => Promise<void>;
  updateUnreadCount: (chatId: string, count: number) => void;
}

// Chat store types (for Zustand)
export interface ChatStore {
  // State
  currentChat: ChatWithUsers | null;
  chats: Map<string, ChatWithUsers>;
  chatMetadata: Map<string, ChatMetadata>;
  isLoading: boolean;
  
  // Actions
  setCurrentChat: (chat: ChatWithUsers | null) => void;
  addChat: (chat: ChatWithUsers) => void;
  updateChat: (chatId: string, updates: Partial<ChatWithUsers>) => void;
  removeChat: (chatId: string) => void;
  
  // Metadata actions
  setChatMetadata: (chatId: string, metadata: Partial<ChatMetadata>) => void;
  pinChat: (chatId: string) => void;
  unpinChat: (chatId: string) => void;
  muteChat: (chatId: string, until?: string) => void;
  unmuteChat: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
  unarchiveChat: (chatId: string) => void;
  
  // Typing actions
  setTypingUsers: (chatId: string, users: User[]) => void;
  addTypingUser: (chatId: string, user: User) => void;
  removeTypingUser: (chatId: string, userId: string) => void;
  
  // Unread actions
  setUnreadCount: (chatId: string, count: number) => void;
  incrementUnreadCount: (chatId: string) => void;
  clearUnreadCount: (chatId: string) => void;
  
  // Utility actions
  getChatById: (id: string) => ChatWithUsers | undefined;
  getDirectChatWithUser: (userId: string) => ChatWithUsers | undefined;
  getPinnedChats: () => ChatWithUsers[];
  getMutedChats: () => ChatWithUsers[];
  getArchivedChats: () => ChatWithUsers[];
  getTotalUnreadCount: () => number;
  clearChats: () => void;
}

// Chat form data
export interface ChatFormData {
  type: ChatType;
  name?: string;
  description?: string;
  participants: User[];
  avatar?: File | string;
}

// Group management types
export interface GroupMember {
  user: User;
  role: 'member' | 'admin' | 'owner';
  joinedAt: string;
  addedBy?: User;
}

export interface GroupInfo {
  chat: GroupChat;
  members: GroupMember[];
  pendingInvites: User[];
  admins: User[];
  owner: User;
  settings: GroupSettings;
}

// Chat invitation
export interface ChatInvitation {
  id: string;
  chatId: string;
  chat: Chat;
  invitedBy: User;
  invitedUser: User;
  expiresAt?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}

// Constants
export const CHAT_CONSTANTS = {
  GROUP_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 25,
  },
  GROUP_DESCRIPTION: {
    MAX_LENGTH: 512,
  },
  MAX_PARTICIPANTS: {
    GROUP: 256,
    BROADCAST: 256,
  },
  TYPING_TIMEOUT: 3000, // 3 seconds
  MUTE_DURATIONS: {
    '8_HOURS': 8 * 60 * 60 * 1000,
    '1_WEEK': 7 * 24 * 60 * 60 * 1000,
    'FOREVER': -1,
  },
} as const;

// Helper types
export type ChatField = keyof Chat;
export type ChatUpdateField = keyof UpdateChatRequest;
export type ChatRole = 'member' | 'admin' | 'owner';