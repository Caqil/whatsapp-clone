// src/hooks/use-auth.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { 
  AuthResponse,
  MagicLinkRequest,
  MagicLinkResponse,
  VerifyMagicLinkRequest,
  QRCodeRequest,
  QRCodeResponse,
  QRStatusResponse,
  QRCodeScanRequest,
  RefreshTokenRequest,
  MagicLinkUserRequest,
  UserLoginRequest,
  UserRegisterRequest,
  AuthError,
  AuthErrorCode
} from '@/types/auth';
import { authApi, userApi } from '@/lib/api';
import { authManager, authUtils } from '@/lib/auth';
import { 
  getStoredTokens, 
  setStoredTokens, 
  removeStoredTokens,
  getStoredUser,
  setStoredUser,
  removeStoredUser
} from '@/lib/storage';
import { AUTH_ERROR_CODES } from '@/types/auth';
import { User } from '@/types/user';
import { toast } from 'sonner';

interface UseAuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: AuthError | null;
}

interface UseAuthActions {
  // Magic Link Authentication
  sendMagicLink: (request: MagicLinkRequest) => Promise<MagicLinkResponse>;
  verifyMagicLink: (request: VerifyMagicLinkRequest) => Promise<void>;
  registerWithMagicLink: (token: string, userRequest: MagicLinkUserRequest) => Promise<void>;
  
  // QR Code Authentication
  generateQRCode: (request: QRCodeRequest) => Promise<QRCodeResponse>;
  scanQRCode: (request: QRCodeScanRequest) => Promise<void>;
  checkQRStatus: (secret: string) => Promise<QRStatusResponse>;
  loginWithQRCode: (secret: string) => Promise<void>;
  
  // Session Management
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  
  // Legacy Authentication
  login: (request: UserLoginRequest) => Promise<void>;
  register: (request: UserRegisterRequest) => Promise<User>;
  
  // User Management
  updateUser: (user: User) => void;
  clearError: () => void;
  
  // Utilities
  checkAuthStatus: () => Promise<boolean>;
  forceReauthenticate: () => void;
}

export interface UseAuthReturn extends UseAuthState, UseAuthActions {}

