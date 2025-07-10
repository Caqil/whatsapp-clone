// src/lib/constants.ts

// ========== Application Constants ==========

export const APP_CONFIG = {
  NAME: 'WhatsApp Clone',
  VERSION: '1.0.0',
  DESCRIPTION: 'A modern WhatsApp Web clone built with Next.js 15',
  AUTHOR: 'Your Name',
  REPOSITORY: 'https://github.com/your-username/whatsapp-clone',
} as const;

// ========== API Constants ==========

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  WEBSOCKET_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/ws',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// ========== Authentication Constants ==========

export const AUTH_CONFIG = {
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  MAGIC_LINK_EXPIRY: 15 * 60 * 1000, // 15 minutes
  QR_CODE_EXPIRY: 5 * 60 * 1000, // 5 minutes
  SESSION_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
} as const;

export const DEVICE_TYPES = {
  WEB: 'web',
  MOBILE: 'mobile', 
  DESKTOP: 'desktop',
} as const;

export const LOGIN_METHODS = {
  MAGIC_LINK: 'magic_link',
  QR_CODE: 'qr_code',
  PASSWORD: 'password',
} as const;

// ========== User Constants ==========

export const USER_CONFIG = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
    RESERVED_NAMES: ['admin', 'root', 'api', 'www', 'support', 'help'],
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s]+$/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 254,
  },
  BIO: {
    MAX_LENGTH: 139,
    PLACEHOLDER: 'Hey there! I am using WhatsApp.',
  },
  PHONE: {
    PATTERN: /^\+?[1-9]\d{1,14}$/,
  },
  AVATAR: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
    DEFAULT_AVATAR: '/images/default-avatar.png',
  },
} as const;

export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy',
} as const;

export const ONLINE_STATUS_CONFIG = {
  ONLINE_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  AWAY_THRESHOLD: 30 * 60 * 1000, // 30 minutes
  UPDATE_INTERVAL: 60 * 1000, // 1 minute
} as const;

// ========== Chat Constants ==========

export const CHAT_CONFIG = {
  TYPES: {
    DIRECT: 'direct',
    GROUP: 'group',
  },
  GROUP: {
    NAME: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 25,
    },
    DESCRIPTION: {
      MAX_LENGTH: 512,
    },
    MAX_PARTICIPANTS: 256,
    DEFAULT_AVATAR: '/images/group-avatar.png',
  },
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  SEARCH: {
    MIN_QUERY_LENGTH: 2,
    MAX_RESULTS: 50,
    DEBOUNCE_DELAY: 300,
  },
} as const;

export const CHAT_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const CHAT_SETTINGS = {
  WHO_CAN_SEND: {
    EVERYONE: 'everyone',
    ADMINS: 'admins',
  },
  WHO_CAN_EDIT: {
    EVERYONE: 'everyone',
    ADMINS: 'admins',
  },
  WHO_CAN_ADD: {
    EVERYONE: 'everyone',
    ADMINS: 'admins',
  },
} as const;

// ========== Message Constants ==========

export const MESSAGE_CONFIG = {
  TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    FILE: 'file',
    AUDIO: 'audio',
    VIDEO: 'video',
    DOCUMENT: 'document',
    LOCATION: 'location',
    CONTACT: 'contact',
  },
  STATUS: {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
  },
  TEXT: {
    MAX_LENGTH: 4096,
    LINK_PATTERN: /(https?:\/\/[^\s]+)/g,
    MENTION_PATTERN: /@([a-zA-Z0-9_]+)/g,
    HASHTAG_PATTERN: /#([a-zA-Z0-9_]+)/g,
  },
  MEDIA: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    IMAGE: {
      MAX_SIZE: 10 * 1024 * 1024, // 10MB
      ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      MAX_DIMENSIONS: { width: 4096, height: 4096 },
    },
    VIDEO: {
      MAX_SIZE: 64 * 1024 * 1024, // 64MB
      ALLOWED_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
      MAX_DURATION: 30 * 60, // 30 minutes
    },
    AUDIO: {
      MAX_SIZE: 16 * 1024 * 1024, // 16MB
      ALLOWED_TYPES: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
      MAX_DURATION: 60 * 15, // 15 minutes
    },
    DOCUMENT: {
      MAX_SIZE: 100 * 1024 * 1024, // 100MB
      ALLOWED_TYPES: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
      ],
    },
  },
  VOICE: {
    MAX_DURATION: 60 * 15, // 15 minutes
    SAMPLE_RATE: 44100,
    BIT_RATE: 128000,
    FORMAT: 'audio/webm;codecs=opus',
  },
  PAGINATION: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
  },
  EDITING: {
    TIME_LIMIT: 24 * 60 * 60 * 1000, // 24 hours
  },
  DELETION: {
    TIME_LIMIT: 24 * 60 * 60 * 1000, // 24 hours for delete for everyone
  },
} as const;

