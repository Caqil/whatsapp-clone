package usecases

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/domain/repositories"
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageUsecase struct {
	messageRepo repositories.MessageRepository
	chatRepo    repositories.ChatRepository
}

func NewMessageUsecase(messageRepo repositories.MessageRepository, chatRepo repositories.ChatRepository) *MessageUsecase {
	return &MessageUsecase{
		messageRepo: messageRepo,
		chatRepo:    chatRepo,
	}
}

func (m *MessageUsecase) SendMessage(ctx context.Context, userID primitive.ObjectID, req *entities.SendMessageRequest) (*entities.Message, error) {
	// Verify user is participant in chat
	chat, err := m.chatRepo.GetByID(ctx, req.ChatID)
	if err != nil {
		return nil, errors.New("chat not found")
	}

	isParticipant := false
	for _, p := range chat.Participants {
		if p == userID {
			isParticipant = true
			break
		}
	}

	if !isParticipant {
		return nil, errors.New("user is not a participant in this chat")
	}

	// Create message
	message := &entities.Message{
		ChatID:   req.ChatID,
		SenderID: userID,
		Type:     req.Type,
		Content:  req.Content,
		FileURL:  req.FileURL,
		Status:   entities.MessageSent,
		ReadBy:   []entities.ReadInfo{},
	}

	if err := m.messageRepo.Create(ctx, message); err != nil {
		return nil, err
	}

	// Update chat's last message
	m.chatRepo.UpdateLastMessage(ctx, req.ChatID, message)

	return message, nil
}

func (m *MessageUsecase) GetChatMessages(ctx context.Context, chatID, userID primitive.ObjectID, limit, offset int) ([]*entities.Message, error) {
	// Verify user is participant in chat
	chat, err := m.chatRepo.GetByID(ctx, chatID)
	if err != nil {
		return nil, errors.New("chat not found")
	}

	isParticipant := false
	for _, p := range chat.Participants {
		if p == userID {
			isParticipant = true
			break
		}
	}

	if !isParticipant {
		return nil, errors.New("user is not a participant in this chat")
	}

	return m.messageRepo.GetChatMessages(ctx, chatID, limit, offset)
}

func (m *MessageUsecase) MarkAsRead(ctx context.Context, messageID, userID primitive.ObjectID) error {
	// Verify message exists and user can access it
	message, err := m.messageRepo.GetByID(ctx, messageID)
	if err != nil {
		return errors.New("message not found")
	}

	// Verify user is participant in the chat
	chat, err := m.chatRepo.GetByID(ctx, message.ChatID)
	if err != nil {
		return errors.New("chat not found")
	}

	isParticipant := false
	for _, p := range chat.Participants {
		if p == userID {
			isParticipant = true
			break
		}
	}

	if !isParticipant {
		return errors.New("user is not a participant in this chat")
	}

	return m.messageRepo.MarkAsRead(ctx, messageID, userID)
}
