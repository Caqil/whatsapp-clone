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

type messageRepository struct {
	collection *mongo.Collection
}

func NewMessageRepository(db *mongo.Database) repositories.MessageRepository {
	return &messageRepository{
		collection: db.Collection("messages"),
	}
}

func (r *messageRepository) Create(ctx context.Context, message *entities.Message) error {
	message.CreatedAt = time.Now()
	message.UpdatedAt = time.Now()
	message.ID = primitive.NewObjectID()

	_, err := r.collection.InsertOne(ctx, message)
	return err
}

func (r *messageRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*entities.Message, error) {
	var message entities.Message
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&message)
	if err != nil {
		return nil, err
	}
	return &message, nil
}

func (r *messageRepository) GetChatMessages(ctx context.Context, chatID primitive.ObjectID, limit, offset int) ([]*entities.Message, error) {
	filter := bson.M{"chat_id": chatID}

	opts := options.Find().
		SetSort(bson.D{{"created_at", -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var messages []*entities.Message
	for cursor.Next(ctx) {
		var message entities.Message
		if err := cursor.Decode(&message); err != nil {
			continue
		}
		messages = append(messages, &message)
	}

	return messages, nil
}

func (r *messageRepository) UpdateStatus(ctx context.Context, messageID primitive.ObjectID, status entities.MessageStatus) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": messageID},
		bson.M{
			"$set": bson.M{
				"status":     status,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func (r *messageRepository) MarkAsRead(ctx context.Context, messageID, userID primitive.ObjectID) error {
	readInfo := entities.ReadInfo{
		UserID: userID,
		ReadAt: time.Now(),
	}

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": messageID},
		bson.M{
			"$addToSet": bson.M{"read_by": readInfo},
			"$set":      bson.M{"updated_at": time.Now()},
		},
	)
	return err
}
