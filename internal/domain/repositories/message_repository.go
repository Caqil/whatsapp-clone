package repositories

import (
	"bro-chat/internal/domain/entities"
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageRepository interface {
	Create(ctx context.Context, message *entities.Message) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*entities.Message, error)
	GetChatMessages(ctx context.Context, chatID primitive.ObjectID, limit, offset int) ([]*entities.Message, error)
	UpdateStatus(ctx context.Context, messageID primitive.ObjectID, status entities.MessageStatus) error
	MarkAsRead(ctx context.Context, messageID, userID primitive.ObjectID) error
}
