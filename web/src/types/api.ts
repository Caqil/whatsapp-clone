// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface SearchParams {
  q: string;
  limit?: number;
}

// Health check response
export interface HealthResponse {
  status: string;
  version: string;
  features: string[];
}

// API Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Upload response
export interface UploadResult {
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mediaType: string;
  dimensions?: MediaDimensions;
  duration?: number;
}

export interface MediaDimensions {
  width: number;
  height: number;
}

// WebSocket message types
export interface WSMessage<T = any> {
  type: string;
  payload: T;
}

// WebSocket event types
export type WSMessageType = 
  | 'new_message'
  | 'message_status'
  | 'message_reaction'
  | 'message_deleted'
  | 'message_edited'
  | 'typing_start'
  | 'typing_stop'
  | 'user_online'
  | 'user_offline'
  | 'user_join_chat'
  | 'user_leave_chat'
  | 'chat_created'
  | 'chat_updated'
  | 'file_upload_progress'
  | 'file_upload_complete'
  | 'file_upload_error'
  | 'error'
  | 'pong'
  | 'ping';

// WebSocket payload types
export interface NewMessagePayload {
  message: Message;
  chatId: string;
  senderName: string;
}

export interface MessageStatusPayload {
  messageId: string;
  chatId: string;
  status: MessageStatus;
  userId: string;
  timestamp: string;
}

export interface MessageReactionPayload {
  messageId: string;
  chatId: string;
  userId: string;
  username: string;
  reaction: ReactionType;
  action: 'add' | 'remove';
  timestamp: string;
}

export interface TypingPayload {
  chatId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface UserStatusPayload {
  userId: string;
  username: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface ChatActionPayload {
  chatId: string;
  userId: string;
  username: string;
  action: string;
}

export interface FileUploadPayload {
  uploadId: string;
  chatId: string;
  userId: string;
  fileName: string;
  progress?: number;
  fileUrl?: string;
  error?: string;
}

// Import types from other files
import type { Message, MessageStatus, ReactionType } from './message';

// Re-export common types for convenience
export type { Message, MessageStatus, ReactionType };