// src/lib/api.ts - Enhanced with better error handling
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

// Enhanced API Client Class
class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;
  private isRefreshing = false;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    
    // Debug logging
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
    // Request interceptor with enhanced logging
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { accessToken } = getStoredTokens();
        
        // Add auth token if available
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Enhanced logging
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

    // Response interceptor with enhanced error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful responses
        console.log(`📥 API Response: ${response.status} ${response.config.url}`, {
          success: response.data?.success,
          hasData: !!response.data?.data,
          timestamp: new Date().toISOString()
        });
        
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // Enhanced error logging
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: config?.url,
          fullUrl: `${config?.baseURL}${config?.url}`,
          method: config?.method?.toUpperCase(),
          message: error.message,
          responseData: error.response?.data,
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ API Response Error:', errorDetails);

        // Handle different error types
        if (error.response?.status === 404) {
          console.error('🔍 404 Error Details:', {
            requestedUrl: errorDetails.fullUrl,
            availableEndpoints: this.getAvailableEndpoints(),
            suggestion: 'Check if the backend server is running and the endpoint exists'
          });
        }

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && config && !config._retry && !this.isRefreshing) {
          config._retry = true;
          
          try {
            const newToken = await this.handleTokenRefresh();
            if (newToken && config.headers) {
              config.headers.Authorization = `Bearer ${newToken}`;
              console.log('🔄 Retrying request with new token');
              return this.client(config);
            }
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          }
        }

        // Handle 403 errors
        if (error.response?.status === 403) {
          console.error('🚫 403 Forbidden - Check user permissions');
        }

        // Handle 500 errors
        if (error.response?.status === 500) {
          console.error('🔥 500 Server Error - Backend issue');
        }

        return Promise.reject(error);
      }
    );
  }

  private getAvailableEndpoints(): string[] {
    return [
      '/health',
      '/api/docs',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/magic-link',
      '/api/users/profile',
      '/api/chats',
      '/api/messages'
    ];
  }

  private async handleTokenRefresh(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const { refreshToken } = getStoredTokens();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.client.post<ApiResponse<AuthResponse>>(
        API_ENDPOINTS.AUTH.REFRESH,
        { refreshToken }
      );

      if (response.data.success && response.data.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        setStoredTokens(accessToken, newRefreshToken);
        return accessToken;
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      throw error;
    }
  }

  private handleAuthFailure(): void {
    console.log('🔓 Authentication failed - clearing tokens');
    removeStoredTokens();
    
    // Only redirect if we're in the browser
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Enhanced generic API methods with better error handling
  private async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, { params });
      
      // Handle different response formats
      if (response.data && typeof response.data === 'object') {
        // Standard API response format
        if ('success' in response.data) {
          if (!response.data.success) {
            throw new Error(response.data.error || response.data.message || 'API request failed');
          }
          return response.data.data!;
        }
        
        // Direct data response (for health checks, etc.)
        return response.data as T;
      }
      
      // Fallback for other response types
      return response.data as T;
      
    } catch (error) {
      console.error(`❌ GET ${url} failed:`, error);
      this.handleApiError(error, 'GET', url);
      throw error;
    }
  }

  private async post<T>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data);
      
      // Handle different response formats
      if (response.data && typeof response.data === 'object') {
        // Standard API response format
        if ('success' in response.data) {
          if (!response.data.success) {
            // Handle specific error cases
            if (response.status === 412 && response.data.data) {
              // Magic link registration required
              const customError = new Error(response.data.message || 'Registration required');
              (customError as any).response = response;
              throw customError;
            }
            
            throw new Error(response.data.error || response.data.message || 'API request failed');
          }
          return response.data.data!;
        }
        
        // Direct data response
        return response.data as T;
      }
      
      return response.data as T;
      
    } catch (error) {
      console.error(`❌ POST ${url} failed:`, error);
      this.handleApiError(error, 'POST', url);
      throw error;
    }
  }

  private async put<T>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data);
      
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        if (!response.data.success) {
          throw new Error(response.data.error || response.data.message || 'API request failed');
        }
        return response.data.data!;
      }
      
      return response.data as T;
      
    } catch (error) {
      console.error(`❌ PUT ${url} failed:`, error);
      this.handleApiError(error, 'PUT', url);
      throw error;
    }
  }

  private async delete<T>(url: string): Promise<T> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url);
      
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        if (!response.data.success) {
          throw new Error(response.data.error || response.data.message || 'API request failed');
        }
        return response.data.data!;
      }
      
      return response.data as T;
      
    } catch (error) {
      console.error(`❌ DELETE ${url} failed:`, error);
      this.handleApiError(error, 'DELETE', url);
      throw error;
    }
  }

  private handleApiError(error: any, method: string, url: string): void {
    if (error.response?.status === 404) {
      console.error(`🔍 ${method} ${url} - Endpoint not found. Available endpoints:`, this.getAvailableEndpoints());
      
      // Show user-friendly error message
      if (typeof window !== 'undefined') {
        console.error('💡 Suggestion: Check if your backend server is running on the correct port');
      }
    }
  }

  // ========== Health Check ==========
  async healthCheck(): Promise<{ status: string; version: string; features: string[] }> {
    try {
      // Try the health endpoint without /api prefix first
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  // ========== Authentication API ==========
  async sendMagicLink(request: MagicLinkRequest): Promise<MagicLinkResponse> {
    return this.post<MagicLinkResponse>(API_ENDPOINTS.AUTH.MAGIC_LINK, request);
  }

  async verifyMagicLink(request: VerifyMagicLinkRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY, request);
  }

  async registerWithMagicLink(token: string, request: MagicLinkUserRequest): Promise<AuthResponse> {
    return this.post<AuthResponse>(`${API_ENDPOINTS.AUTH.REGISTER_MAGIC}?token=${encodeURIComponent(token)}`, request);
  }

  async generateQRCode(request: QRCodeRequest): Promise<QRCodeResponse> {
    return this.post<QRCodeResponse>(API_ENDPOINTS.AUTH.QR.GENERATE, request);
  }

  async scanQRCode(qrCode: string): Promise<void> {
    return this.post<void>(API_ENDPOINTS.QR.SCAN, { qrCode });
  }

  async checkQRStatus(secret: string): Promise<QRStatusResponse> {
    return this.get<QRStatusResponse>(`${API_ENDPOINTS.AUTH.QR.STATUS}?secret=${encodeURIComponent(secret)}`);
  }

  async loginWithQRCode(secret: string): Promise<AuthResponse> {
    return this.post<AuthResponse>(API_ENDPOINTS.AUTH.QR.LOGIN, { secret });
  }

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

    if (response.data && 'success' in response.data) {
      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message || 'Upload failed');
      }
      return response.data.data!;
    }

    return response.data as UploadResult;
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
};

export const fileApi = {
  upload: (file: File) => apiClient.uploadFile(file),
};

export default apiClient;