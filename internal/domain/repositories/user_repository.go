package repositories

import (
	"bro-chat/internal/domain/entities"
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserRepository interface {
	Create(ctx context.Context, user *entities.User) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*entities.User, error)
	GetByEmail(ctx context.Context, email string) (*entities.User, error)
	GetByUsername(ctx context.Context, username string) (*entities.User, error)
	Update(ctx context.Context, user *entities.User) error
	UpdateOnlineStatus(ctx context.Context, id primitive.ObjectID, isOnline bool) error
	SearchUsers(ctx context.Context, query string, limit int) ([]*entities.User, error)
}
