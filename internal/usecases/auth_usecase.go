// internal/usecases/auth_usecase.go
package usecases

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/domain/repositories"
	"bro-chat/pkg/auth"
	"bro-chat/pkg/services"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthUsecase struct {
	userRepo        repositories.UserRepository
	magicLinkRepo   repositories.MagicLinkRepository
	qrCodeRepo      repositories.QRCodeRepository
	sessionRepo     repositories.UserSessionRepository
	emailService    *services.EmailService
	jwtSecret       string
	frontendBaseURL string
}

func NewAuthUsecase(
	userRepo repositories.UserRepository,
	magicLinkRepo repositories.MagicLinkRepository,
	qrCodeRepo repositories.QRCodeRepository,
	sessionRepo repositories.UserSessionRepository,
	emailService *services.EmailService,
	jwtSecret string,
	frontendBaseURL string,
) *AuthUsecase {
	return &AuthUsecase{
		userRepo:        userRepo,
		magicLinkRepo:   magicLinkRepo,
		qrCodeRepo:      qrCodeRepo,
		sessionRepo:     sessionRepo,
		emailService:    emailService,
		jwtSecret:       jwtSecret,
		frontendBaseURL: frontendBaseURL,
	}
}

// ========== Magic Link Authentication ==========

func (a *AuthUsecase) SendMagicLink(ctx context.Context, req *entities.MagicLinkRequest, ipAddress, userAgent string) (*entities.MagicLinkResponse, error) {
	// Check if user exists
	user, err := a.userRepo.GetByEmail(ctx, req.Email)
	var userID *primitive.ObjectID
	firstName := "User"

	if err == nil {
		// User exists
		userID = &user.ID
		firstName = user.FirstName
	}

	// Invalidate any existing magic links for this email
	a.magicLinkRepo.InvalidateUserLinks(ctx, req.Email)

	// Generate secure token
	token, err := a.generateSecureToken()
	if err != nil {
		return nil, err
	}

	// Create magic link
	expiresAt := time.Now().Add(15 * time.Minute) // 15 minutes expiry
	magicLink := &entities.MagicLink{
		Email:     req.Email,
		Token:     token,
		UserID:    userID,
		Status:    entities.MagicLinkPending,
		ExpiresAt: expiresAt,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}

	if err := a.magicLinkRepo.Create(ctx, magicLink); err != nil {
		return nil, err
	}

	// Generate magic link URL
	magicLinkURL := fmt.Sprintf("%s/verify?token=%s", a.frontendBaseURL, token)

	// Send email
	if err := a.emailService.SendMagicLink(req.Email, firstName, magicLinkURL); err != nil {
		return nil, err
	}

	return &entities.MagicLinkResponse{
		Message:   "Magic link sent to your email",
		ExpiresAt: expiresAt,
		Email:     req.Email,
	}, nil
}

func (a *AuthUsecase) VerifyMagicLink(ctx context.Context, req *entities.VerifyMagicLinkRequest, ipAddress, userAgent string) (*entities.AuthResponse, error) {
	// Get magic link
	magicLink, err := a.magicLinkRepo.GetByToken(ctx, req.Token)
	if err != nil {
		return nil, errors.New("invalid or expired magic link")
	}

	// Check if expired
	if time.Now().After(magicLink.ExpiresAt) {
		a.magicLinkRepo.UpdateStatus(ctx, magicLink.ID, entities.MagicLinkExpired)
		return nil, errors.New("magic link has expired")
	}

	// Check if already used
	if magicLink.Status != entities.MagicLinkPending {
		return nil, errors.New("magic link already used")
	}

	var user *entities.User

	if magicLink.UserID != nil {
		// Existing user - login
		user, err = a.userRepo.GetByID(ctx, *magicLink.UserID)
		if err != nil {
			return nil, errors.New("user not found")
		}
	} else {
		// No UserID - check if user exists by email
		existingUser, err := a.userRepo.GetByEmail(ctx, magicLink.Email)
		if err == nil && existingUser != nil {
			// User exists - use existing user
			user = existingUser
		} else {
			// New user - return registration required
			return nil, errors.New("user registration required")
		}
	}

	// Mark magic link as used ONLY after we confirm user exists or is created
	if err := a.magicLinkRepo.MarkAsUsed(ctx, magicLink.ID); err != nil {
		return nil, err
	}

	// Update user login info
	now := time.Now()
	user.LastLoginAt = &now
	user.LoginMethod = "magic_link"
	user.IsVerified = true
	user.VerifiedAt = &now
	a.userRepo.Update(ctx, user)

	// Generate tokens
	accessToken, err := auth.GenerateToken(user.ID, user.Email, a.jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := a.generateSecureToken()
	if err != nil {
		return nil, err
	}

	// Create session
	session := &entities.UserSession{
		UserID:       user.ID,
		RefreshToken: refreshToken,
		DeviceType:   entities.DeviceWeb,
		DeviceName:   "Web Browser",
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		IsActive:     true,
		LastUsedAt:   time.Now(),
		ExpiresAt:    time.Now().Add(30 * 24 * time.Hour), // 30 days
	}

	if err := a.sessionRepo.Create(ctx, session); err != nil {
		return nil, err
	}

	return &entities.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(24 * time.Hour).Unix(),
	}, nil
}

