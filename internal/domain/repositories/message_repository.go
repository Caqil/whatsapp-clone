package repositories

import (
	"bro-chat/internal/domain/entities"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageRepository interface {
	// Basic CRUD operations
	Create(ctx context.Context, message *entities.Message) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*entities.Message, error)
	GetChatMessages(ctx context.Context, chatID primitive.ObjectID, limit, offset int) ([]*entities.Message, error)
	Update(ctx context.Context, message *entities.Message) error
	Delete(ctx context.Context, messageID primitive.ObjectID) error

	// Status tracking
	UpdateStatus(ctx context.Context, messageID primitive.ObjectID, status entities.MessageStatus) error
	MarkAsDelivered(ctx context.Context, messageID, userID primitive.ObjectID) error
	MarkAsRead(ctx context.Context, messageID, userID primitive.ObjectID) error
	MarkMultipleAsRead(ctx context.Context, messageIDs []primitive.ObjectID, userID primitive.ObjectID) error

	// Reactions
	AddReaction(ctx context.Context, messageID, userID primitive.ObjectID, reaction entities.ReactionType) error
	RemoveReaction(ctx context.Context, messageID, userID primitive.ObjectID) error
	GetMessageReactions(ctx context.Context, messageID primitive.ObjectID) ([]entities.MessageReaction, error)

	// Message features
	GetRepliedMessage(ctx context.Context, messageID primitive.ObjectID) (*entities.Message, error)
	ForwardMessages(ctx context.Context, messageIDs []primitive.ObjectID, toChatIDs []primitive.ObjectID, senderID primitive.ObjectID) error

	// Deletion and editing
	SoftDeleteMessage(ctx context.Context, messageID, userID primitive.ObjectID, deleteForEveryone bool) error
	EditMessage(ctx context.Context, messageID primitive.ObjectID, newContent string) error

	// Search and filtering
	SearchMessagesInChat(ctx context.Context, chatID primitive.ObjectID, query string, limit int) ([]*entities.Message, error)
	GetMediaMessages(ctx context.Context, chatID primitive.ObjectID, mediaType entities.MessageType, limit, offset int) ([]*entities.Message, error)

	// Analytics and stats
	GetUnreadMessageCount(ctx context.Context, chatID, userID primitive.ObjectID) (int64, error)
	GetLastMessage(ctx context.Context, chatID primitive.ObjectID) (*entities.Message, error)
	GetMessageStats(ctx context.Context, chatID primitive.ObjectID) (*MessageStats, error)
}

type MessageStats struct {
	TotalMessages int64     `json:"totalMessages"`
	MediaMessages int64     `json:"mediaMessages"`
	TextMessages  int64     `json:"textMessages"`
	LastActivity  time.Time `json:"lastActivity"`
}
