// src/hooks/use-auth.ts - Fixed version
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AuthState,
  AuthContextType,
  AuthResponse,
  AuthTokens,
  User,
  MagicLinkRequest,
  MagicLinkResponse,
  MagicLinkUserRequest,
  VerifyMagicLinkRequest,
  QRCodeRequest,
  QRCodeResponse,
  QRStatusResponse,
  RefreshTokenRequest,
  RegisterRequest,
  LoginRequest,
  LoginMethod,
  AuthError,
  DeviceInfo
} from '@/types/auth';
import { authApi, healthApi } from '@/lib/api';
import { getStoredTokens, setStoredTokens, removeStoredTokens } from '@/lib/storage';
import { toast } from 'sonner';

const INITIAL_STATE: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  loginMethod: null,
};

export function useAuth(): AuthContextType {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const router = useRouter();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isRefreshingRef = useRef(false);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper function to clear auth state
  const clearAuthState = useCallback(() => {
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

    console.log('💾 Storing tokens:', tokens);
    // FIXED: Pass expiresAt to storage function
    setStoredTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
    
    updateState({
      user: authResponse.user,
      tokens,
      isAuthenticated: true,
      loginMethod: method,
      error: null,
      isLoading: false,
    });

    // Schedule token refresh
    scheduleTokenRefresh(authResponse.expiresAt.toString());
    
    console.log(`✅ Authentication successful via ${method}:`, authResponse.user.username);
    console.log('🔒 Auth state updated:', { isAuthenticated: true, user: authResponse.user });
  }, [updateState]);

  // Schedule automatic token refresh
  const scheduleTokenRefresh = useCallback((expiresAt: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const expiryTime = new Date(parseInt(expiresAt) * 1000).getTime(); // Convert Unix timestamp to milliseconds
    const currentTime = Date.now();
    const timeUntilRefresh = expiryTime - currentTime - (5 * 60 * 1000); // 5 minutes before expiry

    console.log('⏰ Token refresh scheduled:', {
      expiresAt,
      expiryTime: new Date(expiryTime),
      currentTime: new Date(currentTime),
      timeUntilRefresh,
      minutesUntilRefresh: Math.round(timeUntilRefresh / 1000 / 60)
    });

    if (timeUntilRefresh > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshToken();
      }, timeUntilRefresh);
      
      console.log(`🔄 Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
    }
  }, []);

  // Get device information
  const getDeviceInfo = useCallback((): DeviceInfo => {
    const userAgent = navigator.userAgent;
    
    // Detect OS
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    // Detect browser
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    return {
      type: 'web',
      name: `${browser} on ${os}`,
      os,
      browser,
      userAgent,
    };
  }, []);

  // ========== Magic Link Authentication ==========

  const sendMagicLink = useCallback(async (email: string): Promise<MagicLinkResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      
      // FIXED: Add required deviceType and deviceName fields
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
      
      const response = await authApi.verifyMagicLink({ token });
      
      console.log('✅ Magic link verification successful:', response);
      
      setAuthenticatedState(response, 'magic_link');
      toast.success('Successfully logged in!');
      
      return response;
    } catch (error: any) {
      console.error('❌ Magic link verification failed:', error);
      
      const errorMessage = error.response?.data?.message || 'Invalid or expired magic link';
      updateState({ isLoading: false, error: errorMessage });
      
      // Check if user registration is required
      if (error.response?.status === 412 && error.response?.data?.data?.requiresRegistration) {
        console.log('📝 Registration required');
        toast.info('Please complete your registration');
        throw { ...error, requiresRegistration: true, token: error.response.data.data.token };
      }
      
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, setAuthenticatedState]);

  const registerWithMagicLink = useCallback(async (token: string, userData: MagicLinkUserRequest): Promise<AuthResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      
      console.log('📝 Registering with magic link:', userData);
      
      const response = await authApi.registerWithMagicLink(token, userData);
      
      console.log('✅ Registration successful:', response);
      
      setAuthenticatedState(response, 'magic_link');
      toast.success(`Welcome ${userData.firstName}! Your account has been created.`);
      
      return response;
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      
      const errorMessage = error.response?.data?.message || 'Registration failed';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, setAuthenticatedState]);

  // ========== QR Code Authentication ==========

  const generateQRCode = useCallback(async (deviceInfo: string, platform: 'web' | 'mobile' | 'desktop' = 'web'): Promise<QRCodeResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      
      // FIXED: Send correct field names
      const response = await authApi.generateQRCode({ 
        deviceType: platform, 
        deviceName: deviceInfo 
      });
      
      updateState({ isLoading: false });
      
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to generate QR code';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState]);

  const checkQRStatus = useCallback(async (secret: string): Promise<QRStatusResponse> => {
    try {
      const response = await authApi.checkQRStatus(secret);
      return response;
    } catch (error: any) {
      console.error('QR status check failed:', error);
      throw error;
    }
  }, []);

  const loginWithQRCode = useCallback(async (secret: string): Promise<AuthResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const response = await authApi.loginWithQRCode(secret);
      
      setAuthenticatedState(response, 'qr_code');
      toast.success('Successfully logged in via QR code!');
      
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'QR code login failed';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, setAuthenticatedState]);

  const scanQRCode = useCallback(async (qrCode: string): Promise<void> => {
    try {
      await authApi.scanQRCode(qrCode);
      toast.success('QR code scanned successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to scan QR code';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // ========== Session Management ==========

  const refreshToken = useCallback(async (): Promise<void> => {
    if (isRefreshingRef.current) return;
    
    const tokens = getStoredTokens();
    if (!tokens?.refreshToken) {
      clearAuthState();
      return;
    }

    try {
      isRefreshingRef.current = true;
      
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

  const logoutAllDevices = useCallback(async (): Promise<void> => {
    try {
      await authApi.logoutAllDevices();
      clearAuthState();
      toast.success('Logged out from all devices');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to logout from all devices';
      toast.error(errorMessage);
      throw error;
    }
  }, [clearAuthState]);

  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      const result = await authApi.validateToken();
      
      if (result.valid && result.user) {
        updateState({
          user: result.user,
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

  // ========== Legacy Authentication ==========

  const register = useCallback(async (userData: RegisterRequest): Promise<AuthResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const response = await authApi.register(userData);
      
      setAuthenticatedState(response, 'password');
      toast.success('Registration successful!');
      
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, setAuthenticatedState]);

  const login = useCallback(async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const response = await authApi.login(credentials);
      
      setAuthenticatedState(response, 'password');
      toast.success('Login successful!');
      
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, setAuthenticatedState]);

  // ========== Utilities ==========

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const setUser = useCallback((user: User) => {
    updateState({ user });
  }, [updateState]);

  // ========== Initialization ==========

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check if we have stored tokens
        const storedTokens = getStoredTokens();
        
        if (!storedTokens?.accessToken) {
          updateState({ isLoading: false });
          return;
        }

        // Check if backend is accessible
        try {
          await healthApi.check();
        } catch (error) {
          console.warn('Backend health check failed, skipping auth validation');
          updateState({ isLoading: false });
          return;
        }

        // Validate token with backend
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
  }, [validateToken, scheduleTokenRefresh, clearAuthState, updateState]);

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