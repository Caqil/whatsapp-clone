// internal/interfaces/handlers/auth_handler.go
package handlers

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/interfaces/middleware"
	"bro-chat/internal/usecases"
	"bro-chat/pkg/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authUsecase *usecases.AuthUsecase
	userUsecase *usecases.UserUsecase
}

func NewAuthHandler(authUsecase *usecases.AuthUsecase, userUsecase *usecases.UserUsecase) *AuthHandler {
	return &AuthHandler{
		authUsecase: authUsecase,
		userUsecase: userUsecase,
	}
}

// ========== Magic Link Authentication ==========

func (h *AuthHandler) SendMagicLink(c *gin.Context) {
	var req entities.MagicLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	response, err := h.authUsecase.SendMagicLink(c.Request.Context(), &req, ipAddress, userAgent)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to send magic link", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Magic link sent successfully", response)
}

func (h *AuthHandler) VerifyMagicLink(c *gin.Context) {
	var req entities.VerifyMagicLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	response, err := h.authUsecase.VerifyMagicLink(c.Request.Context(), &req, ipAddress, userAgent)
	if err != nil {
		// If user registration required, return specific error with token
		if err.Error() == "user registration required" {
			c.JSON(http.StatusPreconditionRequired, gin.H{
				"success": false,
				"message": "User registration required",
				"data": gin.H{
					"token":                req.Token,
					"requiresRegistration": true,
				},
			})
			return
		}
		utils.ErrorResponse(c, http.StatusUnauthorized, "Magic link verification failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Login successful", response)
}
func (h *AuthHandler) RegisterWithMagicLink(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Token is required", nil)
		return
	}

	var req entities.MagicLinkUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	response, err := h.authUsecase.RegisterWithMagicLink(c.Request.Context(), token, &req, ipAddress, userAgent)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Registration failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Registration successful", response)
}

// ========== QR Code Authentication ==========

func (h *AuthHandler) GenerateQRCode(c *gin.Context) {
	var req entities.QRCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	response, err := h.authUsecase.GenerateQRCode(c.Request.Context(), &req, ipAddress, userAgent)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate QR code", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "QR code generated successfully", response)
}

func (h *AuthHandler) ScanQRCode(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req entities.QRCodeScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	err := h.authUsecase.ScanQRCode(c.Request.Context(), req.QRCode, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to scan QR code", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "QR code scanned successfully", nil)
}

func (h *AuthHandler) CheckQRStatus(c *gin.Context) {
	secret := c.Query("secret")
	if secret == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Secret is required", nil)
		return
	}

	response, err := h.authUsecase.CheckQRStatus(c.Request.Context(), secret)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to check QR status", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "QR status retrieved successfully", response)
}

func (h *AuthHandler) LoginWithQRCode(c *gin.Context) {
	secret := c.Query("secret")
	if secret == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Secret is required", nil)
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	response, err := h.authUsecase.LoginWithQRCode(c.Request.Context(), secret, ipAddress, userAgent)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "QR login failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "QR login successful", response)
}

// ========== Session Management ==========

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req entities.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	response, err := h.authUsecase.RefreshToken(c.Request.Context(), &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Token refresh failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Token refreshed successfully", response)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req entities.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	err := h.authUsecase.Logout(c.Request.Context(), req.RefreshToken)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Logout failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Logout successful", nil)
}

func (h *AuthHandler) LogoutAllDevices(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	err := h.authUsecase.LogoutAllDevices(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to logout all devices", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "All devices logged out successfully", nil)
}

// ========== Legacy Password Authentication (Backward Compatibility) ==========

func (h *AuthHandler) Register(c *gin.Context) {
	var req entities.UserRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Only allow password registration if password is provided
	if req.Password == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password is required for traditional registration", nil)
		return
	}

	user, err := h.userUsecase.Register(c.Request.Context(), &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Registration failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "User registered successfully", user)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req entities.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Only allow password login if password is provided
	if req.Password == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Password is required for traditional login", nil)
		return
	}

	user, err := h.userUsecase.Login(c.Request.Context(), &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login failed", err)
		return
	}

	// For backward compatibility, generate tokens the old way
	utils.SuccessResponse(c, http.StatusOK, "Login successful", user)
}

// ========== Cleanup ==========

func (h *AuthHandler) CleanupExpired(c *gin.Context) {
	err := h.authUsecase.CleanupExpired(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Cleanup failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Cleanup completed", nil)
}

// ========== Utilities ==========

func (h *AuthHandler) ValidateToken(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Token is required", nil)
		return
	}

	// This endpoint can be used to validate magic link tokens before use
	// Implementation depends on your specific needs
	utils.SuccessResponse(c, http.StatusOK, "Token validation endpoint", map[string]string{
		"token": token,
		"valid": "true", // You'd implement actual validation logic here
	})
}
