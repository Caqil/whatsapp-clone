package handlers

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/infrastructure/config"
	"bro-chat/internal/interfaces/middleware"
	"bro-chat/internal/usecases"
	"bro-chat/pkg/auth"
	"bro-chat/pkg/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userUsecase *usecases.UserUsecase
}

func NewUserHandler(userUsecase *usecases.UserUsecase) *UserHandler {
	return &UserHandler{
		userUsecase: userUsecase,
	}
}

func (h *UserHandler) Register(c *gin.Context) {
	var req entities.UserRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	user, err := h.userUsecase.Register(c.Request.Context(), &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Registration failed", err)
		return
	}

	// Generate JWT token
	cfg := config.Load()
	token, err := auth.GenerateToken(user.ID, user.Email, cfg.JWTSecret)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate token", err)
		return
	}

	response := map[string]interface{}{
		"user":  user,
		"token": token,
	}

	utils.SuccessResponse(c, http.StatusCreated, "User registered successfully", response)
}

func (h *UserHandler) Login(c *gin.Context) {
	var req entities.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	user, err := h.userUsecase.Login(c.Request.Context(), &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Login failed", err)
		return
	}

	// Generate JWT token
	cfg := config.Load()
	token, err := auth.GenerateToken(user.ID, user.Email, cfg.JWTSecret)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate token", err)
		return
	}

	response := map[string]interface{}{
		"user":  user,
		"token": token,
	}

	utils.SuccessResponse(c, http.StatusOK, "Login successful", response)
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	user, err := h.userUsecase.GetProfile(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved successfully", user)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req entities.UserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	user, err := h.userUsecase.UpdateProfile(c.Request.Context(), userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to update profile", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile updated successfully", user)
}

func (h *UserHandler) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Search query is required", nil)
		return
	}

	users, err := h.userUsecase.SearchUsers(c.Request.Context(), query)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Search failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Users retrieved successfully", users)
}
