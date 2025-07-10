
import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { 
  AuthResponse, 
  MagicLinkRequest, 
  MagicLinkResponse,
  VerifyMagicLinkRequest,
  QRCodeRequest,
  QRCodeResponse,
  QRStatusResponse,
  RefreshTokenRequest,
  MagicLinkUserRequest,
  LoginRequest,
  RegisterRequest
} from '@/types/auth';
import type { User, UserUpdateRequest } from '@/types/user';
import type { Chat, CreateChatRequest, ChatWithUsers } from '@/types/chat';
import type { 
  Message, 
  SendMessageRequest, 
  MessageResponse,
  MessageReactionRequest,
  ForwardMessageRequest,
  DeleteMessageRequest
} from '@/types/message';
import type { ApiResponse, UploadResult } from '@/types/api';
import { getStoredTokens, removeStoredTokens, setStoredTokens } from './storage';
import { API_ENDPOINTS } from '@/config/api-endpoints';
import { groupApi } from './api/group-api';

// Enhanced API Client Class
class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;
  private isRefreshing = false;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    
    console.log('🔧 API Client initialized:', {
      baseURL,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { accessToken } = getStoredTokens();
        
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }

        const fullUrl = `${config.baseURL}${config.url}`;
        console.log(`📤 API Request: ${config.method?.toUpperCase()} ${fullUrl}`, {
          params: config.params,
          hasAuth: !!accessToken,
          timestamp: new Date().toISOString()
        });

        return config;
      },
      (error) => {
        console.error('❌ API Request Setup Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`📥 API Response: ${response.status} ${response.config.url}`, {
          success: response.data?.success,
          hasData: !!response.data?.data,
          timestamp: new Date().toISOString()
        });
        
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        if (error.response?.status === 401 && !config._retry) {
          console.log('🔄 Token expired, attempting refresh...');
          
          if (this.isRefreshing) {
            try {
              const newToken = await this.refreshPromise;
              if (newToken && config.headers) {
                config.headers.Authorization = `Bearer ${newToken}`;
                config._retry = true;
                return this.client(config);
              }
            } catch (refreshError) {
              console.error('❌ Token refresh failed during retry:', refreshError);
              removeStoredTokens();
              window.location.href = '/auth';
              return Promise.reject(refreshError);
            }
          } else {
            try {
              this.isRefreshing = true;
              this.refreshPromise = this.performTokenRefresh();
              const newToken = await this.refreshPromise;
              
              if (newToken && config.headers) {
                config.headers.Authorization = `Bearer ${newToken}`;
                config._retry = true;
                return this.client(config);
              }
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              removeStoredTokens();
              window.location.href = '/auth';
              return Promise.reject(refreshError);
            } finally {
              this.isRefreshing = false;
              this.refreshPromise = null;
            }
          }
        }

        console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  private async performTokenRefresh(): Promise<string> {
    const { refreshToken } = getStoredTokens();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${this.client.defaults.baseURL}${API_ENDPOINTS.AUTH.REFRESH}`, {
        refreshToken
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      setStoredTokens(accessToken, newRefreshToken);
      
      return accessToken;
    } catch (error) {
      removeStoredTokens();
      throw error;
    }
  }

  // Generic HTTP methods
  private async get<T>(url: string): Promise<T> {
    try {
      const response = await this.client.get(url);
      return response.data.data || response.data;
    } catch (error) {
      console.error(`❌ GET ${url} failed:`, error);
      throw error;
    }
  }

  private async post<T>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.post(url, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error(`❌ POST ${url} failed:`, error);
      throw error;
    }
  }

  private async put<T>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.put(url, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error(`❌ PUT ${url} failed:`, error);
      throw error;
    }
  }

  private async delete<T>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.delete(url, { data });
      return response.data.data || response.data;
    } catch (error) {
      console.error(`❌ DELETE ${url} failed:`, error);
      throw error;
    }
  }

  // ========== Health Check ==========
  async healthCheck(): Promise<{ status: string; version: string; features: string[] }> {
    // Try without /api prefix for health endpoint
    const response = await this.client.get('/health');
    return response.data;
  }

  async getApiDocs(): Promise<any> {
    return this.get<any>(API_ENDPOINTS.DOCS);
  }

  // ========== Magic Link Authentication ==========
  async sendMagicLink(request: MagicLinkRequest): Promise<MagicLinkResponse> {
    return this.post<MagicLinkResponse>(API_ENDPOINTS.AUTH.MAGIC_LINK, request);
  }

  async verifyMagicLink(request: VerifyMagicLinkRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY, request);
  }

  async registerWithMagicLink(token: string, request: MagicLinkUserRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(`${API_ENDPOINTS.AUTH.REGISTER_MAGIC}?token=${encodeURIComponent(token)}`, request);
  }

  // ========== QR Code Authentication ==========
  async generateQRCode(request: QRCodeRequest): Promise<QRCodeResponse> {
    return this.post<QRCodeResponse>(API_ENDPOINTS.AUTH.QR.GENERATE, request);
  }

  async checkQRStatus(secret: string): Promise<QRStatusResponse> {
    return this.get<QRStatusResponse>(`${API_ENDPOINTS.AUTH.QR.STATUS}?secret=${encodeURIComponent(secret)}`);
  }

  async loginWithQRCode(secret: string): Promise<AuthResponse> {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH.QR.LOGIN, { secret });
  }

  async scanQRCode(qrCode: string): Promise<void> {
    return this.post<void>(API_ENDPOINTS.QR.SCAN, { qrCode });
  }

  // ========== Session Management ==========
  async refreshToken(request: RefreshTokenRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH.REFRESH, request);
  }

  async logout(refreshToken: string): Promise<void> {
    return this.post<void>(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
  }

  async logoutAllDevices(): Promise<void> {
    return this.post<void>(API_ENDPOINTS.QR.LOGOUT_ALL);
  }

  async validateToken(): Promise<{ valid: boolean; user?: User }> {
    return this.get<{ valid: boolean; user?: User }>(API_ENDPOINTS.AUTH.VALIDATE);
  }

  async cleanupExpired(): Promise<void> {
    return this.post<void>(API_ENDPOINTS.AUTH.CLEANUP);
  }

  // ========== Legacy Authentication ==========
  async register(request: RegisterRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, request);
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, request);
  }

  // ========== User API ==========
  async getUserProfile(): Promise<User> {
    return this.get<User>(API_ENDPOINTS.USERS.PROFILE);
  }

  async updateUserProfile(request: UserUpdateRequest): Promise<User> {
    return this.put<User>(API_ENDPOINTS.USERS.PROFILE, request);
  }

  async searchUsers(query: string): Promise<User[]> {
    return this.get<User[]>(`${API_ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(query)}`);
  }

  // ========== Chat API ==========
  async createChat(request: CreateChatRequest): Promise<Chat> {
    return this.post<Chat>(API_ENDPOINTS.CHATS.BASE, request);
  }

  async getUserChats(): Promise<ChatWithUsers[]> {
    return this.get<ChatWithUsers[]>(API_ENDPOINTS.CHATS.BASE);
  }

  async getChat(chatId: string): Promise<ChatWithUsers> {
    return this.get<ChatWithUsers>(`${API_ENDPOINTS.CHATS.BASE}/${chatId}`);
  }

  // ========== Message API ==========
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    return this.post<Message>(API_ENDPOINTS.MESSAGES.BASE, request);
  }

  async getMessage(messageId: string): Promise<MessageResponse> {
    return this.get<MessageResponse>(API_ENDPOINTS.MESSAGES.BY_ID(messageId));
  }

  async getChatMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<MessageResponse[]> {
    return this.get<MessageResponse[]>(`${API_ENDPOINTS.MESSAGES.CHAT_MESSAGES(chatId)}?limit=${limit}&offset=${offset}`);
  }

  // ========== Message Status ==========
  async markAsRead(messageId: string): Promise<void> {
    return this.put<void>(API_ENDPOINTS.MESSAGES.READ(messageId));
  }

  async markMultipleAsRead(messageIds: string[]): Promise<void> {
    return this.put<void>(API_ENDPOINTS.MESSAGES.READ_MULTIPLE, { messageIds });
  }

  async getUnreadCount(chatId: string): Promise<{ unreadCount: number }> {
    return this.get<{ unreadCount: number }>(API_ENDPOINTS.MESSAGES.UNREAD_COUNT(chatId));
  }

  // ========== File Upload and Media ==========
  async uploadFile(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.client.post(API_ENDPOINTS.MESSAGES.UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw error;
    }
  }

  async sendMediaMessage(file: File, chatId: string, type: string, content?: string, replyToId?: string): Promise<Message> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chatId', chatId);
    formData.append('type', type);
    if (content) formData.append('content', content);
    if (replyToId) formData.append('replyToId', replyToId);

    try {
      const response = await this.client.post(API_ENDPOINTS.MESSAGES.MEDIA, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Media message send failed:', error);
      throw error;
    }
  }

  async getMediaMessages(chatId: string, type?: string, limit: number = 20, offset: number = 0): Promise<MessageResponse[]> {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (type) params.append('type', type);
    
    return this.get<MessageResponse[]>(`${API_ENDPOINTS.MESSAGES.CHAT_MEDIA(chatId)}?${params}`);
  }

  // ========== Message Reactions ==========
  async addReaction(request: MessageReactionRequest): Promise<void> {
    return this.post<void>(API_ENDPOINTS.MESSAGES.REACTIONS, request);
  }

  async removeReaction(messageId: string, reaction: string): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.MESSAGES.REMOVE_REACTION(messageId), { reaction });
  }

  // ========== Message Management ==========
  async forwardMessages(request: ForwardMessageRequest): Promise<void> {
    return this.post<void>(API_ENDPOINTS.MESSAGES.FORWARD, request);
  }

  async deleteMessage(request: DeleteMessageRequest): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.MESSAGES.DELETE, request);
  }

  async editMessage(messageId: string, content: string): Promise<void> {
    return this.put<void>(API_ENDPOINTS.MESSAGES.EDIT(messageId), { content });
  }

  // ========== Search ==========
  async searchMessages(chatId: string, query: string, limit: number = 20): Promise<MessageResponse[]> {
    return this.get<MessageResponse[]>(`${API_ENDPOINTS.MESSAGES.SEARCH(chatId)}?q=${encodeURIComponent(query)}&limit=${limit}`);
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export specific API modules for convenience
export const authApi = {
  // Magic Link
  sendMagicLink: (request: MagicLinkRequest) => apiClient.sendMagicLink(request),
  verifyMagicLink: (request: VerifyMagicLinkRequest) => apiClient.verifyMagicLink(request),
  registerWithMagicLink: (token: string, request: MagicLinkUserRequest) => apiClient.registerWithMagicLink(token, request),
  
  // QR Code
  generateQRCode: (request: QRCodeRequest) => apiClient.generateQRCode(request),
  checkQRStatus: (secret: string) => apiClient.checkQRStatus(secret),
  loginWithQRCode: (secret: string) => apiClient.loginWithQRCode(secret),
  scanQRCode: (qrCode: string) => apiClient.scanQRCode(qrCode),
  
  // Session
  refreshToken: (request: RefreshTokenRequest) => apiClient.refreshToken(request),
  logout: (refreshToken: string) => apiClient.logout(refreshToken),
  logoutAllDevices: () => apiClient.logoutAllDevices(),
  validateToken: () => apiClient.validateToken(),
  
  // Legacy
  register: (request: RegisterRequest) => apiClient.register(request),
  login: (request: LoginRequest) => apiClient.login(request),
};

export const userApi = {
  getProfile: () => apiClient.getUserProfile(),
  updateProfile: (request: UserUpdateRequest) => apiClient.updateUserProfile(request),
  searchUsers: (query: string) => apiClient.searchUsers(query),
};
export const groupsApi = {
  group: groupApi,
  
  // Convenience methods
  getGroupInfo: groupApi.getGroupInfo.bind(groupApi),
  updateGroupInfo: groupApi.updateGroupInfo.bind(groupApi),
  updateGroupSettings: groupApi.updateGroupSettings.bind(groupApi),
  addMembers: groupApi.addMembers.bind(groupApi),
  removeMember: groupApi.removeMember.bind(groupApi),
  leaveGroup: groupApi.leaveGroup.bind(groupApi),
  changeRole: groupApi.changeRole.bind(groupApi),
  createInvite: groupApi.createInvite.bind(groupApi),
  getGroupInvites: groupApi.getGroupInvites.bind(groupApi),
  revokeInvite: groupApi.revokeInvite.bind(groupApi),
  joinViaInvite: groupApi.joinViaInvite.bind(groupApi),
  getInviteInfo: groupApi.getInviteInfo.bind(groupApi),
  pinGroup: groupApi.pinGroup.bind(groupApi),
  unpinGroup: groupApi.unpinGroup.bind(groupApi),
  muteGroup: groupApi.muteGroup.bind(groupApi),
  unmuteGroup: groupApi.unmuteGroup.bind(groupApi),
  archiveGroup: groupApi.archiveGroup.bind(groupApi),
  unarchiveGroup: groupApi.unarchiveGroup.bind(groupApi),
};

export const chatApi = {
  createChat: (request: CreateChatRequest) => apiClient.createChat(request),
  getUserChats: () => apiClient.getUserChats(),
  getChat: (chatId: string) => apiClient.getChat(chatId),
};

export const messageApi = {
  // Core operations
  sendMessage: (request: SendMessageRequest) => apiClient.sendMessage(request),
  getMessage: (messageId: string) => apiClient.getMessage(messageId),
  getChatMessages: (chatId: string, limit?: number, offset?: number) => apiClient.getChatMessages(chatId, limit, offset),
  
  // Status
  markAsRead: (messageId: string) => apiClient.markAsRead(messageId),
  markMultipleAsRead: (messageIds: string[]) => apiClient.markMultipleAsRead(messageIds),
  getUnreadCount: (chatId: string) => apiClient.getUnreadCount(chatId),
  
  // Media
  sendMediaMessage: (file: File, chatId: string, type: string, content?: string, replyToId?: string) => 
    apiClient.sendMediaMessage(file, chatId, type, content, replyToId),
  getMediaMessages: (chatId: string, type?: string, limit?: number, offset?: number) => 
    apiClient.getMediaMessages(chatId, type, limit, offset),
  
  // Reactions
  addReaction: (request: MessageReactionRequest) => apiClient.addReaction(request),
  removeReaction: (messageId: string, reaction: string) => apiClient.removeReaction(messageId, reaction),
  
  // Management
  forwardMessages: (request: ForwardMessageRequest) => apiClient.forwardMessages(request),
  deleteMessage: (request: DeleteMessageRequest) => apiClient.deleteMessage(request),
  editMessage: (messageId: string, content: string) => apiClient.editMessage(messageId, content),
  
  // Search
  search: (chatId: string, query: string, limit?: number) => apiClient.searchMessages(chatId, query, limit),
};

export const fileApi = {
  upload: (file: File) => apiClient.uploadFile(file),
};

export const healthApi = {
  check: () => apiClient.healthCheck(),
  getDocs: () => apiClient.getApiDocs(),
};

// Export default
export default apiClient;