export const REACTION_TYPES = ['👍', '❤️', '😂', '😮', '😢', '😠'] as const;

// ========== WebSocket Constants ==========

export const WEBSOCKET_CONFIG = {
  RECONNECT_INTERVAL: 3000, // 3 seconds
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  MESSAGE_TIMEOUT: 5000, // 5 seconds
  RECONNECT_DELAY: 1000, // Add a default reconnect delay (e.g., 1000ms)
  MAX_RECONNECT_DELAY: 30000, // Add a max reconnect delay (e.g., 30000ms)
} as const;

export const WEBSOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  RECONNECT: 'reconnect',
  
  // Message events
  NEW_MESSAGE: 'new_message',
  MESSAGE_STATUS: 'message_status',
  MESSAGE_REACTION: 'message_reaction',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_EDITED: 'message_edited',
  
  // Typing events
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  
  // User events
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_JOIN_CHAT: 'user_join_chat',
  USER_LEAVE_CHAT: 'user_leave_chat',
  
  // Chat events
  CHAT_CREATED: 'chat_created',
  CHAT_UPDATED: 'chat_updated',
  
  // File upload events
  FILE_UPLOAD_PROGRESS: 'file_upload_progress',
  FILE_UPLOAD_COMPLETE: 'file_upload_complete',
  FILE_UPLOAD_ERROR: 'file_upload_error',
  
  // System events
  PING: 'ping',
  PONG: 'pong',
} as const;

// ========== UI Constants ==========

export const UI_CONFIG = {
  THEME: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  },
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  },
  ANIMATION: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500,
    },
    EASING: {
      DEFAULT: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      IN: 'cubic-bezier(0.4, 0.0, 1, 1)',
      OUT: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      IN_OUT: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    },
  },
  COLORS: {
    PRIMARY: '#25d366', // WhatsApp green
    PRIMARY_DARK: '#128c7e',
    SECONDARY: '#34b7f1', // WhatsApp blue
    ACCENT: '#25d366',
    SUCCESS: '#22c55e',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
  SIDEBAR: {
    WIDTH: 320,
    COLLAPSED_WIDTH: 80,
  },
  HEADER: {
    HEIGHT: 60,
  },
  MESSAGE: {
    MAX_WIDTH: 480,
    BUBBLE_RADIUS: 8,
  },
} as const;

export const NOTIFICATION_CONFIG = {
  DURATION: {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 7000,
  },
  POSITION: {
    TOP_RIGHT: 'top-right',
    TOP_LEFT: 'top-left',
    BOTTOM_RIGHT: 'bottom-right',
    BOTTOM_LEFT: 'bottom-left',
    TOP_CENTER: 'top-center',
    BOTTOM_CENTER: 'bottom-center',
  },
  MAX_NOTIFICATIONS: 5,
} as const;

export const MODAL_CONFIG = {
  BACKDROP_BLUR: true,
  CLOSE_ON_BACKDROP_CLICK: true,
  CLOSE_ON_ESCAPE: true,
  FOCUS_TRAP: true,
} as const;

// ========== Keyboard Shortcuts ==========

export const KEYBOARD_SHORTCUTS = {
  SEND_MESSAGE: 'Enter',
  NEW_LINE: 'Shift+Enter',
  SEARCH: 'Ctrl+K',
  SETTINGS: 'Ctrl+,',
  NEW_CHAT: 'Ctrl+N',
  NEXT_CHAT: 'Ctrl+Tab',
  PREV_CHAT: 'Ctrl+Shift+Tab',
  ARCHIVE_CHAT: 'Ctrl+E',
  DELETE_CHAT: 'Delete',
  MUTE_CHAT: 'Ctrl+M',
  EMOJI_PICKER: 'Ctrl+E',
  ATTACH_FILE: 'Ctrl+U',
  VOICE_MESSAGE: 'Space', // Hold to record
} as const;

// ========== Storage Constants ==========

