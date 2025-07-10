// src/types/message.ts
import type { User } from './user';

// Message types (matches Go backend)
export type MessageType = 
  | 'text'
  | 'image'
  | 'file'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'contact';

// Message status (matches Go backend)
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

// Reaction types (matches Go backend)
export type ReactionType = '👍' | '❤️' | '😂' | '😮' | '😢' | '😠';

// Media dimensions
export interface MediaDimensions {
  width: number;
  height: number;
}

// Delivery info
export interface DeliveryInfo {
  userId: string;
  deliveredAt: string;
}

// Read info
export interface ReadInfo {
  userId: string;
  readAt: string;
}

// Message reaction
export interface MessageReaction {
  userId: string;
  reaction: ReactionType;
  addedAt: string;
}

// Main Message entity (matches Go backend)
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string;
  
  // Media and file information
  mediaUrl?: string;
  mediaType?: string;
  fileSize?: number;
  fileName?: string;
  thumbnailUrl?: string;
  duration?: number; // For audio/video in seconds
  dimensions?: MediaDimensions;
  
  // Message features
  replyToId?: string;
  forwardedFrom?: string;
  isForwarded: boolean;
  
  // Status and delivery
  status: MessageStatus;
  deliveredTo: DeliveryInfo[];
  readBy: ReadInfo[];
  
  // Reactions
  reactions: MessageReaction[];
  
  // Metadata
  editedAt?: string;
  deletedAt?: string;
  deletedFor?: string[];
  isDeleted: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// Extended message with user data
export interface MessageWithUser extends Message {
  sender: User;
  replyToMessage?: Message;
  forwardedFromUser?: User;
  isOwn: boolean;
  senderName?: string;
}

// Message response (matches Go backend)
export interface MessageResponse {
  message: Message;
  senderName?: string;
  replyToMessage?: Message;
  isDelivered: boolean;
  isRead: boolean;
  reactionCount: Record<ReactionType, number>;
}

// Send message request (matches Go backend)
export interface SendMessageRequest {
  chatId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  dimensions?: MediaDimensions;
  replyToId?: string;
}

// Message reaction request
export interface MessageReactionRequest {
  messageId: string;
  reaction: ReactionType;
}

// Forward message request
export interface ForwardMessageRequest {
  messageIds: string[];
  toChatIds: string[];
}

// Delete message request
export interface DeleteMessageRequest {
  messageId: string;
  deleteForMe: boolean;
}

// Message search result
export interface MessageSearchResult {
  message: MessageWithUser;
  chatId: string;
  chatName: string;
  context: MessageWithUser[]; // Surrounding messages for context
  matchText?: string;
}

// Message status update
export interface MessageStatusUpdate {
  messageId: string;
  status: MessageStatus;
  userId?: string;
  timestamp: string;
}

// Message list state
export interface MessageListState {
  messages: Map<string, MessageWithUser>;
  hasMore: boolean;
  isLoading: boolean;
  offset: number;
  limit: number;
}

// Message context types
export interface MessageContextType {
  // Messages state
  messages: Map<string, MessageWithUser>;
  isLoading: boolean;
  hasMore: boolean;
  
  // Message management
  sendMessage: (request: SendMessageRequest) => Promise<Message>;
  sendMediaMessage: (file: File, chatId: string, content?: string) => Promise<Message>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteForEveryone?: boolean) => Promise<void>;
  forwardMessages: (messageIds: string[], toChatIds: string[]) => Promise<void>;
  
  // Message loading
  loadMessages: (chatId: string, limit?: number, offset?: number) => Promise<MessageWithUser[]>;
  loadMoreMessages: (chatId: string) => Promise<MessageWithUser[]>;
  
  // Message status
  markAsRead: (messageId: string) => Promise<void>;
  markMultipleAsRead: (messageIds: string[]) => Promise<void>;
  
  // Reactions
  addReaction: (messageId: string, reaction: ReactionType) => Promise<void>;
  removeReaction: (messageId: string) => Promise<void>;
  
  // Search
  searchMessages: (chatId: string, query: string) => Promise<MessageSearchResult[]>;
  getMediaMessages: (chatId: string, mediaType: MessageType) => Promise<MessageWithUser[]>;
  
  // Utilities
  getMessageById: (messageId: string) => MessageWithUser | null;
  getUnreadCount: (chatId: string) => Promise<number>;
}

