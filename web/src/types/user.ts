export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
  phone: string;
  bio: string;
  isOnline: boolean;
  lastSeen: string;
  isVerified: boolean;
  verifiedAt?: string;
  loginMethod: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// User profile update request
export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  username?: string;
}

// User search response
export interface UserSearchResponse {
  users: User[];
  total: number;
}

// User status types
export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

// Extended user info (for UI purposes)
export interface UserWithStatus extends User {
  status: UserStatus;
  isTyping?: boolean;
  lastSeenText?: string; // Formatted last seen text
}

// User contact info
export interface UserContact {
  id: string;
  userId: string;
  contactUserId: string;
  contactUser: User;
  nickname?: string;
  isFavorite: boolean;
  isBlocked: boolean;
  addedAt: string;
  updatedAt: string;
}

// User preferences
export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    messages: boolean;
    sounds: boolean;
    desktop: boolean;
    preview: boolean;
  };
  privacy: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    about: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
  };
  chat: {
    enterToSend: boolean;
    fontSize: 'small' | 'medium' | 'large';
    wallpaper?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// User activity
export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

// User profile view model (for components)
export interface UserProfile {
  user: User;
  preferences?: UserPreferences;
  isContact?: boolean;
  isFavorite?: boolean;
  isBlocked?: boolean;
  mutualContacts?: User[];
  commonGroups?: number;
}

// User form data
export interface UserFormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar?: File | string;
}

// User validation schemas (for Zod)
export interface UserValidation {
  username: {
    min: number;
    max: number;
    pattern: RegExp;
  };
  email: {
    pattern: RegExp;
  };
  name: {
    min: number;
    max: number;
  };
  bio: {
    max: number;
  };
  phone: {
    pattern?: RegExp;
  };
}

// User avatar upload
export interface AvatarUpload {
  file: File;
  preview: string;
  isUploading: boolean;
  progress: number;
}

// User online status
export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
  device?: string;
}

// User typing status
export interface TypingStatus {
  userId: string;
  chatId: string;
  isTyping: boolean;
  startedAt?: string;
}

// User context types (for React context)
export interface UserContextType {
  currentUser: User | null;
  users: Map<string, User>;
  onlineUsers: Set<string>;
  typingUsers: Map<string, TypingStatus>;
  
  // User management
  updateProfile: (data: UserUpdateRequest) => Promise<User>;
  uploadAvatar: (file: File) => Promise<string>;
  searchUsers: (query: string) => Promise<User[]>;
  getUserById: (id: string) => User | null;
  
  // Status management
  setUserOnline: (userId: string, isOnline: boolean) => void;
  setUserTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  updateLastSeen: (userId: string, lastSeen: string) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<UserPreferences>;
  getPreferences: () => UserPreferences | null;
}

// User store types (for Zustand)
export interface UserStore {
  // State
  currentUser: User | null;
  users: Map<string, User>;
  onlineUsers: Set<string>;
  typingUsers: Map<string, TypingStatus>;
  preferences: UserPreferences | null;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  addUser: (user: User) => void;
  addUsers: (users: User[]) => void;
  removeUser: (userId: string) => void;
  
  // Status actions
  setOnlineStatus: (userId: string, isOnline: boolean) => void;
  setTypingStatus: (chatId: string, userId: string, isTyping: boolean) => void;
  updateLastSeen: (userId: string, lastSeen: string) => void;
  
  // Preferences actions
  setPreferences: (preferences: UserPreferences) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  
  // Utility actions
  clearUsers: () => void;
  getUserById: (id: string) => User | undefined;
  getOnlineUsers: () => User[];
  getTypingUsersInChat: (chatId: string) => User[];
}

// Constants
export const USER_CONSTANTS = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  BIO: {
    MAX_LENGTH: 139,
  },
  AVATAR: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },
  LAST_SEEN: {
    ONLINE_THRESHOLD: 5 * 60 * 1000, // 5 minutes
    AWAY_THRESHOLD: 30 * 60 * 1000, // 30 minutes
  },
} as const;

// Helper types
export type UserField = keyof User;
export type UserUpdateField = keyof UserUpdateRequest;