func (a *AuthUsecase) RegisterWithMagicLink(ctx context.Context, token string, userReq *entities.MagicLinkUserRequest, ipAddress, userAgent string) (*entities.AuthResponse, error) {
	// Get magic link
	magicLink, err := a.magicLinkRepo.GetByToken(ctx, token)
	if err != nil {
		return nil, errors.New("invalid or expired magic link")
	}

	// Verify email matches
	if magicLink.Email != userReq.Email {
		return nil, errors.New("email mismatch")
	}

	// Check if expired
	if time.Now().After(magicLink.ExpiresAt) {
		return nil, errors.New("magic link has expired")
	}

	// Check if user already exists
	existingUser, _ := a.userRepo.GetByEmail(ctx, userReq.Email)
	if existingUser != nil {
		return nil, errors.New("user already exists")
	}

	// Check username availability
	existingUsername, _ := a.userRepo.GetByUsername(ctx, userReq.Username)
	if existingUsername != nil {
		return nil, errors.New("username already taken")
	}

	// Create new user
	now := time.Now()
	user := &entities.User{
		Username:    userReq.Username,
		Email:       userReq.Email,
		FirstName:   userReq.FirstName,
		LastName:    userReq.LastName,
		Phone:       userReq.Phone,
		Bio:         userReq.Bio,
		IsOnline:    false,
		IsVerified:  true,
		VerifiedAt:  &now,
		LoginMethod: "magic_link",
		LastLoginAt: &now,
	}

	if err := a.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Mark magic link as used
	a.magicLinkRepo.MarkAsUsed(ctx, magicLink.ID)

	// Generate tokens and create session
	accessToken, err := auth.GenerateToken(user.ID, user.Email, a.jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := a.generateSecureToken()
	if err != nil {
		return nil, err
	}

	session := &entities.UserSession{
		UserID:       user.ID,
		RefreshToken: refreshToken,
		DeviceType:   entities.DeviceWeb,
		DeviceName:   "Web Browser",
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		IsActive:     true,
		LastUsedAt:   time.Now(),
		ExpiresAt:    time.Now().Add(30 * 24 * time.Hour),
	}

	if err := a.sessionRepo.Create(ctx, session); err != nil {
		return nil, err
	}

	return &entities.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(24 * time.Hour).Unix(),
	}, nil
}

// ========== QR Code Authentication ==========

func (a *AuthUsecase) GenerateQRCode(ctx context.Context, req *entities.QRCodeRequest, ipAddress, userAgent string) (*entities.QRCodeResponse, error) {
	// Generate QR code and secret
	qrCode, err := a.generateSecureToken()
	if err != nil {
		return nil, err
	}

	secret, err := a.generateSecureToken()
	if err != nil {
		return nil, err
	}

	// Create QR session
	expiresAt := time.Now().Add(5 * time.Minute) // 5 minutes for QR
	qrSession := &entities.QRCodeSession{
		QRCode:    qrCode,
		Secret:    secret,
		Status:    entities.MagicLinkPending,
		ExpiresAt: expiresAt,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}

	if err := a.qrCodeRepo.Create(ctx, qrSession); err != nil {
		return nil, err
	}

	return &entities.QRCodeResponse{
		QRCode:    qrCode,
		Secret:    secret,
		ExpiresAt: expiresAt,
	}, nil
}

