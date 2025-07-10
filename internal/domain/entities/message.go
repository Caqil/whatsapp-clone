package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageType string

const (
	TextMessage     MessageType = "text"
	ImageMessage    MessageType = "image"
	FileMessage     MessageType = "file"
	AudioMessage    MessageType = "audio"
	VideoMessage    MessageType = "video"
	DocumentMessage MessageType = "document"
	LocationMessage MessageType = "location"
	ContactMessage  MessageType = "contact"
)

type MessageStatus string

const (
	MessageSent      MessageStatus = "sent"      // Message sent to server
	MessageDelivered MessageStatus = "delivered" // Message delivered to recipient's device
	MessageRead      MessageStatus = "read"      // Message read by recipient
	MessageFailed    MessageStatus = "failed"    // Message failed to send
)

type ReactionType string

const (
	ReactionLike  ReactionType = "👍"
	ReactionLove  ReactionType = "❤️"
	ReactionLaugh ReactionType = "😂"
	ReactionWow   ReactionType = "😮"
	ReactionSad   ReactionType = "😢"
	ReactionAngry ReactionType = "😠"
)

type Message struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ChatID   primitive.ObjectID `bson:"chat_id" json:"chatId"`
	SenderID primitive.ObjectID `bson:"sender_id" json:"senderId"`
	Type     MessageType        `bson:"type" json:"type"`
	Content  string             `bson:"content" json:"content"`

	// Media and file information
	MediaURL     string           `bson:"media_url,omitempty" json:"mediaUrl,omitempty"`
	MediaType    string           `bson:"media_type,omitempty" json:"mediaType,omitempty"`
	FileSize     int64            `bson:"file_size,omitempty" json:"fileSize,omitempty"`
	FileName     string           `bson:"file_name,omitempty" json:"fileName,omitempty"`
	ThumbnailURL string           `bson:"thumbnail_url,omitempty" json:"thumbnailUrl,omitempty"`
	Duration     int              `bson:"duration,omitempty" json:"duration,omitempty"` // For audio/video in seconds
	Dimensions   *MediaDimensions `bson:"dimensions,omitempty" json:"dimensions,omitempty"`

	// Message features
	ReplyToID     *primitive.ObjectID `bson:"reply_to_id,omitempty" json:"replyToId,omitempty"`
	ForwardedFrom *primitive.ObjectID `bson:"forwarded_from,omitempty" json:"forwardedFrom,omitempty"`
	IsForwarded   bool                `bson:"is_forwarded" json:"isForwarded"`

	// Status and delivery
	Status      MessageStatus  `bson:"status" json:"status"`
	DeliveredTo []DeliveryInfo `bson:"delivered_to" json:"deliveredTo"`
	ReadBy      []ReadInfo     `bson:"read_by" json:"readBy"`

	// Reactions
	Reactions []MessageReaction `bson:"reactions" json:"reactions"`

	// Metadata
	EditedAt   *time.Time           `bson:"edited_at,omitempty" json:"editedAt,omitempty"`
	DeletedAt  *time.Time           `bson:"deleted_at,omitempty" json:"deletedAt,omitempty"`
	DeletedFor []primitive.ObjectID `bson:"deleted_for,omitempty" json:"deletedFor,omitempty"`
	IsDeleted  bool                 `bson:"is_deleted" json:"isDeleted"`

	CreatedAt time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time `bson:"updated_at" json:"updatedAt"`
}

type MediaDimensions struct {
	Width  int `bson:"width" json:"width"`
	Height int `bson:"height" json:"height"`
}

type DeliveryInfo struct {
	UserID      primitive.ObjectID `bson:"user_id" json:"userId"`
	DeliveredAt time.Time          `bson:"delivered_at" json:"deliveredAt"`
}

type ReadInfo struct {
	UserID primitive.ObjectID `bson:"user_id" json:"userId"`
	ReadAt time.Time          `bson:"read_at" json:"readAt"`
}

type MessageReaction struct {
	UserID   primitive.ObjectID `bson:"user_id" json:"userId"`
	Reaction ReactionType       `bson:"reaction" json:"reaction"`
	AddedAt  time.Time          `bson:"added_at" json:"addedAt"`
}

// Request structures
type SendMessageRequest struct {
	ChatID     primitive.ObjectID  `json:"chatId" binding:"required"`
	Type       MessageType         `json:"type" binding:"required"`
	Content    string              `json:"content"`
	MediaURL   string              `json:"mediaUrl,omitempty"`
	MediaType  string              `json:"mediaType,omitempty"`
	FileName   string              `json:"fileName,omitempty"`
	FileSize   int64               `json:"fileSize,omitempty"`
	Duration   int                 `json:"duration,omitempty"`
	Dimensions *MediaDimensions    `json:"dimensions,omitempty"`
	ReplyToID  *primitive.ObjectID `json:"replyToId,omitempty"`
}

type MessageReactionRequest struct {
	MessageID primitive.ObjectID `json:"messageId" binding:"required"`
	Reaction  ReactionType       `json:"reaction" binding:"required"`
}

type ForwardMessageRequest struct {
	MessageIDs []primitive.ObjectID `json:"messageIds" binding:"required"`
	ToChatIDs  []primitive.ObjectID `json:"toChatIds" binding:"required"`
}

type DeleteMessageRequest struct {
	MessageID   primitive.ObjectID `json:"messageId" binding:"required"`
	DeleteForMe bool               `json:"deleteForMe"`
}

// Response structures
type MessageResponse struct {
	*Message
	SenderName     string               `json:"senderName,omitempty"`
	ReplyToMessage *Message             `json:"replyToMessage,omitempty"`
	IsDelivered    bool                 `json:"isDelivered"`
	IsRead         bool                 `json:"isRead"`
	ReactionCount  map[ReactionType]int `json:"reactionCount"`
}

type MessageStatusUpdate struct {
	MessageID primitive.ObjectID `json:"messageId"`
	Status    MessageStatus      `json:"status"`
	UserID    primitive.ObjectID `json:"userId,omitempty"`
	Timestamp time.Time          `json:"timestamp"`
}
