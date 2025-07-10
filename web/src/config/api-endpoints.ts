// src/config/api-endpoints.ts - Complete API endpoints matching your curl documentation
export const API_ENDPOINTS = {
  // ========== Authentication Endpoints ==========
  AUTH: {
    // Magic Link Authentication
    MAGIC_LINK: '/auth/magic-link',
    VERIFY: '/auth/verify',
    REGISTER_MAGIC: '/auth/register-magic',
    
    // QR Code Authentication
    QR: {
      GENERATE: '/auth/qr/generate',
      STATUS: '/auth/qr/status',
      LOGIN: '/auth/qr/login',
    },
    
    // Session Management
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    
    // Utilities
    VALIDATE: '/auth/validate',
    CLEANUP: '/auth/cleanup',
    
    // Legacy Authentication (backward compatibility)
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
  },

  // ========== QR Code Endpoints (Protected) ==========
  QR: {
    SCAN: '/qr/scan',
    LOGOUT_ALL: '/qr/logout-all',
  },

  // ========== User Endpoints ==========
  USERS: {
    PROFILE: '/users/profile',
    SEARCH: '/users/search',
  },

  // ========== Chat Endpoints ==========
  CHATS: {
    BASE: '/chats',
    BY_ID: (chatId: string) => `/chats/${chatId}`,
  },

  // ========== Message Endpoints ==========
  MESSAGES: {
    BASE: '/messages',
    BY_ID: (messageId: string) => `/messages/${messageId}`,
    
    // Chat messages
    CHAT_MESSAGES: (chatId: string) => `/messages/chat/${chatId}`,
    
    // Message Status
    READ: (messageId: string) => `/messages/${messageId}/read`,
    READ_MULTIPLE: '/messages/read-multiple',
    UNREAD_COUNT: (chatId: string) => `/messages/chat/${chatId}/unread-count`,
    
    // File Upload and Media
    UPLOAD: '/messages/upload',
    MEDIA: '/messages/media',
    CHAT_MEDIA: (chatId: string) => `/messages/chat/${chatId}/media`,
    
    // Message Reactions
    REACTIONS: '/messages/reactions',
    REMOVE_REACTION: (messageId: string) => `/messages/${messageId}/reactions`,
    
    // Message Management
    FORWARD: '/messages/forward',
    DELETE: '/messages/delete',
    EDIT: (messageId: string) => `/messages/${messageId}/edit`,
    
    // Search
    SEARCH: (chatId: string) => `/messages/chat/${chatId}/search`,
  },

  // ========== WebSocket Endpoint ==========
  WEBSOCKET: '/ws',

  // ========== Health and Documentation ==========
  HEALTH: '/health',
  DOCS: '/api/docs',
} as const;

// ========== Build URL Helper Functions ==========

/**
 * Build complete API URL
 */
export function buildApiUrl(endpoint: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  return `${base}${endpoint}`;
}

/**
 * Build WebSocket URL
 */
export function buildWebSocketUrl(token?: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';
  const wsBase = base.replace('http://', 'ws://').replace('https://', 'wss://');
  const wsUrl = `${wsBase}`;
  
  if (token) {
    return `${wsUrl}?token=${encodeURIComponent(token)}`;
  }
  
  return wsUrl;
}

/**
 * Build URL with query parameters
 */
export function buildUrlWithParams(endpoint: string, params: Record<string, any>): string {
  const url = new URL(endpoint, 'http://localhost');
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.pathname + url.search;
}

// ========== Endpoint Helper Functions ==========

export const authEndpoints = {
  // Magic Link Authentication
  sendMagicLink: () => API_ENDPOINTS.AUTH.MAGIC_LINK,
  verifyMagicLink: () => API_ENDPOINTS.AUTH.VERIFY,
  registerWithMagicLink: (token?: string) => 
    token ? `${API_ENDPOINTS.AUTH.REGISTER_MAGIC}?token=${encodeURIComponent(token)}` : API_ENDPOINTS.AUTH.REGISTER_MAGIC,
  
  // QR Code Authentication
  generateQRCode: () => API_ENDPOINTS.AUTH.QR.GENERATE,
  checkQRStatus: (secret: string) => buildUrlWithParams(API_ENDPOINTS.AUTH.QR.STATUS, { secret }),
  loginWithQRCode: () => API_ENDPOINTS.AUTH.QR.LOGIN,
  
  // Session Management
  refreshToken: () => API_ENDPOINTS.AUTH.REFRESH,
  logout: () => API_ENDPOINTS.AUTH.LOGOUT,
  validateToken: () => API_ENDPOINTS.AUTH.VALIDATE,
  cleanup: () => API_ENDPOINTS.AUTH.CLEANUP,
  
  // QR protected endpoints
  scanQRCode: () => API_ENDPOINTS.QR.SCAN,
  logoutAllDevices: () => API_ENDPOINTS.QR.LOGOUT_ALL,
  
  // Legacy
  register: () => API_ENDPOINTS.AUTH.REGISTER,
  login: () => API_ENDPOINTS.AUTH.LOGIN,
};

export const userEndpoints = {
  getProfile: () => API_ENDPOINTS.USERS.PROFILE,
  updateProfile: () => API_ENDPOINTS.USERS.PROFILE,
  searchUsers: (query: string) => buildUrlWithParams(API_ENDPOINTS.USERS.SEARCH, { q: query }),
};

export const chatEndpoints = {
  createChat: () => API_ENDPOINTS.CHATS.BASE,
  getUserChats: () => API_ENDPOINTS.CHATS.BASE,
  getChat: (chatId: string) => API_ENDPOINTS.CHATS.BY_ID(chatId),
};