func (a *AuthUsecase) ScanQRCode(ctx context.Context, qrCode string, userID primitive.ObjectID) error {
	// Get QR session
	session, err := a.qrCodeRepo.GetByQRCode(ctx, qrCode)
	if err != nil {
		return errors.New("invalid QR code")
	}

	// Check if expired
	if time.Now().After(session.ExpiresAt) {
		return errors.New("QR code has expired")
	}

	// Check if already used
	if session.Status != entities.MagicLinkPending {
		return errors.New("QR code already used")
	}

	// Mark as scanned
	return a.qrCodeRepo.MarkAsScanned(ctx, session.ID, userID)
}

func (a *AuthUsecase) CheckQRStatus(ctx context.Context, secret string) (*entities.QRStatusResponse, error) {
	// Get QR session by secret
	session, err := a.qrCodeRepo.GetBySecret(ctx, secret)
	if err != nil {
		return nil, errors.New("invalid secret")
	}

	response := &entities.QRStatusResponse{
		Status:    session.Status,
		ScannedAt: session.ScannedAt,
	}

	// If scanned and user logged in, return user info
	if session.Status == entities.MagicLinkUsed && session.UserID != nil {
		user, err := a.userRepo.GetByID(ctx, *session.UserID)
		if err == nil {
			response.User = user
		}
	}

	return response, nil
}

func (a *AuthUsecase) LoginWithQRCode(ctx context.Context, secret string, ipAddress, userAgent string) (*entities.AuthResponse, error) {
	// Get QR session
	session, err := a.qrCodeRepo.GetBySecret(ctx, secret)
	if err != nil {
		return nil, errors.New("invalid secret")
	}

	// Check if scanned and valid
	if session.Status != entities.MagicLinkUsed || session.UserID == nil {
		return nil, errors.New("QR code not properly scanned")
	}

	// Get user
	user, err := a.userRepo.GetByID(ctx, *session.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Generate tokens
	accessToken, err := auth.GenerateToken(user.ID, user.Email, a.jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := a.generateSecureToken()
	if err != nil {
		return nil, err
	}

	// Create session
	userSession := &entities.UserSession{
		UserID:       user.ID,
		RefreshToken: refreshToken,
		DeviceType:   entities.DeviceWeb,
		DeviceName:   "Web Browser (QR)",
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		IsActive:     true,
		LastUsedAt:   time.Now(),
		ExpiresAt:    time.Now().Add(30 * 24 * time.Hour),
	}

	if err := a.sessionRepo.Create(ctx, userSession); err != nil {
		return nil, err
	}

	// Update user login info
	now := time.Now()
	user.LastLoginAt = &now
	user.LoginMethod = "qr_code"
	a.userRepo.Update(ctx, user)

	return &entities.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(24 * time.Hour).Unix(),
	}, nil
}

// ========== Session Management ==========

func (a *AuthUsecase) RefreshToken(ctx context.Context, req *entities.RefreshTokenRequest) (*entities.AuthResponse, error) {
	// Get session by refresh token
	session, err := a.sessionRepo.GetByRefreshToken(ctx, req.RefreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Check if expired
	if time.Now().After(session.ExpiresAt) {
		a.sessionRepo.RevokeSession(ctx, session.ID)
		return nil, errors.New("refresh token expired")
	}

	// Get user
	user, err := a.userRepo.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Generate new access token
	accessToken, err := auth.GenerateToken(user.ID, user.Email, a.jwtSecret)
	if err != nil {
		return nil, err
	}

	// Update session last used
	a.sessionRepo.UpdateLastUsed(ctx, session.ID)

	return &entities.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: req.RefreshToken, // Keep same refresh token
		ExpiresAt:    time.Now().Add(24 * time.Hour).Unix(),
	}, nil
}

func (a *AuthUsecase) Logout(ctx context.Context, refreshToken string) error {
	session, err := a.sessionRepo.GetByRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil // Silently succeed if session not found
	}

	return a.sessionRepo.RevokeSession(ctx, session.ID)
}

func (a *AuthUsecase) LogoutAllDevices(ctx context.Context, userID primitive.ObjectID) error {
	return a.sessionRepo.RevokeUserSessions(ctx, userID)
}

// ========== Helper Methods ==========

func (a *AuthUsecase) generateSecureToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	hash := sha256.Sum256(bytes)
	return hex.EncodeToString(hash[:]), nil
}

func (a *AuthUsecase) CleanupExpired(ctx context.Context) error {
	// Clean up expired magic links, QR codes, and sessions
	go func() {
		a.magicLinkRepo.DeleteExpired(ctx)
		a.qrCodeRepo.DeleteExpired(ctx)
		a.sessionRepo.DeleteExpired(ctx)
	}()
	return nil
}
