// internal/infrastructure/database/repositories/magic_link_repository_impl.go
package repositories

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/domain/repositories"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type magicLinkRepository struct {
	collection *mongo.Collection
}

func NewMagicLinkRepository(db *mongo.Database) repositories.MagicLinkRepository {
	repo := &magicLinkRepository{
		collection: db.Collection("magic_links"),
	}
	repo.createIndexes()
	return repo
}

func (r *magicLinkRepository) createIndexes() {
	ctx := context.Background()

	// Index for token lookup
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{"token", 1}},
		Options: options.Index().SetUnique(true),
	})

	// Index for email lookup
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{"email", 1}},
	})

	// TTL index for automatic expiration
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{"expires_at", 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	})

	// Index for status
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{"status", 1}},
	})
}

func (r *magicLinkRepository) Create(ctx context.Context, magicLink *entities.MagicLink) error {
	magicLink.CreatedAt = time.Now()
	magicLink.UpdatedAt = time.Now()
	magicLink.ID = primitive.NewObjectID()

	_, err := r.collection.InsertOne(ctx, magicLink)
	return err
}

func (r *magicLinkRepository) GetByToken(ctx context.Context, token string) (*entities.MagicLink, error) {
	var magicLink entities.MagicLink
	err := r.collection.FindOne(ctx, bson.M{"token": token}).Decode(&magicLink)
	if err != nil {
		return nil, err
	}
	return &magicLink, nil
}

func (r *magicLinkRepository) GetByEmail(ctx context.Context, email string) (*entities.MagicLink, error) {
	var magicLink entities.MagicLink
	opts := options.FindOne().SetSort(bson.D{{"created_at", -1}})
	err := r.collection.FindOne(ctx, bson.M{
		"email":  email,
		"status": entities.MagicLinkPending,
	}, opts).Decode(&magicLink)
	if err != nil {
		return nil, err
	}
	return &magicLink, nil
}

func (r *magicLinkRepository) UpdateStatus(ctx context.Context, id primitive.ObjectID, status entities.MagicLinkStatus) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"status":     status,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func (r *magicLinkRepository) MarkAsUsed(ctx context.Context, id primitive.ObjectID) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"status":     entities.MagicLinkUsed,
				"used_at":    now,
				"updated_at": now,
			},
		},
	)
	return err
}

func (r *magicLinkRepository) DeleteExpired(ctx context.Context) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{
		"expires_at": bson.M{"$lt": time.Now()},
	})
	return err
}

func (r *magicLinkRepository) InvalidateUserLinks(ctx context.Context, email string) error {
	_, err := r.collection.UpdateMany(
		ctx,
		bson.M{
			"email":  email,
			"status": entities.MagicLinkPending,
		},
		bson.M{
			"$set": bson.M{
				"status":     entities.MagicLinkCancelled,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

// QR Code Repository
type qrCodeRepository struct {
	collection *mongo.Collection
}

func NewQRCodeRepository(db *mongo.Database) repositories.QRCodeRepository {
	repo := &qrCodeRepository{
		collection: db.Collection("qr_sessions"),
	}
	repo.createIndexes()
	return repo
}

func (r *qrCodeRepository) createIndexes() {
	ctx := context.Background()

	// Index for QR code lookup
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{"qr_code", 1}},
		Options: options.Index().SetUnique(true),
	})

	// Index for secret lookup
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{"secret", 1}},
		Options: options.Index().SetUnique(true),
	})

	// TTL index for automatic expiration
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{"expires_at", 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	})
}

func (r *qrCodeRepository) Create(ctx context.Context, qrSession *entities.QRCodeSession) error {
	qrSession.CreatedAt = time.Now()
	qrSession.UpdatedAt = time.Now()
	qrSession.ID = primitive.NewObjectID()

	_, err := r.collection.InsertOne(ctx, qrSession)
	return err
}

func (r *qrCodeRepository) GetByQRCode(ctx context.Context, qrCode string) (*entities.QRCodeSession, error) {
	var session entities.QRCodeSession
	err := r.collection.FindOne(ctx, bson.M{"qr_code": qrCode}).Decode(&session)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *qrCodeRepository) GetBySecret(ctx context.Context, secret string) (*entities.QRCodeSession, error) {
	var session entities.QRCodeSession
	err := r.collection.FindOne(ctx, bson.M{"secret": secret}).Decode(&session)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *qrCodeRepository) UpdateStatus(ctx context.Context, id primitive.ObjectID, status entities.MagicLinkStatus) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"status":     status,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func (r *qrCodeRepository) MarkAsScanned(ctx context.Context, id primitive.ObjectID, userID primitive.ObjectID) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"status":     entities.MagicLinkUsed,
				"user_id":    userID,
				"scanned_at": now,
				"updated_at": now,
			},
		},
	)
	return err
}

func (r *qrCodeRepository) DeleteExpired(ctx context.Context) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{
		"expires_at": bson.M{"$lt": time.Now()},
	})
	return err
}

// User Session Repository
type userSessionRepository struct {
	collection *mongo.Collection
}

func NewUserSessionRepository(db *mongo.Database) repositories.UserSessionRepository {
	repo := &userSessionRepository{
		collection: db.Collection("user_sessions"),
	}
	repo.createIndexes()
	return repo
}

func (r *userSessionRepository) createIndexes() {
	ctx := context.Background()

	// Index for refresh token lookup
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{"refresh_token", 1}},
		Options: options.Index().SetUnique(true),
	})

	// Index for user sessions
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{"user_id", 1}, {"is_active", 1}},
	})

	// TTL index for automatic expiration
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{"expires_at", 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	})
}

func (r *userSessionRepository) Create(ctx context.Context, session *entities.UserSession) error {
	session.CreatedAt = time.Now()
	session.UpdatedAt = time.Now()
	session.ID = primitive.NewObjectID()

	_, err := r.collection.InsertOne(ctx, session)
	return err
}

func (r *userSessionRepository) GetByRefreshToken(ctx context.Context, refreshToken string) (*entities.UserSession, error) {
	var session entities.UserSession
	err := r.collection.FindOne(ctx, bson.M{
		"refresh_token": refreshToken,
		"is_active":     true,
	}).Decode(&session)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *userSessionRepository) GetUserSessions(ctx context.Context, userID primitive.ObjectID) ([]*entities.UserSession, error) {
	cursor, err := r.collection.Find(ctx, bson.M{
		"user_id":   userID,
		"is_active": true,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var sessions []*entities.UserSession
	for cursor.Next(ctx) {
		var session entities.UserSession
		if err := cursor.Decode(&session); err != nil {
			continue
		}
		sessions = append(sessions, &session)
	}

	return sessions, nil
}

func (r *userSessionRepository) UpdateLastUsed(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"last_used_at": time.Now(),
				"updated_at":   time.Now(),
			},
		},
	)
	return err
}

func (r *userSessionRepository) RevokeSession(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"is_active":  false,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func (r *userSessionRepository) RevokeUserSessions(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.UpdateMany(
		ctx,
		bson.M{"user_id": userID},
		bson.M{
			"$set": bson.M{
				"is_active":  false,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func (r *userSessionRepository) DeleteExpired(ctx context.Context) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{
		"expires_at": bson.M{"$lt": time.Now()},
	})
	return err
}
