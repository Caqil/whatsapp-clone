package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageType string

const (
	TextMessage  MessageType = "text"
	ImageMessage MessageType = "image"
	FileMessage  MessageType = "file"
	AudioMessage MessageType = "audio"
)

type MessageStatus string

const (
	MessageSent      MessageStatus = "sent"
	MessageDelivered MessageStatus = "delivered"
	MessageRead      MessageStatus = "read"
)

type Message struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ChatID    primitive.ObjectID `bson:"chat_id" json:"chatId"`
	SenderID  primitive.ObjectID `bson:"sender_id" json:"senderId"`
	Type      MessageType        `bson:"type" json:"type"`
	Content   string             `bson:"content" json:"content"`
	FileURL   string             `bson:"file_url,omitempty" json:"fileUrl,omitempty"`
	Status    MessageStatus      `bson:"status" json:"status"`
	ReadBy    []ReadInfo         `bson:"read_by" json:"readBy"`
	CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}

type ReadInfo struct {
	UserID primitive.ObjectID `bson:"user_id" json:"userId"`
	ReadAt time.Time          `bson:"read_at" json:"readAt"`
}

type SendMessageRequest struct {
	ChatID  primitive.ObjectID `json:"chatId" binding:"required"`
	Type    MessageType        `json:"type" binding:"required"`
	Content string             `json:"content" binding:"required"`
	FileURL string             `json:"fileUrl,omitempty"`
}