/**
 * Authentication hook for managing user authentication state and actions
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const initializePromise = useRef<Promise<void> | null>(null);

  // State
  const [state, setState] = useState<UseAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInitialized: false,
    error: null,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<UseAuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Error handler
  const handleError = useCallback((error: unknown, context: string) => {
    console.error(`Auth Error (${context}):`, error);
    
    const authError: AuthError = {
      code: AUTH_ERROR_CODES.UNAUTHORIZED,
      message: 'Authentication failed',
    };

    if (error instanceof Error) {
      authError.message = error.message;
      
      // Map specific error messages to codes
      if (error.message.includes('expired')) {
        authError.code = AUTH_ERROR_CODES.TOKEN_EXPIRED;
      } else if (error.message.includes('invalid')) {
        authError.code = AUTH_ERROR_CODES.INVALID_TOKEN;
      } else if (error.message.includes('not found')) {
        authError.code = AUTH_ERROR_CODES.USER_NOT_FOUND;
      }
    }

    updateState({ error: authError, isLoading: false });
    
    // Show toast for user-facing errors
    if (context !== 'initialization') {
      toast(authError.message);
    }
  }, [updateState]);

  // Success handler
  const handleAuthSuccess = useCallback((authResponse: AuthResponse) => {
    const { user, accessToken, refreshToken } = authResponse;
    
    // Store tokens
    setStoredTokens(accessToken, refreshToken);
    setStoredUser(user);
    
    // Update auth manager
    authManager.handleAuthSuccess(authResponse);
    
    // Update state
    updateState({
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    toast(`Hello, ${user.firstName}!`);
  }, [updateState, toast]);

  // Initialize authentication
  const initialize = useCallback(async () => {
    if (initializePromise.current) {
      return initializePromise.current;
    }

    initializePromise.current = (async () => {
      try {
        updateState({ isLoading: true });
        
        const result = await authManager.initializeAuth();
        
        if (result.isAuthenticated) {
          const storedUser = getStoredUser();
          if (storedUser) {
            updateState({
              user: storedUser,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
          } else {
            // Token exists but no user data, fetch from API
            try {
              const user = await userApi.getProfile?.() as User;
              setStoredUser(user);
              updateState({
                user,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
                error: null,
              });
            } catch (error) {
              // Failed to get user data, clear auth
              await performLogout();
            }
          }
        } else {
          updateState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
        }
      } catch (error) {
        handleError(error, 'initialization');
        updateState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    })();

    return initializePromise.current;
  }, [updateState, handleError]);

  // Logout helper
  const performLogout = useCallback(async () => {
    try {
      const { refreshToken } = getStoredTokens();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local state regardless of API call success
      authManager.clearAuth();
      removeStoredTokens();
      removeStoredUser();
      
      updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      router.push('/login');
    }
  }, [updateState, router]);

  // ========== Authentication Actions ==========

  const sendMagicLink = useCallback(async (request: MagicLinkRequest): Promise<MagicLinkResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      const response = await authApi.sendMagicLink(request);
      updateState({ isLoading: false });

      toast(`Check your email (${request.email}) for the login link.`);
      return response;
    } catch (error) {
      handleError(error, 'sendMagicLink');
      throw error;
    }
  }, [updateState, handleError, toast]);

  const verifyMagicLink = useCallback(async (request: VerifyMagicLinkRequest): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      const authResponse = await authApi.verifyMagicLink(request);
      handleAuthSuccess(authResponse);
      router.push('/chat');
    } catch (error) {
      if (error instanceof Error && error.message === 'user registration required') {
        updateState({ isLoading: false });
        // Don't handle as error, let the component handle registration flow
        throw error;
      }
      handleError(error, 'verifyMagicLink');
      throw error;
    }
  }, [updateState, handleError, handleAuthSuccess, router]);

  const registerWithMagicLink = useCallback(async (token: string, userRequest: MagicLinkUserRequest): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      const authResponse = await authApi.registerWithMagicLink(token, userRequest);
      handleAuthSuccess(authResponse);
      router.push('/chat');
    } catch (error) {
      handleError(error, 'registerWithMagicLink');
      throw error;
    }
  }, [updateState, handleError, handleAuthSuccess, router]);

  const generateQRCode = useCallback(async (request: QRCodeRequest): Promise<QRCodeResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      const response = await authApi.generateQRCode(request);
      updateState({ isLoading: false });
      return response;
    } catch (error) {
      handleError(error, 'generateQRCode');
      throw error;
    }
  }, [updateState, handleError]);

  const scanQRCode = useCallback(async (request: QRCodeScanRequest): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      await authApi.scanQRCode(request.qrCode);
      updateState({ isLoading: false });

      toast(`QR Code scanned! Login request sent to the web browser.`);
    } catch (error) {
      handleError(error, 'scanQRCode');
      throw error;
    }
  }, [updateState, handleError]);

  const checkQRStatus = useCallback(async (secret: string): Promise<QRStatusResponse> => {
    try {
      const response = await authApi.checkQRStatus(secret);
      return response;
    } catch (error) {
      console.error('QR status check failed:', error);
      throw error;
    }
  }, []);

  const loginWithQRCode = useCallback(async (secret: string): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      const authResponse = await authApi.loginWithQRCode(secret);
      handleAuthSuccess(authResponse);
      router.push('/chat');
    } catch (error) {
      handleError(error, 'loginWithQRCode');
      throw error;
    }
  }, [updateState, handleError, handleAuthSuccess, router]);

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const newToken = await authManager.refreshAccessToken();
      if (!newToken) {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await performLogout();
      throw error;
    }
  }, [performLogout]);

  const logout = useCallback(async (): Promise<void> => {
    updateState({ isLoading: true });
    await performLogout();
    
    toast.success('You have been logged out successfully.');
  }, [updateState, performLogout, toast]);

  const logoutAllDevices = useCallback(async (): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      await authApi.logoutAllDevices();
      await performLogout();

      toast.success('Logged out from all devices');
    } catch (error) {
      handleError(error, 'logoutAllDevices');
      throw error;
    }
  }, [updateState, handleError, performLogout, toast]);

  // Legacy authentication methods
  const login = useCallback(async (request: UserLoginRequest): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      // Implementation would depend on your legacy login API
      // For now, we'll throw an error to encourage magic link usage
      throw new Error('Password login is deprecated. Please use magic link login.');
    } catch (error) {
      handleError(error, 'login');
      throw error;
    }
  }, [updateState, handleError]);

  const register = useCallback(async (request: UserRegisterRequest): Promise<User> => {
    try {
      updateState({ isLoading: true, error: null });
      // Implementation would depend on your legacy register API
      throw new Error('Password registration is deprecated. Please use magic link registration.');
    } catch (error) {
      handleError(error, 'register');
      throw error;
    }
  }, [updateState, handleError]);

  // User management
  const updateUser = useCallback((user: User) => {
    setStoredUser(user);
    updateState({ user });
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Utilities
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) return false;
    
    if (authUtils.isTokenExpired(accessToken)) {
      try {
        await refreshToken();
        return true;
      } catch {
        return false;
      }
    }
    
    return true;
  }, [refreshToken]);

  const forceReauthenticate = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const { accessToken } = getStoredTokens();
    if (!accessToken) return;

    const timeUntilRefresh = authUtils.getTimeUntilExpiry(accessToken) - 60000; // 1 minute before expiry
    
    if (timeUntilRefresh > 0) {
      const timeoutId = setTimeout(() => {
        refreshToken().catch(console.error);
      }, timeUntilRefresh);

      return () => clearTimeout(timeoutId);
    }
  }, [state.isAuthenticated, refreshToken]);

  return {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    error: state.error,

    // Magic Link Authentication
    sendMagicLink,
    verifyMagicLink,
    registerWithMagicLink,

    // QR Code Authentication
    generateQRCode,
    scanQRCode,
    checkQRStatus,
    loginWithQRCode,

    // Session Management
    refreshToken,
    logout,
    logoutAllDevices,

    // Legacy Authentication
    login,
    register,

    // User Management
    updateUser,
    clearError,

    // Utilities
    checkAuthStatus,
    forceReauthenticate,
  };
}

// Auth context helper (optional, for providers)
export type AuthContextValue = UseAuthReturn;