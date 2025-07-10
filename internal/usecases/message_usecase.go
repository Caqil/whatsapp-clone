package usecases

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/domain/repositories"
	"bro-chat/pkg/websocket"
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageUsecase struct {
	messageRepo repositories.MessageRepository
	chatRepo    repositories.ChatRepository
	userRepo    repositories.UserRepository
	hub         *websocket.Hub
}

func NewMessageUsecase(
	messageRepo repositories.MessageRepository,
	chatRepo repositories.ChatRepository,
	userRepo repositories.UserRepository,
	hub *websocket.Hub,
) *MessageUsecase {
	return &MessageUsecase{
		messageRepo: messageRepo,
		chatRepo:    chatRepo,
		userRepo:    userRepo,
		hub:         hub,
	}
}

// ========== Core Message Operations ==========

func (m *MessageUsecase) SendMessage(ctx context.Context, userID primitive.ObjectID, req *entities.SendMessageRequest) (*entities.Message, error) {
	// Verify user is participant in chat
	chat, err := m.chatRepo.GetByID(ctx, req.ChatID)
	if err != nil {
		return nil, errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return nil, errors.New("user is not a participant in this chat")
	}

	// Validate message content based on type
	if err := m.validateMessageContent(req); err != nil {
		return nil, err
	}

	// Create message
	message := &entities.Message{
		ChatID:      req.ChatID,
		SenderID:    userID,
		Type:        req.Type,
		Content:     req.Content,
		MediaURL:    req.MediaURL,
		MediaType:   req.MediaType,
		FileName:    req.FileName,
		FileSize:    req.FileSize,
		Duration:    req.Duration,
		Dimensions:  req.Dimensions,
		ReplyToID:   req.ReplyToID,
		Status:      entities.MessageSent,
		ReadBy:      []entities.ReadInfo{},
		DeliveredTo: []entities.DeliveryInfo{},
		Reactions:   []entities.MessageReaction{},
		IsForwarded: false,
		IsDeleted:   false,
	}

	// Save message to database
	if err := m.messageRepo.Create(ctx, message); err != nil {
		return nil, err
	}

	// Update chat's last message
	if err := m.chatRepo.UpdateLastMessage(ctx, req.ChatID, message); err != nil {
		// Log error but don't fail the message send
		fmt.Printf("Failed to update last message: %v", err)
	}

	// Get sender information for broadcasting
	sender, err := m.userRepo.GetByID(ctx, userID)
	if err != nil {
		sender = &entities.User{Username: "Unknown"} // Fallback
	}

	// Broadcast new message via WebSocket
	m.hub.BroadcastNewMessage(message, sender.Username)

	// Mark as delivered for online participants
	go m.markAsDeliveredForOnlineUsers(ctx, message, chat.Participants)

	return message, nil
}

func (m *MessageUsecase) GetChatMessages(ctx context.Context, chatID, userID primitive.ObjectID, limit, offset int) ([]*entities.MessageResponse, error) {
	// Verify user is participant in chat
	chat, err := m.chatRepo.GetByID(ctx, chatID)
	if err != nil {
		return nil, errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return nil, errors.New("user is not a participant in this chat")
	}

	// Get messages from repository
	messages, err := m.messageRepo.GetChatMessages(ctx, chatID, limit, offset)
	if err != nil {
		return nil, err
	}

	// Convert to response format with additional information
	var messageResponses []*entities.MessageResponse
	for _, msg := range messages {
		// Skip deleted messages for this user
		if m.isDeletedForUser(msg, userID) {
			continue
		}

		response := m.buildMessageResponse(ctx, msg, userID)
		messageResponses = append(messageResponses, response)
	}

	// Mark messages as read for this user
	var messageIDs []primitive.ObjectID
	for _, msg := range messages {
		if msg.SenderID != userID && !m.isReadByUser(msg, userID) {
			messageIDs = append(messageIDs, msg.ID)
		}
	}

	if len(messageIDs) > 0 {
		go m.markMultipleAsRead(ctx, messageIDs, userID, chatID)
	}

	return messageResponses, nil
}

func (m *MessageUsecase) MarkAsRead(ctx context.Context, messageID, userID primitive.ObjectID) error {
	// Get message to verify access
	message, err := m.messageRepo.GetByID(ctx, messageID)
	if err != nil {
		return errors.New("message not found")
	}

	// Verify user is participant in the chat
	chat, err := m.chatRepo.GetByID(ctx, message.ChatID)
	if err != nil {
		return errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return errors.New("user is not a participant in this chat")
	}

	// Don't mark own messages as read
	if message.SenderID == userID {
		return nil
	}

	// Mark as read
	if err := m.messageRepo.MarkAsRead(ctx, messageID, userID); err != nil {
		return err
	}

	// Broadcast read status via WebSocket
	m.hub.BroadcastMessageStatus(messageID, message.ChatID, userID, entities.MessageRead)

	return nil
}