export const STORAGE_KEYS = {
  // Authentication
  ACCESS_TOKEN: 'bro_access_token',
  REFRESH_TOKEN: 'bro_refresh_token',
  USER_DATA: 'bro_user_data',
  AUTH_STATE: 'bro_auth_state',
  // Preferences
  THEME: 'bro_theme',
  LANGUAGE: 'bro_language',
  NOTIFICATIONS: 'bro_notifications',

  // Chat state
  CURRENT_CHAT: 'bro_current_chat',
  CHAT_DRAFTS: 'bro_chat_drafts',
  PINNED_CHATS: 'bro_pinned_chats',
  MUTED_CHATS: 'bro_muted_chats',

  // UI state
  SIDEBAR_COLLAPSED: 'bro_sidebar_collapsed',
  EMOJI_RECENT: 'bro_emoji_recent',
  SEARCH_HISTORY: 'bro_search_history',
} as const;

// ========== Error Messages ==========

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  
  // Validation errors
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_USERNAME: 'Username must be 3-30 characters and contain only letters, numbers, and underscores.',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long.',
  
  // File upload errors
  FILE_TOO_LARGE: 'File is too large. Maximum size is {maxSize}.',
  INVALID_FILE_TYPE: 'Invalid file type. Allowed types: {allowedTypes}.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  
  // Chat errors
  CHAT_NOT_FOUND: 'Chat not found.',
  NOT_CHAT_PARTICIPANT: 'You are not a participant in this chat.',
  CANNOT_MESSAGE_USER: 'Cannot send message to this user.',
  
  // Message errors
  MESSAGE_TOO_LONG: 'Message is too long. Maximum length is {maxLength} characters.',
  MESSAGE_SEND_FAILED: 'Failed to send message. Please try again.',
  MESSAGE_NOT_FOUND: 'Message not found.',
  CANNOT_EDIT_MESSAGE: 'This message cannot be edited.',
  CANNOT_DELETE_MESSAGE: 'This message cannot be deleted.',
  
  // Generic errors
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
  FEATURE_NOT_AVAILABLE: 'This feature is not available yet.',
} as const;

// ========== Success Messages ==========

export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Successfully logged in!',
  LOGOUT_SUCCESS: 'Successfully logged out!',
  REGISTRATION_SUCCESS: 'Account created successfully!',
  MAGIC_LINK_SENT: 'Magic link sent to your email!',
  
  // Profile
  PROFILE_UPDATED: 'Profile updated successfully!',
  AVATAR_UPDATED: 'Profile picture updated!',
  
  // Chat
  CHAT_CREATED: 'Chat created successfully!',
  MESSAGE_SENT: 'Message sent!',
  MESSAGE_DELETED: 'Message deleted!',
  MESSAGE_EDITED: 'Message edited!',
  
  // File
  FILE_UPLOADED: 'File uploaded successfully!',
  
  // Settings
  SETTINGS_SAVED: 'Settings saved successfully!',
} as const;

// ========== Default Values ==========

export const DEFAULT_VALUES = {
  USER: {
    AVATAR: '/images/default-avatar.png',
    BIO: 'Hey there! I am using WhatsApp.',
    THEME: 'system',
    LANGUAGE: 'en',
  },
  CHAT: {
    GROUP_AVATAR: '/images/group-avatar.png',
  },
  PAGINATION: {
    LIMIT: 50,
    OFFSET: 0,
  },
} as const;

// ========== Feature Flags ==========

export const FEATURE_FLAGS = {
  VOICE_MESSAGES: true,
  VIDEO_CALLS: false,
  VOICE_CALLS: false,
  STORIES: false,
  DISAPPEARING_MESSAGES: false,
  MESSAGE_REACTIONS: true,
  MESSAGE_FORWARDING: true,
  MESSAGE_EDITING: true,
  FILE_SHARING: true,
  GROUP_CHATS: true,
  QR_LOGIN: true,
  MAGIC_LINK_LOGIN: true,
  DARK_MODE: true,
  PUSH_NOTIFICATIONS: false,
} as const;

// Export all constants as a single object for convenience
export const CONSTANTS = {
  APP: APP_CONFIG,
  API: API_CONFIG,
  AUTH: AUTH_CONFIG,
  USER: USER_CONFIG,
  CHAT: CHAT_CONFIG,
  MESSAGE: MESSAGE_CONFIG,
  WEBSOCKET: WEBSOCKET_CONFIG,
  UI: UI_CONFIG,
  NOTIFICATION: NOTIFICATION_CONFIG,
  STORAGE: STORAGE_KEYS,
  ERRORS: ERROR_MESSAGES,
  SUCCESS: SUCCESS_MESSAGES,
  DEFAULTS: DEFAULT_VALUES,
  FEATURES: FEATURE_FLAGS,
} as const;
