// internal/domain/repositories/auth_repository.go
package repositories

import (
	"bro-chat/internal/domain/entities"
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MagicLinkRepository interface {
	Create(ctx context.Context, magicLink *entities.MagicLink) error
	GetByToken(ctx context.Context, token string) (*entities.MagicLink, error)
	GetByEmail(ctx context.Context, email string) (*entities.MagicLink, error)
	UpdateStatus(ctx context.Context, id primitive.ObjectID, status entities.MagicLinkStatus) error
	MarkAsUsed(ctx context.Context, id primitive.ObjectID) error
	DeleteExpired(ctx context.Context) error
	InvalidateUserLinks(ctx context.Context, email string) error
}

type QRCodeRepository interface {
	Create(ctx context.Context, qrSession *entities.QRCodeSession) error
	GetByQRCode(ctx context.Context, qrCode string) (*entities.QRCodeSession, error)
	GetBySecret(ctx context.Context, secret string) (*entities.QRCodeSession, error)
	UpdateStatus(ctx context.Context, id primitive.ObjectID, status entities.MagicLinkStatus) error
	MarkAsScanned(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID) error
	DeleteExpired(ctx context.Context) error
}

type UserSessionRepository interface {
	Create(ctx context.Context, session *entities.UserSession) error
	GetByRefreshToken(ctx context.Context, refreshToken string) (*entities.UserSession, error)
	GetUserSessions(ctx context.Context, userID primitive.ObjectID) ([]*entities.UserSession, error)
	UpdateLastUsed(ctx context.Context, id primitive.ObjectID) error
	RevokeSession(ctx context.Context, id primitive.ObjectID) error
	RevokeUserSessions(ctx context.Context, userID primitive.ObjectID) error
	DeleteExpired(ctx context.Context) error
}