// ========== Message Reactions ==========

func (m *MessageUsecase) AddReaction(ctx context.Context, userID primitive.ObjectID, req *entities.MessageReactionRequest) error {
	// Get message to verify access
	message, err := m.messageRepo.GetByID(ctx, req.MessageID)
	if err != nil {
		return errors.New("message not found")
	}

	// Verify user is participant in the chat
	chat, err := m.chatRepo.GetByID(ctx, message.ChatID)
	if err != nil {
		return errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return errors.New("user is not a participant in this chat")
	}

	// Add reaction
	if err := m.messageRepo.AddReaction(ctx, req.MessageID, userID, req.Reaction); err != nil {
		return err
	}

	// Get user info for broadcasting
	user, err := m.userRepo.GetByID(ctx, userID)
	if err != nil {
		user = &entities.User{Username: "Unknown"}
	}

	// Broadcast reaction via WebSocket
	m.hub.BroadcastMessageReaction(req.MessageID, message.ChatID, userID, user.Username, req.Reaction, "add")

	return nil
}

func (m *MessageUsecase) RemoveReaction(ctx context.Context, messageID, userID primitive.ObjectID) error {
	// Get message to verify access
	message, err := m.messageRepo.GetByID(ctx, messageID)
	if err != nil {
		return errors.New("message not found")
	}

	// Verify user is participant in the chat
	chat, err := m.chatRepo.GetByID(ctx, message.ChatID)
	if err != nil {
		return errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return errors.New("user is not a participant in this chat")
	}

	// Remove reaction
	if err := m.messageRepo.RemoveReaction(ctx, messageID, userID); err != nil {
		return err
	}

	// Get user info for broadcasting
	user, err := m.userRepo.GetByID(ctx, userID)
	if err != nil {
		user = &entities.User{Username: "Unknown"}
	}

	// Broadcast reaction removal via WebSocket
	m.hub.BroadcastMessageReaction(messageID, message.ChatID, userID, user.Username, "", "remove")

	return nil
}

// ========== Message Management ==========

func (m *MessageUsecase) ForwardMessages(ctx context.Context, userID primitive.ObjectID, req *entities.ForwardMessageRequest) error {
	// Verify user has access to all source messages
	for _, messageID := range req.MessageIDs {
		message, err := m.messageRepo.GetByID(ctx, messageID)
		if err != nil {
			return fmt.Errorf("message %s not found", messageID.Hex())
		}

		// Check if user is participant in source chat
		chat, err := m.chatRepo.GetByID(ctx, message.ChatID)
		if err != nil {
			return fmt.Errorf("source chat not found for message %s", messageID.Hex())
		}

		if !m.isParticipant(userID, chat.Participants) {
			return fmt.Errorf("no access to message %s", messageID.Hex())
		}
	}

	// Verify user has access to all target chats
	for _, chatID := range req.ToChatIDs {
		chat, err := m.chatRepo.GetByID(ctx, chatID)
		if err != nil {
			return fmt.Errorf("target chat %s not found", chatID.Hex())
		}

		if !m.isParticipant(userID, chat.Participants) {
			return fmt.Errorf("no access to target chat %s", chatID.Hex())
		}
	}

	// Forward messages
	if err := m.messageRepo.ForwardMessages(ctx, req.MessageIDs, req.ToChatIDs, userID); err != nil {
		return err
	}

	// TODO: Broadcast forwarded messages to target chats
	// This would require getting the newly created messages and broadcasting them

	return nil
}

func (m *MessageUsecase) DeleteMessage(ctx context.Context, userID primitive.ObjectID, req *entities.DeleteMessageRequest) error {
	// Get message to verify access
	message, err := m.messageRepo.GetByID(ctx, req.MessageID)
	if err != nil {
		return errors.New("message not found")
	}

	// Verify user is participant in the chat
	chat, err := m.chatRepo.GetByID(ctx, message.ChatID)
	if err != nil {
		return errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return errors.New("user is not a participant in this chat")
	}

	// Check if user can delete for everyone (only message sender, within time limit)
	canDeleteForEveryone := message.SenderID == userID &&
		time.Since(message.CreatedAt) < 24*time.Hour // 24 hour limit

	if !req.DeleteForMe && !canDeleteForEveryone {
		return errors.New("cannot delete message for everyone")
	}

	// Delete message
	if err := m.messageRepo.SoftDeleteMessage(ctx, req.MessageID, userID, !req.DeleteForMe); err != nil {
		return err
	}

	// Broadcast deletion if deleted for everyone
	if !req.DeleteForMe {
		// TODO: Broadcast message deletion to all chat participants
	}

	return nil
}

