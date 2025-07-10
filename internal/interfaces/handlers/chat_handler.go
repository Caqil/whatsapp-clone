package handlers

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/interfaces/middleware"
	"bro-chat/internal/usecases"
	"bro-chat/pkg/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChatHandler struct {
	chatUsecase *usecases.ChatUsecase
}

func NewChatHandler(chatUsecase *usecases.ChatUsecase) *ChatHandler {
	return &ChatHandler{
		chatUsecase: chatUsecase,
	}
}

func (h *ChatHandler) CreateChat(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req entities.CreateChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	chat, err := h.chatUsecase.CreateChat(c.Request.Context(), userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to create chat", err)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Chat created successfully", chat)
}

func (h *ChatHandler) GetUserChats(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	chats, err := h.chatUsecase.GetUserChats(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve chats", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Chats retrieved successfully", chats)
}

func (h *ChatHandler) GetChat(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	chatIDStr := c.Param("chatId")
	chatID, err := primitive.ObjectIDFromHex(chatIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid chat ID", err)
		return
	}

	chat, err := h.chatUsecase.GetChat(c.Request.Context(), chatID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, "Failed to retrieve chat", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Chat retrieved successfully", chat)
}
