// src/lib/api.ts
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
  MagicLinkUserRequest
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

// API Client Class
class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { accessToken } = getStoredTokens();
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            removeStoredTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    try {
      const token = await this.refreshPromise;
      if (!token) {
        throw new Error('Failed to refresh access token');
      }
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<string> {
    const { refreshToken } = getStoredTokens();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post<ApiResponse<AuthResponse>>(
        `${this.client.defaults.baseURL}/auth/refresh`,
        { refreshToken }
      );

      if (response.data.success && response.data.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        setStoredTokens(accessToken, newRefreshToken);
        if (!accessToken) {
          throw new Error('No access token returned from refresh');
        }
        return accessToken;
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      removeStoredTokens();
      throw error;
    }
  }

  // Generic API methods
  private async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message);
    }
    return response.data.data!;
  }

  private async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message);
    }
    return response.data.data!;
  }

  private async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message);
    }
    return response.data.data!;
  }

  private async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message);
    }
    return response.data.data!;
  }

  // ========== Authentication API ==========

  // Magic Link Authentication
  async sendMagicLink(request: MagicLinkRequest): Promise<MagicLinkResponse> {
    return this.post<MagicLinkResponse>(API_ENDPOINTS.AUTH.MAGIC_LINK, request);
  }

  async verifyMagicLink(request: VerifyMagicLinkRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY, request);
  }

  async registerWithMagicLink(token: string, request: MagicLinkUserRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(`${API_ENDPOINTS.AUTH.REGISTER_MAGIC}?token=${token}`, request);
  }

  // QR Code Authentication
  async generateQRCode(request: QRCodeRequest): Promise<QRCodeResponse> {
    return this.post<QRCodeResponse>(API_ENDPOINTS.AUTH.QR.GENERATE, request);
  }

  async scanQRCode(qrCode: string): Promise<void> {
    return this.post<void>(API_ENDPOINTS.QR.SCAN, { qrCode });
  }

  async checkQRStatus(secret: string): Promise<QRStatusResponse> {
    return this.get<QRStatusResponse>(`${API_ENDPOINTS.AUTH.QR.STATUS}?secret=${secret}`);
  }

  async loginWithQRCode(secret: string): Promise<AuthResponse> {
    return this.post<AuthResponse>(`${API_ENDPOINTS.AUTH.QR.LOGIN}?secret=${secret}`);
  }

  // Session Management
  async refreshToken(request: RefreshTokenRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH.REFRESH, request);
  }

  async logout(refreshToken: string): Promise<void> {
    return this.post<void>(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
  }

  async logoutAllDevices(): Promise<void> {
    return this.post<void>(API_ENDPOINTS.QR.LOGOUT_ALL);
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

  async getChatMessages(chatId: string, limit = 50, offset = 0): Promise<MessageResponse[]> {
    return this.get<MessageResponse[]>(
      `${API_ENDPOINTS.MESSAGES.CHAT}/${chatId}?limit=${limit}&offset=${offset}`
    );
  }

  async getMessage(messageId: string): Promise<MessageResponse> {
    return this.get<MessageResponse>(`${API_ENDPOINTS.MESSAGES.BASE}/${messageId}`);
  }

  async markAsRead(messageId: string): Promise<void> {
    return this.put<void>(`${API_ENDPOINTS.MESSAGES.BASE}/${messageId}/read`);
  }

  async markMultipleAsRead(messageIds: string[]): Promise<void> {
    return this.put<void>(API_ENDPOINTS.MESSAGES.READ_MULTIPLE, { messageIds });
  }

  async getUnreadCount(chatId: string): Promise<{ chatId: string; unreadCount: number }> {
    return this.get<{ chatId: string; unreadCount: number }>(
      `${API_ENDPOINTS.MESSAGES.CHAT}/${chatId}/unread-count`
    );
  }

  // Message Reactions
  async addReaction(request: MessageReactionRequest): Promise<void> {
    return this.post<void>(API_ENDPOINTS.MESSAGES.REACTIONS, request);
  }

  async removeReaction(messageId: string): Promise<void> {
    return this.delete<void>(`${API_ENDPOINTS.MESSAGES.BASE}/${messageId}/reactions`);
  }

  // Message Management
  async forwardMessages(request: ForwardMessageRequest): Promise<void> {
    return this.post<void>(API_ENDPOINTS.MESSAGES.FORWARD, request);
  }

  async deleteMessage(request: DeleteMessageRequest): Promise<void> {
    return this.post<void>(`${API_ENDPOINTS.MESSAGES.DELETE}`, request);
  }

  async editMessage(messageId: string, content: string): Promise<void> {
    return this.put<void>(`${API_ENDPOINTS.MESSAGES.BASE}/${messageId}/edit`, { content });
  }

  // Search and Media
  async searchMessages(chatId: string, query: string, limit = 20): Promise<MessageResponse[]> {
    return this.get<MessageResponse[]>(
      `${API_ENDPOINTS.MESSAGES.CHAT}/${chatId}/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  async getMediaMessages(chatId: string, type: string, limit = 20, offset = 0): Promise<MessageResponse[]> {
    return this.get<MessageResponse[]>(
      `${API_ENDPOINTS.MESSAGES.CHAT}/${chatId}/media?type=${type}&limit=${limit}&offset=${offset}`
    );
  }

  // ========== File Upload API ==========

  async uploadFile(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse<UploadResult>>(
      API_ENDPOINTS.MESSAGES.UPLOAD,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message);
    }

    return response.data.data!;
  }

  async sendMediaMessage(file: File, chatId: string, content = ''): Promise<Message> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chatId', chatId);
    formData.append('content', content);

    const response = await this.client.post<ApiResponse<Message>>(
      API_ENDPOINTS.MESSAGES.MEDIA,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || response.data.message);
    }

    return response.data.data!;
  }

  // ========== Health Check ==========

  async healthCheck(): Promise<{ status: string; version: string; features: string[] }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // ========== Utility Methods ==========

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  getBaseURL(): string {
    return this.client.defaults.baseURL || '';
  }

  // For direct access to axios instance if needed
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export individual API methods for convenience
export const authApi = {
  sendMagicLink: (request: MagicLinkRequest) => apiClient.sendMagicLink(request),
  verifyMagicLink: (request: VerifyMagicLinkRequest) => apiClient.verifyMagicLink(request),
  registerWithMagicLink: (token: string, request: MagicLinkUserRequest) => 
    apiClient.registerWithMagicLink(token, request),
  generateQRCode: (request: QRCodeRequest) => apiClient.generateQRCode(request),
  scanQRCode: (qrCode: string) => apiClient.scanQRCode(qrCode),
  checkQRStatus: (secret: string) => apiClient.checkQRStatus(secret),
  loginWithQRCode: (secret: string) => apiClient.loginWithQRCode(secret),
  refreshToken: (request: RefreshTokenRequest) => apiClient.refreshToken(request),
  logout: (refreshToken: string) => apiClient.logout(refreshToken),
  logoutAllDevices: () => apiClient.logoutAllDevices(),
};

export const userApi = {
  getProfile: () => apiClient.getUserProfile(),
  updateProfile: (request: UserUpdateRequest) => apiClient.updateUserProfile(request),
  search: (query: string) => apiClient.searchUsers(query),
};

export const chatApi = {
  create: (request: CreateChatRequest) => apiClient.createChat(request),
  getUserChats: () => apiClient.getUserChats(),
  getChat: (chatId: string) => apiClient.getChat(chatId),
};

export const messageApi = {
  send: (request: SendMessageRequest) => apiClient.sendMessage(request),
  getChatMessages: (chatId: string, limit?: number, offset?: number) => 
    apiClient.getChatMessages(chatId, limit, offset),
  getMessage: (messageId: string) => apiClient.getMessage(messageId),
  markAsRead: (messageId: string) => apiClient.markAsRead(messageId),
  markMultipleAsRead: (messageIds: string[]) => apiClient.markMultipleAsRead(messageIds),
  getUnreadCount: (chatId: string) => apiClient.getUnreadCount(chatId),
  addReaction: (request: MessageReactionRequest) => apiClient.addReaction(request),
  removeReaction: (messageId: string) => apiClient.removeReaction(messageId),
  forward: (request: ForwardMessageRequest) => apiClient.forwardMessages(request),
  delete: (request: DeleteMessageRequest) => apiClient.deleteMessage(request),
  edit: (messageId: string, content: string) => apiClient.editMessage(messageId, content),
  search: (chatId: string, query: string, limit?: number) => 
    apiClient.searchMessages(chatId, query, limit),
  getMedia: (chatId: string, type: string, limit?: number, offset?: number) => 
    apiClient.getMediaMessages(chatId, type, limit, offset),
};

export const fileApi = {
  upload: (file: File) => apiClient.uploadFile(file),
  sendMedia: (file: File, chatId: string, content?: string) => 
    apiClient.sendMediaMessage(file, chatId, content),
};

// Export the main client as default
export default apiClient;