func (m *MessageUsecase) EditMessage(ctx context.Context, messageID, userID primitive.ObjectID, newContent string) error {
	// Get message to verify access
	message, err := m.messageRepo.GetByID(ctx, messageID)
	if err != nil {
		return errors.New("message not found")
	}

	// Only sender can edit messages
	if message.SenderID != userID {
		return errors.New("only message sender can edit messages")
	}

	// Only text messages can be edited
	if message.Type != entities.TextMessage {
		return errors.New("only text messages can be edited")
	}

	// Time limit for editing (e.g., 24 hours)
	if time.Since(message.CreatedAt) > 24*time.Hour {
		return errors.New("message editing time limit exceeded")
	}

	// Edit message
	if err := m.messageRepo.EditMessage(ctx, messageID, newContent); err != nil {
		return err
	}

	// TODO: Broadcast message edit to chat participants

	return nil
}

// ========== Search and Media ==========

func (m *MessageUsecase) SearchMessages(ctx context.Context, chatID, userID primitive.ObjectID, query string, limit int) ([]*entities.MessageResponse, error) {
	// Verify user is participant in chat
	chat, err := m.chatRepo.GetByID(ctx, chatID)
	if err != nil {
		return nil, errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return nil, errors.New("user is not a participant in this chat")
	}

	// Search messages
	messages, err := m.messageRepo.SearchMessagesInChat(ctx, chatID, query, limit)
	if err != nil {
		return nil, err
	}

	// Convert to response format
	var messageResponses []*entities.MessageResponse
	for _, msg := range messages {
		if !m.isDeletedForUser(msg, userID) {
			response := m.buildMessageResponse(ctx, msg, userID)
			messageResponses = append(messageResponses, response)
		}
	}

	return messageResponses, nil
}

func (m *MessageUsecase) GetMediaMessages(ctx context.Context, chatID, userID primitive.ObjectID, mediaType entities.MessageType, limit, offset int) ([]*entities.MessageResponse, error) {
	// Verify user is participant in chat
	chat, err := m.chatRepo.GetByID(ctx, chatID)
	if err != nil {
		return nil, errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return nil, errors.New("user is not a participant in this chat")
	}

	// Get media messages
	messages, err := m.messageRepo.GetMediaMessages(ctx, chatID, mediaType, limit, offset)
	if err != nil {
		return nil, err
	}

	// Convert to response format
	var messageResponses []*entities.MessageResponse
	for _, msg := range messages {
		if !m.isDeletedForUser(msg, userID) {
			response := m.buildMessageResponse(ctx, msg, userID)
			messageResponses = append(messageResponses, response)
		}
	}

	return messageResponses, nil
}

func (m *MessageUsecase) GetUnreadCount(ctx context.Context, chatID, userID primitive.ObjectID) (int64, error) {
	// Verify user is participant in chat
	chat, err := m.chatRepo.GetByID(ctx, chatID)
	if err != nil {
		return 0, errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return 0, errors.New("user is not a participant in this chat")
	}

	return m.messageRepo.GetUnreadMessageCount(ctx, chatID, userID)
}

// ========== Helper Methods ==========

func (m *MessageUsecase) validateMessageContent(req *entities.SendMessageRequest) error {
	switch req.Type {
	case entities.TextMessage:
		if req.Content == "" {
			return errors.New("text message content cannot be empty")
		}
	case entities.ImageMessage, entities.VideoMessage, entities.AudioMessage, entities.DocumentMessage:
		if req.MediaURL == "" {
			return errors.New("media message must have media URL")
		}
	case entities.FileMessage:
		if req.MediaURL == "" || req.FileName == "" {
			return errors.New("file message must have media URL and filename")
		}
	default:
		return errors.New("unsupported message type")
	}
	return nil
}

func (m *MessageUsecase) isParticipant(userID primitive.ObjectID, participants []primitive.ObjectID) bool {
	for _, p := range participants {
		if p == userID {
			return true
		}
	}
	return false
}

func (m *MessageUsecase) isReadByUser(message *entities.Message, userID primitive.ObjectID) bool {
	for _, readInfo := range message.ReadBy {
		if readInfo.UserID == userID {
			return true
		}
	}
	return false
}

func (m *MessageUsecase) isDeletedForUser(message *entities.Message, userID primitive.ObjectID) bool {
	if message.IsDeleted {
		return true
	}
	for _, deletedFor := range message.DeletedFor {
		if deletedFor == userID {
			return true
		}
	}
	return false
}