export const messageEndpoints = {
  // Core message operations
  sendMessage: () => API_ENDPOINTS.MESSAGES.BASE,
  getMessage: (messageId: string) => API_ENDPOINTS.MESSAGES.BY_ID(messageId),
  
  // Chat messages
  getChatMessages: (chatId: string, params?: { limit?: number; offset?: number }) => 
    buildUrlWithParams(API_ENDPOINTS.MESSAGES.CHAT_MESSAGES(chatId), params || {}),
  
  // Message status
  markAsRead: (messageId: string) => API_ENDPOINTS.MESSAGES.READ(messageId),
  markMultipleAsRead: () => API_ENDPOINTS.MESSAGES.READ_MULTIPLE,
  getUnreadCount: (chatId: string) => API_ENDPOINTS.MESSAGES.UNREAD_COUNT(chatId),
  
  // File upload and media
  uploadFile: () => API_ENDPOINTS.MESSAGES.UPLOAD,
  sendMediaMessage: () => API_ENDPOINTS.MESSAGES.MEDIA,
  getMediaMessages: (chatId: string, params?: { type?: string; limit?: number; offset?: number }) =>
    buildUrlWithParams(API_ENDPOINTS.MESSAGES.CHAT_MEDIA(chatId), params || {}),
  
  // Reactions
  addReaction: () => API_ENDPOINTS.MESSAGES.REACTIONS,
  removeReaction: (messageId: string) => API_ENDPOINTS.MESSAGES.REMOVE_REACTION(messageId),
  
  // Message management
  forwardMessages: () => API_ENDPOINTS.MESSAGES.FORWARD,
  deleteMessage: () => API_ENDPOINTS.MESSAGES.DELETE,
  editMessage: (messageId: string) => API_ENDPOINTS.MESSAGES.EDIT(messageId),
  
  // Search
  searchMessages: (chatId: string, params?: { q?: string; limit?: number }) =>
    buildUrlWithParams(API_ENDPOINTS.MESSAGES.SEARCH(chatId), params || {}),
};

// ========== Rate Limiting Info (from your API docs) ==========

export const RATE_LIMITS = {
  // Auth endpoints: 3-10 requests per minute
  [API_ENDPOINTS.AUTH.MAGIC_LINK]: { requests: 5, window: 60 },
  [API_ENDPOINTS.AUTH.VERIFY]: { requests: 10, window: 60 },
  [API_ENDPOINTS.AUTH.QR.GENERATE]: { requests: 10, window: 60 },
  [API_ENDPOINTS.AUTH.LOGIN]: { requests: 5, window: 60 },
  [API_ENDPOINTS.AUTH.REGISTER]: { requests: 3, window: 60 },
  
  // Message sending: 100 requests per minute
  [API_ENDPOINTS.MESSAGES.BASE]: { requests: 100, window: 60 },
  
  // File upload: 20 requests per minute
  [API_ENDPOINTS.MESSAGES.UPLOAD]: { requests: 20, window: 60 },
  [API_ENDPOINTS.MESSAGES.MEDIA]: { requests: 20, window: 60 },
  
  // User search: 30 requests per minute
  [API_ENDPOINTS.USERS.SEARCH]: { requests: 30, window: 60 },
  
  // Default rate limit
  DEFAULT: { requests: 60, window: 60 },
} as const;

// ========== Endpoint Categories ==========

export const ENDPOINT_CATEGORIES = {
  AUTH: [
    API_ENDPOINTS.AUTH.MAGIC_LINK,
    API_ENDPOINTS.AUTH.VERIFY,
    API_ENDPOINTS.AUTH.REGISTER_MAGIC,
    API_ENDPOINTS.AUTH.QR.GENERATE,
    API_ENDPOINTS.AUTH.QR.STATUS,
    API_ENDPOINTS.AUTH.QR.LOGIN,
    API_ENDPOINTS.AUTH.REFRESH,
    API_ENDPOINTS.AUTH.LOGOUT,
    API_ENDPOINTS.AUTH.REGISTER,
    API_ENDPOINTS.AUTH.LOGIN,
    API_ENDPOINTS.AUTH.VALIDATE,
    API_ENDPOINTS.AUTH.CLEANUP,
  ],
  
  PROTECTED: [
    API_ENDPOINTS.USERS.PROFILE,
    API_ENDPOINTS.USERS.SEARCH,
    API_ENDPOINTS.CHATS.BASE,
    API_ENDPOINTS.MESSAGES.BASE,
    API_ENDPOINTS.QR.SCAN,
    API_ENDPOINTS.QR.LOGOUT_ALL,
    API_ENDPOINTS.WEBSOCKET,
  ],
  
  PUBLIC: [
    API_ENDPOINTS.AUTH.MAGIC_LINK,
    API_ENDPOINTS.AUTH.VERIFY,
    API_ENDPOINTS.AUTH.REGISTER_MAGIC,
    API_ENDPOINTS.AUTH.QR.GENERATE,
    API_ENDPOINTS.AUTH.QR.STATUS,
    API_ENDPOINTS.AUTH.QR.LOGIN,
    API_ENDPOINTS.AUTH.REFRESH,
    API_ENDPOINTS.AUTH.REGISTER,
    API_ENDPOINTS.AUTH.LOGIN,
    API_ENDPOINTS.HEALTH,
    API_ENDPOINTS.DOCS,
  ],
} as const;

/**
 * Check if endpoint requires authentication
 */
export function requiresAuth(endpoint: string): boolean {
  return !ENDPOINT_CATEGORIES.PUBLIC.some(pattern => endpoint.startsWith(pattern));
}

/**
 * Get rate limit for endpoint
 */
export function getRateLimit(endpoint: string): { requests: number; window: number } {
  return RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS] || RATE_LIMITS.DEFAULT;
}

// Export default
export default API_ENDPOINTS;