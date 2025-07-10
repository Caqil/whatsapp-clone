// src/lib/auth.ts
import { jwtDecode } from 'jwt-decode';
import type { TokenPayload, AuthResponse } from '@/types/auth';
import { getStoredTokens, setStoredTokens, removeStoredTokens } from './storage';
import { authApi } from './api';
import { User } from '@/types/user';

// JWT Token Utilities
export class AuthTokenManager {
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

  /**
   * Decode JWT token and extract payload
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwtDecode<TokenPayload>(token);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return true;

      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Check if token needs refresh (expires within threshold)
   */
  static shouldRefreshToken(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return true;

      const currentTime = Date.now();
      const expiryTime = decoded.exp * 1000;
      return (expiryTime - currentTime) < this.TOKEN_REFRESH_THRESHOLD;
    } catch {
      return true;
    }
  }

  /**
   * Get user ID from token
   */
  static getUserIdFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.user_id || null;
  }

  /**
   * Get email from token
   */
  static getEmailFromToken(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.email || null;
  }

  /**
   * Validate token format and structure
   */
  static isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    return parts.length === 3; // JWT has 3 parts: header.payload.signature
  }

  /**
   * Get token expiry time as Date
   */
  static getTokenExpiryDate(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded) return null;
    
    return new Date(decoded.exp * 1000);
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  static getTimeUntilExpiry(token: string): number {
    const expiryDate = this.getTokenExpiryDate(token);
    if (!expiryDate) return 0;
    
    return Math.max(0, expiryDate.getTime() - Date.now());
  }
}

