package usecases

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/domain/repositories"
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChatUsecase struct {
	chatRepo repositories.ChatRepository
	userRepo repositories.UserRepository
}

func NewChatUsecase(chatRepo repositories.ChatRepository, userRepo repositories.UserRepository) *ChatUsecase {
	return &ChatUsecase{
		chatRepo: chatRepo,
		userRepo: userRepo,
	}
}

func (c *ChatUsecase) CreateChat(ctx context.Context, userID primitive.ObjectID, req *entities.CreateChatRequest) (*entities.Chat, error) {
	// Validate participants exist
	for _, participantID := range req.Participants {
		_, err := c.userRepo.GetByID(ctx, participantID)
		if err != nil {
			return nil, errors.New("one or more participants not found")
		}
	}

	// Add creator to participants if not already included
	participants := req.Participants
	found := false
	for _, p := range participants {
		if p == userID {
			found = true
			break
		}
	}
	if !found {
		participants = append(participants, userID)
	}

	// For direct chats, ensure only 2 participants
	if req.Type == entities.DirectChat && len(participants) != 2 {
		return nil, errors.New("direct chat must have exactly 2 participants")
	}

	// For group chats, ensure name is provided
	if req.Type == entities.GroupChat && req.Name == "" {
		return nil, errors.New("group chat must have a name")
	}

	chat := &entities.Chat{
		Type:         req.Type,
		Name:         req.Name,
		Description:  req.Description,
		Participants: participants,
		CreatedBy:    userID,
	}

	if err := c.chatRepo.Create(ctx, chat); err != nil {
		return nil, err
	}

	return chat, nil
}

func (c *ChatUsecase) GetUserChats(ctx context.Context, userID primitive.ObjectID) ([]*entities.Chat, error) {
	return c.chatRepo.GetUserChats(ctx, userID)
}

func (c *ChatUsecase) GetChat(ctx context.Context, chatID, userID primitive.ObjectID) (*entities.Chat, error) {
	chat, err := c.chatRepo.GetByID(ctx, chatID)
	if err != nil {
		return nil, err
	}

	// Check if user is participant
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

	return chat, nil
}

func (c *ChatUsecase) UpdateLastMessage(ctx context.Context, chatID primitive.ObjectID, message *entities.Message) error {
	return c.chatRepo.UpdateLastMessage(ctx, chatID, message)
}
