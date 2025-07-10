// Complete fixed version of useAuth hook
// web/src/hooks/use-auth.ts

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Import your existing API client
import { authApi } from '@/lib/api';

// Import your types
import type {
  AuthState,
  AuthContextType,
  AuthResponse,
  AuthTokens,
  MagicLinkResponse,
  LoginMethod,
} from '@/types/auth';
import { User } from '@/types/user';

const INITIAL_STATE: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  loginMethod: null,
};

// Storage functions - these should be defined in your storage utility
const getStoredTokens = (): { accessToken: string; refreshToken: string; expiresAt?: string } | null => {
  try {
    const accessToken = localStorage.getItem('auth_access_token');
    const refreshToken = localStorage.getItem('auth_refresh_token');
    const expiresAt = localStorage.getItem('auth_expires_at');
    
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken, expiresAt: expiresAt || undefined };
    }
    return null;
  } catch {
    return null;
  }
};

const setStoredTokens = (accessToken: string, refreshToken: string, expiresAt?: string): void => {
  try {
    localStorage.setItem('auth_access_token', accessToken);
    localStorage.setItem('auth_refresh_token', refreshToken);
    if (expiresAt) {
      localStorage.setItem('auth_expires_at', expiresAt);
    }
    localStorage.setItem('auth_issued_at', new Date().toISOString());
    
    console.log('💾 Tokens stored successfully:', {
      accessToken: accessToken ? '✅' : '❌',
      refreshToken: refreshToken ? '✅' : '❌',
      expiresAt: expiresAt || 'not provided'
    });
  } catch (error) {
    console.error('❌ Failed to store tokens:', error);
  }
};

const removeStoredTokens = (): void => {
  try {
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_expires_at');
    localStorage.removeItem('auth_issued_at');
    localStorage.removeItem('auth_user_data');
    console.log('🗑️ Tokens removed successfully');
  } catch (error) {
    console.error('❌ Failed to remove tokens:', error);
  }
};