// Authentication State Manager
export class AuthManager {
  private static instance: AuthManager;
  private refreshPromise: Promise<string> | null = null;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Initialize authentication state from stored tokens
   */
  async initializeAuth(): Promise<{ user: User | null; isAuthenticated: boolean }> {
    const { accessToken, refreshToken } = getStoredTokens();
    
    if (!accessToken || !refreshToken) {
      return { user: null, isAuthenticated: false };
    }

    // Check if access token is valid
    if (!AuthTokenManager.isTokenExpired(accessToken)) {
      const userId = AuthTokenManager.getUserIdFromToken(accessToken);
      if (userId) {
        try {
          // Token is valid, but we might want to get fresh user data
          // For now, we'll consider the user authenticated
          return { user: null, isAuthenticated: true }; // User data will be fetched separately
        } catch (error) {
          console.error('Failed to verify token:', error);
        }
      }
    }

    // Access token is expired, try to refresh
    try {
      const newAccessToken = await this.refreshAccessToken();
      if (newAccessToken) {
        return { user: null, isAuthenticated: true };
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuth();
    }

    return { user: null, isAuthenticated: false };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const { refreshToken } = getStoredTokens();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.performRefresh(refreshToken);
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(refreshToken: string): Promise<string> {
    try {
      const response = await authApi.refreshToken({ refreshToken });
      
      // Store new tokens
      setStoredTokens(response.accessToken, response.refreshToken);
      
      return response.accessToken;
    } catch (error) {
      // Refresh failed, clear stored tokens
      this.clearAuth();
      throw error;
    }
  }

  /**
   * Handle successful authentication
   */
  handleAuthSuccess(authResponse: AuthResponse): void {
    const { accessToken, refreshToken, user } = authResponse;
    
    // Store tokens
    setStoredTokens(accessToken, refreshToken);
    
    // Set up automatic token refresh
    this.scheduleTokenRefresh(accessToken);
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(token: string): void {
    const timeUntilRefresh = AuthTokenManager.getTimeUntilExpiry(token) - 60000; // 1 minute before expiry
    
    if (timeUntilRefresh > 0) {
      setTimeout(() => {
        this.refreshAccessToken().catch(console.error);
      }, timeUntilRefresh);
    }
  }

  /**
   * Clear authentication state
   */
  clearAuth(): void {
    removeStoredTokens();
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    const { accessToken } = getStoredTokens();
    
    if (!accessToken) return false;
    
    return !AuthTokenManager.isTokenExpired(accessToken);
  }

  /**
   * Get current access token if valid
   */
  getValidAccessToken(): string | null {
    const { accessToken } = getStoredTokens();
    
    if (!accessToken || AuthTokenManager.isTokenExpired(accessToken)) {
      return null;
    }
    
    return accessToken;
  }

  /**
   * Get current user ID from token
   */
  getCurrentUserId(): string | null {
    const token = this.getValidAccessToken();
    if (!token) return null;
    
    return AuthTokenManager.getUserIdFromToken(token);
  }

  /**
   * Get current user email from token
   */
  getCurrentUserEmail(): string | null {
    const token = this.getValidAccessToken();
    if (!token) return null;
    
    return AuthTokenManager.getEmailFromToken(token);
  }
}

// Magic Link Utilities
export class MagicLinkManager {
  /**
   * Generate magic link URL for frontend
   */
  static generateMagicLinkUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/auth/verify?token=${encodeURIComponent(token)}`;
  }

  /**
   * Extract token from magic link URL
   */
  static extractTokenFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('token');
    } catch {
      return null;
    }
  }

  /**
   * Validate magic link token format
   */
  static isValidMagicLinkToken(token: string): boolean {
    // Magic link tokens are typically longer than JWTs and hex-encoded
    return typeof token === 'string' && token.length >= 32 && /^[a-f0-9]+$/i.test(token);
  }
}

// QR Code Utilities
export class QRCodeManager {
  /**
   * Generate QR code data for authentication
   */
  static generateQRCodeData(qrCode: string, secret: string): string {
    // Create a JSON payload for the QR code
    const data = {
      type: 'whatsapp_web_auth',
      qrCode,
      secret,
      timestamp: Date.now(),
    };
    
    return JSON.stringify(data);
  }

  /**
   * Parse QR code data
   */
  static parseQRCodeData(data: string): { qrCode: string; secret: string } | null {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'whatsapp_web_auth' && parsed.qrCode && parsed.secret) {
        return {
          qrCode: parsed.qrCode,
          secret: parsed.secret,
        };
      }
    } catch {
      // Invalid JSON or format
    }
    
    return null;
  }

  /**
   * Check if QR code data is expired
   */
  static isQRCodeExpired(data: string, maxAgeMs = 5 * 60 * 1000): boolean {
    try {
      const parsed = JSON.parse(data);
      const age = Date.now() - (parsed.timestamp || 0);
      return age > maxAgeMs;
    } catch {
      return true;
    }
  }
}

// Device Detection Utilities
export class DeviceManager {
  /**
   * Get device type based on user agent
   */
  static getDeviceType(): 'web' | 'mobile' | 'desktop' {
    if (typeof window === 'undefined') return 'web';
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
      return 'mobile';
    }
    
    if (/electron/.test(userAgent)) {
      return 'desktop';
    }
    
    return 'web';
  }

  /**
   * Get device name/description
   */
  static getDeviceName(): string {
    if (typeof window === 'undefined') return 'Unknown Device';
    
    const userAgent = navigator.userAgent;
    
    // Extract browser and OS info
    const browserMatch = userAgent.match(/(chrome|firefox|safari|edge|opera)\/[\d\.]+/i);
    const osMatch = userAgent.match(/(windows|mac|linux|android|ios)/i);
    
    const browser = browserMatch ? browserMatch[1] : 'Unknown Browser';
    const os = osMatch ? osMatch[1] : 'Unknown OS';
    
    return `${browser} on ${os}`;
  }

  /**
   * Generate unique device ID (for session tracking)
   */
  static generateDeviceId(): string {
    // Create a pseudo-unique device ID based on various factors
    const factors = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < factors.length; i++) {
      const char = factors.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}

// Permission Utilities
export class PermissionManager {
  /**
   * Check if user has permission for specific action
   */
  static hasPermission(user: User | null, permission: string): boolean {
    if (!user) return false;
    
    // Basic permission checks - extend based on your needs
    switch (permission) {
      case 'send_messages':
        return user.isVerified;
      case 'create_groups':
        return user.isVerified;
      case 'upload_files':
        return user.isVerified;
      default:
        return true;
    }
  }

  /**
   * Check if user can perform action in specific chat
   */
  static canPerformChatAction(user: User | null, chatId: string, action: string): boolean {
    if (!user) return false;
    
    // Implement chat-specific permission logic
    // This would typically involve checking user role in the chat
    return true; // Simplified for now
  }
}

// Export singleton instances
export const authManager = AuthManager.getInstance();

// Export utility functions
export const authUtils = {
  // Token utilities
  decodeToken: AuthTokenManager.decodeToken,
  isTokenExpired: AuthTokenManager.isTokenExpired,
  shouldRefreshToken: AuthTokenManager.shouldRefreshToken,
  getUserIdFromToken: AuthTokenManager.getUserIdFromToken,
  getEmailFromToken: AuthTokenManager.getEmailFromToken,
  isValidTokenFormat: AuthTokenManager.isValidTokenFormat,
  getTokenExpiryDate: AuthTokenManager.getTokenExpiryDate,
  getTimeUntilExpiry: AuthTokenManager.getTimeUntilExpiry,
  
  // Magic link utilities
  generateMagicLinkUrl: MagicLinkManager.generateMagicLinkUrl,
  extractTokenFromUrl: MagicLinkManager.extractTokenFromUrl,
  isValidMagicLinkToken: MagicLinkManager.isValidMagicLinkToken,
  
  // QR code utilities
  generateQRCodeData: QRCodeManager.generateQRCodeData,
  parseQRCodeData: QRCodeManager.parseQRCodeData,
  isQRCodeExpired: QRCodeManager.isQRCodeExpired,
  
  // Device utilities
  getDeviceType: DeviceManager.getDeviceType,
  getDeviceName: DeviceManager.getDeviceName,
  generateDeviceId: DeviceManager.generateDeviceId,
  
  // Permission utilities
  hasPermission: PermissionManager.hasPermission,
  canPerformChatAction: PermissionManager.canPerformChatAction,
};