// Message store types (for Zustand)
export interface MessageStore {
  // State
  messagesByChatId: Map<string, Map<string, MessageWithUser>>;
  isLoading: boolean;
  hasMoreByChat: Map<string, boolean>;
  offsetByChat: Map<string, number>;
  
  // Actions
  addMessage: (chatId: string, message: MessageWithUser) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<MessageWithUser>) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  addMessages: (chatId: string, messages: MessageWithUser[]) => void;
  
  // Status actions
  updateMessageStatus: (chatId: string, messageId: string, status: MessageStatus) => void;
  markAsDelivered: (chatId: string, messageId: string, userId: string) => void;
  markAsRead: (chatId: string, messageId: string, userId: string) => void;
  
  // Reaction actions
  addReaction: (chatId: string, messageId: string, reaction: MessageReaction) => void;
  removeReaction: (chatId: string, messageId: string, userId: string) => void;
  
  // Utility actions
  getMessagesForChat: (chatId: string) => MessageWithUser[];
  getMessageById: (chatId: string, messageId: string) => MessageWithUser | undefined;
  getLastMessage: (chatId: string) => MessageWithUser | undefined;
  getUnreadMessages: (chatId: string, userId: string) => MessageWithUser[];
  clearMessages: (chatId: string) => void;
  clearAllMessages: () => void;
  
  // Loading state
  setLoading: (chatId: string, loading: boolean) => void;
  setHasMore: (chatId: string, hasMore: boolean) => void;
  setOffset: (chatId: string, offset: number) => void;
}

// Message input state
export interface MessageInputState {
  content: string;
  replyTo: MessageWithUser | null;
  isTyping: boolean;
  attachments: File[];
  isRecording: boolean;
  recordingDuration: number;
}

// Voice message
export interface VoiceMessage {
  id: string;
  audioBlob: Blob;
  duration: number;
  waveform?: number[];
  isPlaying: boolean;
  currentTime: number;
}

// File attachment
export interface FileAttachment {
  id: string;
  file: File;
  type: 'image' | 'video' | 'audio' | 'document';
  preview?: string;
  uploadProgress: number;
  isUploaded: boolean;
  url?: string;
}

// Message draft
export interface MessageDraft {
  chatId: string;
  content: string;
  replyToId?: string;
  attachments: FileAttachment[];
  updatedAt: string;
}

// Message notification
export interface MessageNotification {
  id: string;
  message: MessageWithUser;
  chat: {
    id: string;
    name: string;
    type: 'direct' | 'group';
  };
  sender: User;
  timestamp: string;
  isRead: boolean;
}

// Pagination params for messages
export interface MessagePaginationParams {
  chatId: string;
  limit?: number;
  offset?: number;
  before?: string; // Message ID to load messages before
  after?: string; // Message ID to load messages after
}

// Message filter options
export interface MessageFilterOptions {
  type?: MessageType;
  senderId?: string;
  dateFrom?: string;
  dateTo?: string;
  hasMedia?: boolean;
  hasReactions?: boolean;
}

// Constants
export const MESSAGE_CONSTANTS = {
  MAX_TEXT_LENGTH: 4096,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_VOICE_DURATION: 60 * 15, // 15 minutes
  TYPING_TIMEOUT: 3000, // 3 seconds
  EDIT_TIME_LIMIT: 24 * 60 * 60 * 1000, // 24 hours
  DELETE_TIME_LIMIT: 24 * 60 * 60 * 1000, // 24 hours
  PAGINATION_LIMIT: 50,
  REACTIONS: ['👍', '❤️', '😂', '😮', '😢', '😠'] as ReactionType[],
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  SUPPORTED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
  SUPPORTED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
} as const;

// Helper types
export type MessageField = keyof Message;
export type MessageUpdateField = keyof Partial<Message>;
export type MessageSortOrder = 'asc' | 'desc';

// Message group (for UI grouping)
export interface MessageGroup {
  date: string;
  messages: MessageWithUser[];
}

// Message preview (for chat list)
export interface MessagePreview {
  text: string;
  type: MessageType;
  timestamp: string;
  isUnread: boolean;
  senderName?: string;
}