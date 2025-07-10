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
	repo := &messageRepository{
		collection: db.Collection("messages"),
	}

	// Create indexes for better performance
	repo.createIndexes()

	return repo
}

func (r *messageRepository) createIndexes() {
	ctx := context.Background()

	// Compound index for chat messages with timestamp
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{"chat_id", 1},
			{"created_at", -1},
		},
	})

	// Index for message status tracking
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{"chat_id", 1},
			{"status", 1},
		},
	})

	// Text search index for message content
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{"content", "text"},
		},
	})

	// Index for media messages
	r.collection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{"chat_id", 1},
			{"type", 1},
			{"created_at", -1},
		},
	})
}

func (r *messageRepository) Create(ctx context.Context, message *entities.Message) error {
	message.CreatedAt = time.Now()
	message.UpdatedAt = time.Now()
	message.ID = primitive.NewObjectID()
	message.Status = entities.MessageSent

	_, err := r.collection.InsertOne(ctx, message)
	return err
}

func (r *messageRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*entities.Message, error) {
	var message entities.Message
	err := r.collection.FindOne(ctx, bson.M{"_id": id, "is_deleted": bson.M{"$ne": true}}).Decode(&message)
	if err != nil {
		return nil, err
	}
	return &message, nil
}

func (r *messageRepository) GetChatMessages(ctx context.Context, chatID primitive.ObjectID, limit, offset int) ([]*entities.Message, error) {
	filter := bson.M{
		"chat_id":    chatID,
		"is_deleted": bson.M{"$ne": true},
	}

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

func (r *messageRepository) Update(ctx context.Context, message *entities.Message) error {
	message.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": message.ID},
		bson.M{"$set": message},
	)
	return err
}

func (r *messageRepository) Delete(ctx context.Context, messageID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": messageID})
	return err
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

func (r *messageRepository) MarkAsDelivered(ctx context.Context, messageID, userID primitive.ObjectID) error {
	deliveryInfo := entities.DeliveryInfo{
		UserID:      userID,
		DeliveredAt: time.Now(),
	}

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": messageID},
		bson.M{
			"$addToSet": bson.M{"delivered_to": deliveryInfo},
			"$set":      bson.M{"updated_at": time.Now()},
		},
	)

	// Update status to delivered if not already read
	if err == nil {
		r.collection.UpdateOne(
			ctx,
			bson.M{
				"_id":    messageID,
				"status": entities.MessageSent,
			},
			bson.M{
				"$set": bson.M{"status": entities.MessageDelivered},
			},
		)
	}

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
			"$set": bson.M{
				"status":     entities.MessageRead,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func (r *messageRepository) MarkMultipleAsRead(ctx context.Context, messageIDs []primitive.ObjectID, userID primitive.ObjectID) error {
	readInfo := entities.ReadInfo{
		UserID: userID,
		ReadAt: time.Now(),
	}

	_, err := r.collection.UpdateMany(
		ctx,
		bson.M{"_id": bson.M{"$in": messageIDs}},
		bson.M{
			"$addToSet": bson.M{"read_by": readInfo},
			"$set": bson.M{
				"status":     entities.MessageRead,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}

func (r *messageRepository) AddReaction(ctx context.Context, messageID, userID primitive.ObjectID, reaction entities.ReactionType) error {
	// First remove any existing reaction from this user
	r.RemoveReaction(ctx, messageID, userID)

	// Add new reaction
	reactionInfo := entities.MessageReaction{
		UserID:   userID,
		Reaction: reaction,
		AddedAt:  time.Now(),
	}

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": messageID},
		bson.M{
			"$addToSet": bson.M{"reactions": reactionInfo},
			"$set":      bson.M{"updated_at": time.Now()},
		},
	)
	return err
}

func (r *messageRepository) RemoveReaction(ctx context.Context, messageID, userID primitive.ObjectID) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": messageID},
		bson.M{
			"$pull": bson.M{"reactions": bson.M{"user_id": userID}},
			"$set":  bson.M{"updated_at": time.Now()},
		},
	)
	return err
}

func (r *messageRepository) GetMessageReactions(ctx context.Context, messageID primitive.ObjectID) ([]entities.MessageReaction, error) {
	var message entities.Message
	err := r.collection.FindOne(
		ctx,
		bson.M{"_id": messageID},
		options.FindOne().SetProjection(bson.M{"reactions": 1}),
	).Decode(&message)

	if err != nil {
		return nil, err
	}

	return message.Reactions, nil
}

func (r *messageRepository) GetRepliedMessage(ctx context.Context, messageID primitive.ObjectID) (*entities.Message, error) {
	var message entities.Message
	err := r.collection.FindOne(ctx, bson.M{"_id": messageID}).Decode(&message)
	if err != nil {
		return nil, err
	}

	if message.ReplyToID == nil {
		return nil, nil
	}

	return r.GetByID(ctx, *message.ReplyToID)
}

func (r *messageRepository) ForwardMessages(ctx context.Context, messageIDs []primitive.ObjectID, toChatIDs []primitive.ObjectID, senderID primitive.ObjectID) error {
	// Get original messages
	cursor, err := r.collection.Find(ctx, bson.M{"_id": bson.M{"$in": messageIDs}})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var originalMessages []entities.Message
	if err := cursor.All(ctx, &originalMessages); err != nil {
		return err
	}

	// Create forwarded messages for each target chat
	var forwardedMessages []interface{}
	for _, chatID := range toChatIDs {
		for _, original := range originalMessages {
			forwarded := entities.Message{
				ID:            primitive.NewObjectID(),
				ChatID:        chatID,
				SenderID:      senderID,
				Type:          original.Type,
				Content:       original.Content,
				MediaURL:      original.MediaURL,
				MediaType:     original.MediaType,
				FileSize:      original.FileSize,
				FileName:      original.FileName,
				ThumbnailURL:  original.ThumbnailURL,
				Duration:      original.Duration,
				Dimensions:    original.Dimensions,
				ForwardedFrom: &original.SenderID,
				IsForwarded:   true,
				Status:        entities.MessageSent,
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}
			forwardedMessages = append(forwardedMessages, forwarded)
		}
	}

	if len(forwardedMessages) > 0 {
		_, err := r.collection.InsertMany(ctx, forwardedMessages)
		return err
	}

	return nil
}

func (r *messageRepository) SoftDeleteMessage(ctx context.Context, messageID, userID primitive.ObjectID, deleteForEveryone bool) error {
	now := time.Now()

	if deleteForEveryone {
		_, err := r.collection.UpdateOne(
			ctx,
			bson.M{"_id": messageID, "sender_id": userID}, // Only sender can delete for everyone
			bson.M{
				"$set": bson.M{
					"is_deleted": true,
					"deleted_at": now,
					"content":    "This message was deleted",
					"updated_at": now,
				},
			},
		)
		return err
	} else {
		_, err := r.collection.UpdateOne(
			ctx,
			bson.M{"_id": messageID},
			bson.M{
				"$addToSet": bson.M{"deleted_for": userID},
				"$set":      bson.M{"updated_at": now},
			},
		)
		return err
	}
}

func (r *messageRepository) EditMessage(ctx context.Context, messageID primitive.ObjectID, newContent string) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": messageID},
		bson.M{
			"$set": bson.M{
				"content":    newContent,
				"edited_at":  now,
				"updated_at": now,
			},
		},
	)
	return err
}

