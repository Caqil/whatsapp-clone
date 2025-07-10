package handlers

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/interfaces/middleware"
	"bro-chat/internal/usecases"
	"bro-chat/pkg/services"
	"bro-chat/pkg/utils"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageHandler struct {
	messageUsecase    *usecases.MessageUsecase
	fileUploadService *services.FileUploadService
}

func NewMessageHandler(messageUsecase *usecases.MessageUsecase, fileUploadService *services.FileUploadService) *MessageHandler {
	return &MessageHandler{
		messageUsecase:    messageUsecase,
		fileUploadService: fileUploadService,
	}
}

// ========== Core Message Operations ==========

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

// ========== File Upload ==========

func (h *MessageHandler) UploadFile(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(100 << 20); err != nil { // 100MB max
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to parse form", err)
		return
	}

	file, fileHeader, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No file provided", err)
		return
	}
	defer file.Close()

	// Upload file
	result, err := h.fileUploadService.UploadFile(fileHeader, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File upload failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "File uploaded successfully", result)
}

func (h *MessageHandler) SendMediaMessage(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(100 << 20); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to parse form", err)
		return
	}

	// Get chat ID
	chatIDStr := c.PostForm("chatId")
	chatID, err := primitive.ObjectIDFromHex(chatIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid chat ID", err)
		return
	}

	// Get message content (caption)
	content := c.PostForm("content")

	// Get file
	file, fileHeader, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No file provided", err)
		return
	}
	defer file.Close()

	// Upload file first
	uploadResult, err := h.fileUploadService.UploadFile(fileHeader, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "File upload failed", err)
		return
	}

	// Determine message type based on media type
	var messageType entities.MessageType
	switch uploadResult.MediaType {
	case "image":
		messageType = entities.ImageMessage
	case "video":
		messageType = entities.VideoMessage
	case "audio":
		messageType = entities.AudioMessage
	default:
		messageType = entities.FileMessage
	}

	// Create message request
	req := &entities.SendMessageRequest{
		ChatID:     chatID,
		Type:       messageType,
		Content:    content,
		MediaURL:   uploadResult.FileURL,
		MediaType:  uploadResult.MediaType,
		FileName:   uploadResult.FileName,
		FileSize:   uploadResult.FileSize,
		Duration:   uploadResult.Duration,
		Dimensions: uploadResult.Dimensions,
	}

	// Send message
	message, err := h.messageUsecase.SendMessage(c.Request.Context(), userID, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to send media message", err)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Media message sent successfully", message)
}

// ========== Message Reactions ==========

func (h *MessageHandler) AddReaction(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req entities.MessageReactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	err := h.messageUsecase.AddReaction(c.Request.Context(), userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to add reaction", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Reaction added successfully", nil)
}

func (h *MessageHandler) RemoveReaction(c *gin.Context) {
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

	err = h.messageUsecase.RemoveReaction(c.Request.Context(), messageID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to remove reaction", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Reaction removed successfully", nil)
}

// ========== Message Management ==========

func (h *MessageHandler) ForwardMessages(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req entities.ForwardMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	err := h.messageUsecase.ForwardMessages(c.Request.Context(), userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to forward messages", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Messages forwarded successfully", nil)
}

func (h *MessageHandler) DeleteMessage(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req entities.DeleteMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	err := h.messageUsecase.DeleteMessage(c.Request.Context(), userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to delete message", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Message deleted successfully", nil)
}

func (h *MessageHandler) EditMessage(c *gin.Context) {
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

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	err = h.messageUsecase.EditMessage(c.Request.Context(), messageID, userID, req.Content)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to edit message", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Message edited successfully", nil)
}

// ========== Search and Media ==========

func (h *MessageHandler) SearchMessages(c *gin.Context) {
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

	query := c.Query("q")
	if query == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Search query is required", nil)
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 20
	}

	messages, err := h.messageUsecase.SearchMessages(c.Request.Context(), chatID, userID, query, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Search failed", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Search completed successfully", messages)
}

func (h *MessageHandler) GetMediaMessages(c *gin.Context) {
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

	mediaTypeStr := c.Query("type")
	if mediaTypeStr == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Media type is required", nil)
		return
	}

	var mediaType entities.MessageType
	switch strings.ToLower(mediaTypeStr) {
	case "image":
		mediaType = entities.ImageMessage
	case "video":
		mediaType = entities.VideoMessage
	case "audio":
		mediaType = entities.AudioMessage
	case "file", "document":
		mediaType = entities.FileMessage
	default:
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid media type", nil)
		return
	}

	// Parse pagination
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 20
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	messages, err := h.messageUsecase.GetMediaMessages(c.Request.Context(), chatID, userID, mediaType, limit, offset)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to get media messages", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Media messages retrieved successfully", messages)
}

func (h *MessageHandler) GetUnreadCount(c *gin.Context) {
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

	count, err := h.messageUsecase.GetUnreadCount(c.Request.Context(), chatID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to get unread count", err)
		return
	}

	response := map[string]interface{}{
		"chatId":      chatID,
		"unreadCount": count,
	}

	utils.SuccessResponse(c, http.StatusOK, "Unread count retrieved successfully", response)
}

// ========== Utility Endpoints ==========

func (h *MessageHandler) GetMessage(c *gin.Context) {
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

	// This is a simplified version - you might want to add proper access control
	message, err := h.messageUsecase.GetMessage(c.Request.Context(), messageID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Message not found", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Message retrieved successfully", message)
}

// ========== Batch Operations ==========

func (h *MessageHandler) MarkMultipleAsRead(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	var req struct {
		MessageIDs []string `json:"messageIds" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Convert string IDs to ObjectIDs
	var messageIDs []primitive.ObjectID
	for _, idStr := range req.MessageIDs {
		id, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid message ID: "+idStr, err)
			return
		}
		messageIDs = append(messageIDs, id)
	}

	// Mark messages as read (you'll need to implement this method in usecase)
	err := h.messageUsecase.MarkMultipleAsRead(c.Request.Context(), messageIDs, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to mark messages as read", err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Messages marked as read", nil)
}
