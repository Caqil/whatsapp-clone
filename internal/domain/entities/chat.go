package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChatType string

const (
	DirectChat ChatType = "direct"
	GroupChat  ChatType = "group"
)

type Chat struct {
	ID           primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Type         ChatType             `bson:"type" json:"type"`
	Name         string               `bson:"name,omitempty" json:"name,omitempty"`
	Description  string               `bson:"description,omitempty" json:"description,omitempty"`
	Avatar       string               `bson:"avatar,omitempty" json:"avatar,omitempty"`
	Participants []primitive.ObjectID `bson:"participants" json:"participants"`
	CreatedBy    primitive.ObjectID   `bson:"created_by" json:"createdBy"`
	LastMessage  *Message             `bson:"last_message,omitempty" json:"lastMessage,omitempty"`
	CreatedAt    time.Time            `bson:"created_at" json:"createdAt"`
	UpdatedAt    time.Time            `bson:"updated_at" json:"updatedAt"`
}

type CreateChatRequest struct {
	Type         ChatType             `json:"type" binding:"required"`
	Name         string               `json:"name"`
	Description  string               `json:"description"`
	Participants []primitive.ObjectID `json:"participants" binding:"required"`
}