export function useAuth(): AuthContextType {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const router = useRouter();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isRefreshingRef = useRef(false);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      console.log('🔄 Auth state updated:', newState);
      return newState;
    });
  }, []);

  // Helper function to clear auth state
  const clearAuthState = useCallback(() => {
    console.log('🧹 Clearing auth state');
    removeStoredTokens();
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    updateState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      loginMethod: null,
      error: null,
      isLoading: false,
    });
  }, [updateState]);

  // Helper function to set authenticated state
  const setAuthenticatedState = useCallback((authResponse: AuthResponse, method: LoginMethod) => {
    console.log('🔧 Setting authenticated state:', authResponse);
    
    const tokens: AuthTokens = {
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      expiresAt: authResponse.expiresAt.toString(),
    };

    // Store tokens in localStorage
    setStoredTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
    
    // Store user data
    try {
      localStorage.setItem('auth_user_data', JSON.stringify(authResponse.user));
    } catch (error) {
      console.error('❌ Failed to store user data:', error);
    }
    
    // Update state
    updateState({
      user: authResponse.user,
      tokens,
      isAuthenticated: true,
      loginMethod: method,
      error: null,
      isLoading: false,
    });
    
    console.log(`✅ Authentication successful via ${method}:`, authResponse.user.email);
    
    // Schedule token refresh if needed
    if (authResponse.expiresAt) {
      scheduleTokenRefresh(authResponse.expiresAt.toString());
    }
  }, [updateState]);

  // Schedule automatic token refresh
  const scheduleTokenRefresh = useCallback((expiresAt: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const expiryTime = new Date(parseInt(expiresAt) * 1000).getTime();
    const currentTime = Date.now();
    const timeUntilRefresh = expiryTime - currentTime - (5 * 60 * 1000); // 5 minutes before expiry

    if (timeUntilRefresh > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshToken();
      }, timeUntilRefresh);
      
      console.log(`🔄 Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
    }
  }, []);

  // Magic Link Authentication
  const sendMagicLink = useCallback(async (email: string): Promise<MagicLinkResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      
      // Use your existing authApi
      const response = await authApi.sendMagicLink({ 
        email,
        deviceType: 'web',
        deviceName: 'Web Browser'
      });
      
      updateState({ isLoading: false });
      toast.success('Magic link sent to your email!');
      
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send magic link';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState]);

  const verifyMagicLink = useCallback(async (token: string): Promise<AuthResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      
      console.log('🔍 Verifying magic link token:', token);
      
      // Use your existing authApi
      const response = await authApi.verifyMagicLink({ token });
      
      console.log('✅ Magic link verification successful:', response);
      
      // Set authenticated state
      setAuthenticatedState(response, 'magic_link');
      toast.success('Successfully logged in!');
      
      return response;
    } catch (error: any) {
      console.error('❌ Magic link verification failed:', error);
      
      const errorMessage = error.response?.data?.message || 'Invalid or expired magic link';
      updateState({ isLoading: false, error: errorMessage });
      
      // Check if user registration is required
      if (error.response?.status === 412) {
        console.log('📝 Registration required');
        toast.info('Please complete your registration');
        throw { ...error, requiresRegistration: true };
      }
      
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, setAuthenticatedState]);

  const registerWithMagicLink = useCallback(async (token: string, userData: any): Promise<AuthResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      
      console.log('📝 Registering with magic link:', userData);
      
      // Use your existing authApi
      const response = await authApi.registerWithMagicLink(token, userData);
      
      console.log('✅ Registration successful:', response);
      
      setAuthenticatedState(response, 'magic_link');
      toast.success(`Welcome ${userData.firstName}!`);
      
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, setAuthenticatedState]);

  const refreshToken = useCallback(async (): Promise<void> => {
    if (isRefreshingRef.current) return;
    
    const tokens = getStoredTokens();
    if (!tokens?.refreshToken) {
      clearAuthState();
      return;
    }

    try {
      isRefreshingRef.current = true;
      
      // Use your existing authApi
      const response = await authApi.refreshToken({ refreshToken: tokens.refreshToken });
      
      setAuthenticatedState(response, state.loginMethod || 'magic_link');
      
      console.log('🔄 Token refreshed successfully');
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
      clearAuthState();
      toast.error('Session expired. Please log in again.');
      router.push('/login');
    } finally {
      isRefreshingRef.current = false;
    }
  }, [clearAuthState, setAuthenticatedState, state.loginMethod, router]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const tokens = getStoredTokens();
      if (tokens?.refreshToken) {
        await authApi.logout(tokens.refreshToken);
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      clearAuthState();
      toast.success('Logged out successfully');
    }
  }, [clearAuthState]);

  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      // Use your existing authApi
      const result = await authApi.validateToken();
      
      if (result.valid && result.user) {
        const tokens = getStoredTokens();
        updateState({
          user: result.user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } else {
        clearAuthState();
        return false;
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      clearAuthState();
      return false;
    }
  }, [updateState, clearAuthState]);

  // Initialization
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        
        // Check if we have stored tokens
        const storedTokens = getStoredTokens();
        
        if (!storedTokens?.accessToken) {
          console.log('🔍 No stored tokens found');
          updateState({ isLoading: false });
          return;
        }

        console.log('🔍 Found stored tokens, validating...');
        
        // Check if tokens are expired
        if (storedTokens.expiresAt) {
          const expiryTime = new Date(parseInt(storedTokens.expiresAt) * 1000);
          const now = new Date();
          
          if (now > expiryTime) {
            console.log('⏰ Tokens are expired, clearing auth state');
            clearAuthState();
            return;
          }
        }

        // Load user data from storage
        try {
          const userData = localStorage.getItem('auth_user_data');
          if (userData) {
            const user = JSON.parse(userData);
            updateState({
              user,
              tokens: storedTokens,
              isAuthenticated: true,
              isLoading: false,
              loginMethod: 'magic_link', // Default to magic_link
            });
            
            console.log('✅ Auth initialized from storage:', user.email);
            
            // Schedule token refresh
            if (storedTokens.expiresAt) {
              scheduleTokenRefresh(storedTokens.expiresAt);
            }
            
            return;
          }
        } catch (error) {
          console.error('❌ Failed to load user data from storage:', error);
        }

        // Validate token with backend as fallback
        const isValid = await validateToken();
        
        if (mounted && isValid && storedTokens.expiresAt) {
          scheduleTokenRefresh(storedTokens.expiresAt);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (mounted) {
          clearAuthState();
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Other required methods (implement based on your needs)
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const setUser = useCallback((user: User) => {
    updateState({ user });
  }, [updateState]);

  // Placeholder implementations for other methods
  const generateQRCode = useCallback(async () => {
    throw new Error('Not implemented');
  }, []);

  const checkQRStatus = useCallback(async () => {
    throw new Error('Not implemented');
  }, []);

  const loginWithQRCode = useCallback(async () => {
    throw new Error('Not implemented');
  }, []);

  const scanQRCode = useCallback(async () => {
    throw new Error('Not implemented');
  }, []);

  const logoutAllDevices = useCallback(async () => {
    throw new Error('Not implemented');
  }, []);

  const register = useCallback(async () => {
    throw new Error('Not implemented');
  }, []);

  const login = useCallback(async () => {
    throw new Error('Not implemented');
  }, []);

  return {
    // State
    ...state,
    
    // Magic Link Authentication
    sendMagicLink,
    verifyMagicLink,
    registerWithMagicLink,
    
    // QR Code Authentication
    generateQRCode,
    checkQRStatus,
    loginWithQRCode,
    scanQRCode,
    
    // Session Management
    refreshToken,
    logout,
    logoutAllDevices,
    validateToken,
    
    // Legacy Authentication
    register,
    login,
    
    // Utilities
    clearError,
    setUser,
  };
}