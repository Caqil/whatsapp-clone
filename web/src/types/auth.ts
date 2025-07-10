// src/types/auth.ts - Fixed types to match backend
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
  isOnline: boolean;
  isVerified: boolean;
  verifiedAt?: string;
  lastLoginAt?: string;
  loginMethod?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Magic Link Authentication ==========

export interface MagicLinkRequest {
  email: string;
  deviceType: 'web' | 'mobile' | 'desktop';
  deviceName?: string;
}

export interface MagicLinkResponse {
  message: string;
  expiresAt: string;
  email: string;
}

export interface VerifyMagicLinkRequest {
  token: string;
}

export interface MagicLinkUserRequest {
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
}

// ========== QR Code Authentication ==========

export interface QRCodeRequest {
  deviceType: 'web' | 'mobile' | 'desktop';
  deviceName?: string;
}

export interface QRCodeResponse {
  qrCode: string;
  secret: string;
  expiresAt: string;
}

export interface QRCodeScanRequest {
  qrCode: string;
}

export interface QRStatusResponse {
  status: "pending" | "used" | "expired" | "cancelled" | "scanned";
  user?: User;
  scannedAt?: string;
}

// ========== Session Management ==========

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
}

// ========== Device Information ==========

export interface DeviceInfo {
  type: 'web' | 'mobile' | 'desktop';
  name: string;
  os?: string;
  browser?: string;
  userAgent: string;
}

export interface SessionInfo {
  id: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  lastActivity: string;
  isCurrentSession: boolean;
  createdAt: string;
}

// ========== Auth Error Types ==========

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_ALREADY_EXISTS'
  | 'USERNAME_TAKEN'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'QR_CODE_EXPIRED'
  | 'QR_CODE_INVALID'
  | 'MAGIC_LINK_EXPIRED'
  | 'MAGIC_LINK_INVALID'
  | 'SESSION_EXPIRED'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR';

// ========== Auth State Types ==========

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginMethod: LoginMethod | null;
}

export type LoginMethod = 'magic_link' | 'qr_code' | 'password';

export interface AuthContextType extends AuthState {
  // Magic Link Authentication
  sendMagicLink: (email: string) => Promise<MagicLinkResponse>;
  verifyMagicLink: (token: string) => Promise<AuthResponse>;
  registerWithMagicLink: (token: string, userData: MagicLinkUserRequest) => Promise<AuthResponse>;
  
  // QR Code Authentication
  generateQRCode: (deviceInfo: string, platform: 'web' | 'mobile' | 'desktop') => Promise<QRCodeResponse>;
  checkQRStatus: (secret: string) => Promise<QRStatusResponse>;
  loginWithQRCode: (secret: string) => Promise<AuthResponse>;
  scanQRCode: (qrCode: string) => Promise<void>;
  
  // Session Management
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  validateToken: () => Promise<boolean>;
  
  // Legacy Authentication
  register: (userData: RegisterRequest) => Promise<AuthResponse>;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  
  // Utilities
  clearError: () => void;
  setUser: (user: User) => void;
}

// ========== Auth Hook Types ==========

export interface UseAuthOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
  validateOnMount?: boolean;
  autoRefresh?: boolean;
}

export interface UseMagicLinkOptions {
  onSuccess?: (response: AuthResponse) => void;
  onError?: (error: AuthError) => void;
  autoRedirect?: boolean;
}

export interface UseQRCodeOptions {
  pollInterval?: number; // milliseconds
  maxPolls?: number;
  onSuccess?: (response: AuthResponse) => void;
  onError?: (error: AuthError) => void;
  onStatusChange?: (status: QRStatusResponse['status']) => void;
}

// ========== Form Validation Types ==========

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
  agreeToTerms: boolean;
}

export interface MagicLinkFormData {
  email: string;
}

export interface MagicLinkRegisterFormData {
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
}

// ========== Legacy Password Authentication ==========

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ========== Auth Event Types ==========

export type AuthEventType = 
  | 'login'
  | 'logout'
  | 'register'
  | 'token_refresh'
  | 'session_expired'
  | 'magic_link_sent'
  | 'magic_link_verified'
  | 'qr_code_generated'
  | 'qr_code_scanned'
  | 'user_updated';

export interface AuthEvent {
  type: AuthEventType;
  user?: User;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ========== Storage Types ==========

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  issuedAt?: string;
}

export interface StoredUserSession {
  user: User;
  tokens: StoredTokens;
  loginMethod: LoginMethod;
  lastActivity: string;
}

// ========== API Response Wrappers ==========

export interface AuthApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  requiresRegistration?: boolean;
  token?: string; // For magic link registration flow
}