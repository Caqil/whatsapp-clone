// src/types/message.ts - Simplified to match Go API exactly
import type { User } from './user';

// Message types (matches Go backend exactly)
export type MessageType = 
  | 'text'
  | 'image'
  | 'file'
  | 'audio'
  | 'video'
  | 'document';

// Message status (matches Go backend exactly)
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

// Reaction types (matches Go backend exactly)
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

// Main Message entity (matches Go backend exactly)
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
  duration?: number;
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

// Simplified MessageWithUser - just adds basic info
export interface MessageWithUser extends Message {
  senderName: string; // Just the name, not full User object
  isOwn: boolean;
  replyToMessage?: Message;
}

// Message response from API (matches Go backend exactly)
export interface MessageResponse {
  message: Message;
  senderName?: string;
  replyToMessage?: Message;
  isDelivered: boolean;
  isRead: boolean;
  reactionCount: Record<ReactionType, number>;
}

// Send message request (matches Go backend exactly)
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
  context: MessageWithUser[];
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

// Message draft
export interface MessageDraft {
  chatId: string;
  content: string;
  replyToId?: string;
  updatedAt: string;
}