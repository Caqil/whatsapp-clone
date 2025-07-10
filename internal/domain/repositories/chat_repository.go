package repositories

import (
	"bro-chat/internal/domain/entities"
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChatRepository interface {
	Create(ctx context.Context, chat *entities.Chat) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*entities.Chat, error)
	GetUserChats(ctx context.Context, userID primitive.ObjectID) ([]*entities.Chat, error)
	UpdateLastMessage(ctx context.Context, chatID primitive.ObjectID, message *entities.Message) error
	AddParticipant(ctx context.Context, chatID, userID primitive.ObjectID) error
	RemoveParticipant(ctx context.Context, chatID, userID primitive.ObjectID) error
}
