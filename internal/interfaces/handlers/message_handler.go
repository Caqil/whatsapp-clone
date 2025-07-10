package handlers

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/interfaces/middleware"
	"bro-chat/internal/usecases"
	"bro-chat/pkg/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageHandler struct {
	messageUsecase *usecases.MessageUsecase
}

func NewMessageHandler(messageUsecase *usecases.MessageUsecase) *MessageHandler {
	return &MessageHandler{
		messageUsecase: messageUsecase,
	}
}

func (h *MessageHandler) SendMessage(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req entities.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	message, err := h.messageUsecase.SendMessage(c.Request.Context(), userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to send message", err)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Message sent successfully", message)
}

func (h *MessageHandler) GetChatMessages(c *gin.Context) {
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

	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	messages, err := h.messageUsecase.GetChatMessages(c.Request.Context(), chatID, userID, limit, offset)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, "Failed to retrieve messages", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Messages retrieved successfully", messages)
}

func (h *MessageHandler) MarkAsRead(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	messageIDStr := c.Param("messageId")
	messageID, err := primitive.ObjectIDFromHex(messageIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid message ID", err)
		return
	}

	err = h.messageUsecase.MarkAsRead(c.Request.Context(), messageID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to mark message as read", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Message marked as read", nil)
}
