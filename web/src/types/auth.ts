// src/types/auth.ts
import type { User } from './user';

// Auth status types
export type MagicLinkStatus = 'pending' | 'used' | 'expired' | 'cancelled';
export type DeviceType = 'web' | 'mobile' | 'desktop';

// Magic Link entities
export interface MagicLink {
  id: string;
  email: string;
  token: string;
  userId?: string;
  status: MagicLinkStatus;
  expiresAt: string;
  usedAt?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
}

// QR Code entities
export interface QRCodeSession {
  id: string;
  qrCode: string;
  secret: string;
  userId?: string;
  status: MagicLinkStatus;
  expiresAt: string;
  scannedAt?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
}

// User Session
export interface UserSession {
  id: string;
  userId: string;
  refreshToken: string;
  deviceType: DeviceType;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// Request types
export interface MagicLinkRequest {
  email: string;
  deviceType: DeviceType;
  deviceName?: string;
}

export interface VerifyMagicLinkRequest {
  token: string;
}

export interface QRCodeRequest {
  deviceType: DeviceType;
  deviceName?: string;
}

export interface QRCodeScanRequest {
  qrCode: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface MagicLinkUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  phone?: string;
  bio?: string;
}

// Legacy password requests (backward compatibility)
export interface UserLoginRequest {
  email: string;
  password?: string;
}

export interface UserRegisterRequest {
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
}

// Response types
export interface MagicLinkResponse {
  message: string;
  expiresAt: string;
  email: string;
}

export interface QRCodeResponse {
  qrCode: string;
  secret: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface QRStatusResponse {
  status: MagicLinkStatus;
  user?: User;
  scannedAt?: string;
}

// Auth context types
export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Magic link methods
  sendMagicLink: (request: MagicLinkRequest) => Promise<MagicLinkResponse>;
  verifyMagicLink: (request: VerifyMagicLinkRequest) => Promise<AuthResponse>;
  registerWithMagicLink: (token: string, userRequest: MagicLinkUserRequest) => Promise<AuthResponse>;
  
  // QR code methods
  generateQRCode: (request: QRCodeRequest) => Promise<QRCodeResponse>;
  scanQRCode: (request: QRCodeScanRequest) => Promise<void>;
  checkQRStatus: (secret: string) => Promise<QRStatusResponse>;
  loginWithQRCode: (secret: string) => Promise<AuthResponse>;
  
  // Session methods
  refreshAccessToken: () => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  
  // Legacy methods (backward compatibility)
  login: (request: UserLoginRequest) => Promise<AuthResponse>;
  register: (request: UserRegisterRequest) => Promise<User>;
}

// Auth store types (for Zustand)
export interface AuthStore {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (auth: Partial<AuthResponse>) => void;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  
  // Persistence
  initializeAuth: () => void;
  persistAuth: (auth: AuthResponse) => void;
}

// Token payload (JWT)
export interface TokenPayload {
  user_id: string;
  email: string;
  exp: number;
  iat: number;
}

// Auth guard types
export interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

// Auth error types
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Common auth error codes
export const AUTH_ERROR_CODES = {
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MAGIC_LINK_EXPIRED: 'MAGIC_LINK_EXPIRED',
  MAGIC_LINK_USED: 'MAGIC_LINK_USED',
  QR_CODE_EXPIRED: 'QR_CODE_EXPIRED',
  QR_CODE_USED: 'QR_CODE_USED',
  REGISTRATION_REQUIRED: 'REGISTRATION_REQUIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];