func (m *MessageUsecase) buildMessageResponse(ctx context.Context, msg *entities.Message, currentUserID primitive.ObjectID) *entities.MessageResponse {
	response := &entities.MessageResponse{
		Message:     msg,
		IsDelivered: m.isDeliveredToUser(msg, currentUserID),
		IsRead:      m.isReadByUser(msg, currentUserID),
	}

	// Get sender name
	if sender, err := m.userRepo.GetByID(ctx, msg.SenderID); err == nil {
		response.SenderName = sender.Username
	}

	// Get replied message if exists
	if msg.ReplyToID != nil {
		if replyMsg, err := m.messageRepo.GetByID(ctx, *msg.ReplyToID); err == nil {
			response.ReplyToMessage = replyMsg
		}
	}

	// Calculate reaction counts
	response.ReactionCount = make(map[entities.ReactionType]int)
	for _, reaction := range msg.Reactions {
		response.ReactionCount[reaction.Reaction]++
	}

	return response
}

func (m *MessageUsecase) isDeliveredToUser(message *entities.Message, userID primitive.ObjectID) bool {
	for _, deliveryInfo := range message.DeliveredTo {
		if deliveryInfo.UserID == userID {
			return true
		}
	}
	return false
}

func (m *MessageUsecase) markAsDeliveredForOnlineUsers(ctx context.Context, message *entities.Message, participants []primitive.ObjectID) {
	for _, participantID := range participants {
		// Skip sender
		if participantID == message.SenderID {
			continue
		}

		// Check if user is online (simplified - you might want to check actual online status)
		if err := m.messageRepo.MarkAsDelivered(ctx, message.ID, participantID); err == nil {
			// Broadcast delivery status
			m.hub.BroadcastMessageStatus(message.ID, message.ChatID, participantID, entities.MessageDelivered)
		}
	}
}

func (m *MessageUsecase) markMultipleAsRead(ctx context.Context, messageIDs []primitive.ObjectID, userID, chatID primitive.ObjectID) {
	if err := m.messageRepo.MarkMultipleAsRead(ctx, messageIDs, userID); err == nil {
		// Broadcast read status for all messages
		for _, messageID := range messageIDs {
			m.hub.BroadcastMessageStatus(messageID, chatID, userID, entities.MessageRead)
		}
	}
}

// ========== Additional Public Methods ==========

func (m *MessageUsecase) GetMessage(ctx context.Context, messageID, userID primitive.ObjectID) (*entities.MessageResponse, error) {
	// Get message from repository
	message, err := m.messageRepo.GetByID(ctx, messageID)
	if err != nil {
		return nil, errors.New("message not found")
	}

	// Verify user has access to this message (is participant in the chat)
	chat, err := m.chatRepo.GetByID(ctx, message.ChatID)
	if err != nil {
		return nil, errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return nil, errors.New("user is not a participant in this chat")
	}

	// Check if message is deleted for this user
	if m.isDeletedForUser(message, userID) {
		return nil, errors.New("message not found")
	}

	// Build response
	response := m.buildMessageResponse(ctx, message, userID)
	return response, nil
}

func (m *MessageUsecase) MarkMultipleAsRead(ctx context.Context, messageIDs []primitive.ObjectID, userID primitive.ObjectID) error {
	if len(messageIDs) == 0 {
		return errors.New("no message IDs provided")
	}

	// Get the first message to determine the chat ID and verify access
	firstMessage, err := m.messageRepo.GetByID(ctx, messageIDs[0])
	if err != nil {
		return errors.New("message not found")
	}

	// Verify user is participant in the chat
	chat, err := m.chatRepo.GetByID(ctx, firstMessage.ChatID)
	if err != nil {
		return errors.New("chat not found")
	}

	if !m.isParticipant(userID, chat.Participants) {
		return errors.New("user is not a participant in this chat")
	}

	// Verify all messages belong to the same chat
	for _, messageID := range messageIDs {
		message, err := m.messageRepo.GetByID(ctx, messageID)
		if err != nil {
			continue // Skip invalid message IDs
		}
		if message.ChatID != firstMessage.ChatID {
			return errors.New("all messages must belong to the same chat")
		}
	}

	// Filter out messages sent by the user (don't mark own messages as read)
	var validMessageIDs []primitive.ObjectID
	for _, messageID := range messageIDs {
		message, err := m.messageRepo.GetByID(ctx, messageID)
		if err != nil {
			continue
		}
		if message.SenderID != userID && !m.isReadByUser(message, userID) {
			validMessageIDs = append(validMessageIDs, messageID)
		}
	}

	if len(validMessageIDs) == 0 {
		return nil // No messages to mark as read
	}

	// Mark messages as read
	if err := m.messageRepo.MarkMultipleAsRead(ctx, validMessageIDs, userID); err != nil {
		return err
	}

	// Broadcast read status for all messages
	for _, messageID := range validMessageIDs {
		m.hub.BroadcastMessageStatus(messageID, firstMessage.ChatID, userID, entities.MessageRead)
	}

	return nil
}