func (r *messageRepository) SearchMessagesInChat(ctx context.Context, chatID primitive.ObjectID, query string, limit int) ([]*entities.Message, error) {
	filter := bson.M{
		"chat_id":    chatID,
		"$text":      bson.M{"$search": query},
		"is_deleted": bson.M{"$ne": true},
	}

	opts := options.Find().
		SetSort(bson.D{{"score", bson.M{"$meta": "textScore"}}}).
		SetLimit(int64(limit))

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

func (r *messageRepository) GetMediaMessages(ctx context.Context, chatID primitive.ObjectID, mediaType entities.MessageType, limit, offset int) ([]*entities.Message, error) {
	filter := bson.M{
		"chat_id":    chatID,
		"type":       mediaType,
		"is_deleted": bson.M{"$ne": true},
	}

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

func (r *messageRepository) GetUnreadMessageCount(ctx context.Context, chatID, userID primitive.ObjectID) (int64, error) {
	filter := bson.M{
		"chat_id":         chatID,
		"sender_id":       bson.M{"$ne": userID}, // Don't count own messages
		"read_by.user_id": bson.M{"$ne": userID}, // Not read by this user
		"is_deleted":      bson.M{"$ne": true},
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	return count, err
}

func (r *messageRepository) GetLastMessage(ctx context.Context, chatID primitive.ObjectID) (*entities.Message, error) {
	filter := bson.M{
		"chat_id":    chatID,
		"is_deleted": bson.M{"$ne": true},
	}

	opts := options.FindOne().SetSort(bson.D{{"created_at", -1}})

	var message entities.Message
	err := r.collection.FindOne(ctx, filter, opts).Decode(&message)
	if err != nil {
		return nil, err
	}

	return &message, nil
}

func (r *messageRepository) GetMessageStats(ctx context.Context, chatID primitive.ObjectID) (*repositories.MessageStats, error) {
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"chat_id":    chatID,
				"is_deleted": bson.M{"$ne": true},
			},
		},
		{
			"$group": bson.M{
				"_id":           nil,
				"totalMessages": bson.M{"$sum": 1},
				"mediaMessages": bson.M{
					"$sum": bson.M{
						"$cond": bson.M{
							"if":   bson.M{"$ne": []interface{}{"$type", "text"}},
							"then": 1,
							"else": 0,
						},
					},
				},
				"textMessages": bson.M{
					"$sum": bson.M{
						"$cond": bson.M{
							"if":   bson.M{"$eq": []interface{}{"$type", "text"}},
							"then": 1,
							"else": 0,
						},
					},
				},
				"lastActivity": bson.M{"$max": "$created_at"},
			},
		},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []repositories.MessageStats
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return &repositories.MessageStats{}, nil
	}

	return &results[0], nil
}
