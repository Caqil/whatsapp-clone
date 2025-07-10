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

type chatRepository struct {
	collection *mongo.Collection
}

func NewChatRepository(db *mongo.Database) repositories.ChatRepository {
	return &chatRepository{
		collection: db.Collection("chats"),
	}
}

func (r *chatRepository) Create(ctx context.Context, chat *entities.Chat) error {
	chat.CreatedAt = time.Now()
	chat.UpdatedAt = time.Now()
	chat.ID = primitive.NewObjectID()

	_, err := r.collection.InsertOne(ctx, chat)
	return err
}

func (r *chatRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*entities.Chat, error) {
	var chat entities.Chat
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&chat)
	if err != nil {
		return nil, err
	}
	return &chat, nil
}

func (r *chatRepository) GetUserChats(ctx context.Context, userID primitive.ObjectID) ([]*entities.Chat, error) {
	filter := bson.M{
		"participants": bson.M{"$in": []primitive.ObjectID{userID}},
	}

	opts := options.Find().SetSort(bson.D{{"updated_at", -1}})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var chats []*entities.Chat
	for cursor.Next(ctx) {
		var chat entities.Chat
		if err := cursor.Decode(&chat); err != nil {
			continue
		}
		chats = append(chats, &chat)
	}

	return chats, nil
}

func (r *chatRepository) UpdateLastMessage(ctx context.Context, chatID primitive.ObjectID, message *entities.Message) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": chatID},
		bson.M{
			"$set": bson.M{
				"last_message": message,
				"updated_at":   time.Now(),
			},
		},
	)
	return err
}

func (r *chatRepository) AddParticipant(ctx context.Context, chatID, userID primitive.ObjectID) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": chatID},
		bson.M{
			"$addToSet": bson.M{"participants": userID},
			"$set":      bson.M{"updated_at": time.Now()},
		},
	)
	return err
}

func (r *chatRepository) RemoveParticipant(ctx context.Context, chatID, userID primitive.ObjectID) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": chatID},
		bson.M{
			"$pull": bson.M{"participants": userID},
			"$set":  bson.M{"updated_at": time.Now()},
		},
	)
	return err
}
