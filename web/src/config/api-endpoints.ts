// src/config/api-endpoints.ts
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
    CHAT: '/messages/chat',
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
  DOCS: '/docs',
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
  // FIXED: Use HTTP base URL and let socket.io handle the protocol upgrade
  const base = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const wsUrl = `${base}${API_ENDPOINTS.WEBSOCKET}`;
  
  if (token) {
    return `${wsUrl}?token=${encodeURIComponent(token)}`;
  }
  
  return wsUrl;
}
/**
 * Build URL with query parameters
 */
export function buildUrlWithParams(endpoint: string, params: Record<string, any>): string {
  const url = new URL(endpoint, 'http://localhost'); // Use dummy base for URL construction
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.pathname + url.search;
}

// ========== Endpoint Helper Functions ==========

export const authEndpoints = {
  sendMagicLink: () => API_ENDPOINTS.AUTH.MAGIC_LINK,
  verifyMagicLink: () => API_ENDPOINTS.AUTH.VERIFY,
  registerWithMagicLink: (token?: string) => 
    token ? `${API_ENDPOINTS.AUTH.REGISTER_MAGIC}?token=${encodeURIComponent(token)}` : API_ENDPOINTS.AUTH.REGISTER_MAGIC,
  
  generateQRCode: () => API_ENDPOINTS.AUTH.QR.GENERATE,
  checkQRStatus: (secret: string) => buildUrlWithParams(API_ENDPOINTS.AUTH.QR.STATUS, { secret }),
  loginWithQRCode: (secret: string) => buildUrlWithParams(API_ENDPOINTS.AUTH.QR.LOGIN, { secret }),
  
  refreshToken: () => API_ENDPOINTS.AUTH.REFRESH,
  logout: () => API_ENDPOINTS.AUTH.LOGOUT,
  
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
  updateChat: (chatId: string) => API_ENDPOINTS.CHATS.BY_ID(chatId),
  deleteChat: (chatId: string) => API_ENDPOINTS.CHATS.BY_ID(chatId),
};

export const messageEndpoints = {
  sendMessage: () => API_ENDPOINTS.MESSAGES.BASE,
  getMessage: (messageId: string) => API_ENDPOINTS.MESSAGES.BY_ID(messageId),
  
  getChatMessages: (chatId: string, params?: { limit?: number; offset?: number }) => 
    buildUrlWithParams(API_ENDPOINTS.MESSAGES.CHAT_MESSAGES(chatId), params || {}),
  
  markAsRead: (messageId: string) => API_ENDPOINTS.MESSAGES.READ(messageId),
  markMultipleAsRead: () => API_ENDPOINTS.MESSAGES.READ_MULTIPLE,
  getUnreadCount: (chatId: string) => API_ENDPOINTS.MESSAGES.UNREAD_COUNT(chatId),
  
  // File upload
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

// ========== URL Pattern Matchers ==========

/**
 * Check if URL matches a pattern
 */
export function matchesEndpoint(url: string, pattern: string): boolean {
  // Convert pattern to regex (simple implementation)
  const regexPattern = pattern
    .replace(/:\w+/g, '[^/]+') // Replace :id with [^/]+
    .replace(/\*/g, '.*'); // Replace * with .*
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(url);
}

/**
 * Extract parameters from URL based on pattern
 */
export function extractUrlParams(url: string, pattern: string): Record<string, string> {
  const params: Record<string, string> = {};
  
  const patternParts = pattern.split('/');
  const urlParts = url.split('/');
  
  if (patternParts.length !== urlParts.length) {
    return params;
  }
  
  patternParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1);
      params[paramName] = urlParts[index];
    }
  });
  
  return params;
}

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
  return ENDPOINT_CATEGORIES.PROTECTED.some(pattern => 
    matchesEndpoint(endpoint, pattern) || endpoint.startsWith(pattern)
  );
}

/**
 * Check if endpoint is public
 */
export function isPublicEndpoint(endpoint: string): boolean {
  return ENDPOINT_CATEGORIES.PUBLIC.some(pattern => 
    matchesEndpoint(endpoint, pattern) || endpoint.startsWith(pattern)
  );
}

// ========== Rate Limiting Info ==========

export const RATE_LIMITS = {
  // Auth endpoints
  [API_ENDPOINTS.AUTH.MAGIC_LINK]: { requests: 5, window: 60 }, // 5 per minute
  [API_ENDPOINTS.AUTH.VERIFY]: { requests: 10, window: 60 }, // 10 per minute
  [API_ENDPOINTS.AUTH.QR.GENERATE]: { requests: 10, window: 60 }, // 10 per minute
  [API_ENDPOINTS.AUTH.LOGIN]: { requests: 5, window: 60 }, // 5 per minute
  [API_ENDPOINTS.AUTH.REGISTER]: { requests: 3, window: 60 }, // 3 per minute
  
  // Message endpoints
  [API_ENDPOINTS.MESSAGES.BASE]: { requests: 100, window: 60 }, // 100 per minute
  [API_ENDPOINTS.MESSAGES.UPLOAD]: { requests: 20, window: 60 }, // 20 per minute
  [API_ENDPOINTS.MESSAGES.MEDIA]: { requests: 30, window: 60 }, // 30 per minute
  
  // Search endpoints
  [API_ENDPOINTS.USERS.SEARCH]: { requests: 30, window: 60 }, // 30 per minute
  
  // Default rate limit
  DEFAULT: { requests: 60, window: 60 }, // 60 per minute
} as const;

/**
 * Get rate limit for endpoint
 */
export function getRateLimit(endpoint: string): { requests: number; window: number } {
  return RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS] || RATE_LIMITS.DEFAULT;
}

// ========== Development Helpers ==========

/**
 * Get all endpoints as flat array (useful for testing)
 */
export function getAllEndpoints(): string[] {
  const endpoints: string[] = [];
  
  function extractEndpoints(obj: any, prefix = '') {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string') {
        endpoints.push(value);
      } else if (typeof value === 'object' && value !== null) {
        extractEndpoints(value, `${prefix}${key}.`);
      }
    });
  }
  
  extractEndpoints(API_ENDPOINTS);
  return endpoints;
}

/**
 * Validate endpoint exists
 */
export function validateEndpoint(endpoint: string): boolean {
  const allEndpoints = getAllEndpoints();
  return allEndpoints.includes(endpoint);
}

// Export everything
export default API_ENDPOINTS;