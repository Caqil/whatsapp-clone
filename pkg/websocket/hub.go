package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"bro-chat/internal/domain/entities"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var Upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

type Hub struct {
	Clients     map[*Client]bool
	UserClients map[primitive.ObjectID]*Client
	ChatClients map[primitive.ObjectID]map[*Client]bool // Chat-specific client mapping
	Broadcast   chan []byte
	Register    chan *Client
	Unregister  chan *Client
}

type Client struct {
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	UserID   primitive.ObjectID
	Username string
	IsOnline bool
}

type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type WSMessageType string

const (
	// Message events
	WSNewMessage      WSMessageType = "new_message"
	WSMessageStatus   WSMessageType = "message_status"
	WSMessageReaction WSMessageType = "message_reaction"
	WSMessageDeleted  WSMessageType = "message_deleted"
	WSMessageEdited   WSMessageType = "message_edited"

	// Typing events
	WSTypingStart WSMessageType = "typing_start"
	WSTypingStop  WSMessageType = "typing_stop"

	// User events
	WSUserOnline    WSMessageType = "user_online"
	WSUserOffline   WSMessageType = "user_offline"
	WSUserJoinChat  WSMessageType = "user_join_chat"
	WSUserLeaveChat WSMessageType = "user_leave_chat"

	// Chat events
	WSChatCreated WSMessageType = "chat_created"
	WSChatUpdated WSMessageType = "chat_updated"

	// File upload events
	WSFileUploadProgress WSMessageType = "file_upload_progress"
	WSFileUploadComplete WSMessageType = "file_upload_complete"
	WSFileUploadError    WSMessageType = "file_upload_error"

	// System events
	WSError WSMessageType = "error"
	WSPong  WSMessageType = "pong"
	WSPing  WSMessageType = "ping"
)

// Payload structures
type NewMessagePayload struct {
	Message    *entities.Message  `json:"message"`
	ChatID     primitive.ObjectID `json:"chatId"`
	SenderName string             `json:"senderName"`
}

type MessageStatusPayload struct {
	MessageID primitive.ObjectID     `json:"messageId"`
	ChatID    primitive.ObjectID     `json:"chatId"`
	Status    entities.MessageStatus `json:"status"`
	UserID    primitive.ObjectID     `json:"userId"`
	Timestamp time.Time              `json:"timestamp"`
}

type MessageReactionPayload struct {
	MessageID primitive.ObjectID    `json:"messageId"`
	ChatID    primitive.ObjectID    `json:"chatId"`
	UserID    primitive.ObjectID    `json:"userId"`
	Username  string                `json:"username"`
	Reaction  entities.ReactionType `json:"reaction"`
	Action    string                `json:"action"` // "add" or "remove"
	Timestamp time.Time             `json:"timestamp"`
}

type TypingPayload struct {
	ChatID   primitive.ObjectID `json:"chatId"`
	UserID   primitive.ObjectID `json:"userId"`
	Username string             `json:"username"`
	IsTyping bool               `json:"isTyping"`
}

type UserStatusPayload struct {
	UserID   primitive.ObjectID `json:"userId"`
	Username string             `json:"username"`
	IsOnline bool               `json:"isOnline"`
	LastSeen *time.Time         `json:"lastSeen,omitempty"`
}

type ChatActionPayload struct {
	ChatID   primitive.ObjectID `json:"chatId"`
	UserID   primitive.ObjectID `json:"userId"`
	Username string             `json:"username"`
	Action   string             `json:"action"`
}

type FileUploadPayload struct {
	UploadID string             `json:"uploadId"`
	ChatID   primitive.ObjectID `json:"chatId"`
	UserID   primitive.ObjectID `json:"userId"`
	FileName string             `json:"fileName"`
	Progress int                `json:"progress,omitempty"`
	FileURL  string             `json:"fileUrl,omitempty"`
	Error    string             `json:"error,omitempty"`
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

func NewHub() *Hub {
	return &Hub{
		Clients:     make(map[*Client]bool),
		UserClients: make(map[primitive.ObjectID]*Client),
		ChatClients: make(map[primitive.ObjectID]map[*Client]bool),
		Broadcast:   make(chan []byte),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
	}
}

func (h *Hub) Run() {
	log.Printf("🚀 Enhanced WebSocket Hub started")
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			h.UserClients[client.UserID] = client
			client.IsOnline = true

			log.Printf("✅ WebSocket: User %s (%s) connected (Total: %d)",
				client.Username, client.UserID.Hex(), len(h.Clients))

			// Broadcast user online status
			h.BroadcastUserStatus(client.UserID, client.Username, true)

		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				delete(h.UserClients, client.UserID)

				// Remove from all chat rooms
				for chatID, chatClients := range h.ChatClients {
					if _, exists := chatClients[client]; exists {
						delete(chatClients, client)
						if len(chatClients) == 0 {
							delete(h.ChatClients, chatID)
						}
					}
				}

				close(client.Send)
				client.IsOnline = false

				log.Printf("❌ WebSocket: User %s (%s) disconnected (Total: %d)",
					client.Username, client.UserID.Hex(), len(h.Clients))

				// Broadcast user offline status
				h.BroadcastUserStatus(client.UserID, client.Username, false)
			}

		case message := <-h.Broadcast:
			log.Printf("📢 WebSocket: Broadcasting message to %d clients", len(h.Clients))
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client)
					delete(h.UserClients, client.UserID)
				}
			}
		}
	}
}

func (c *Client) handleMessage(msg WSMessage) {
	log.Printf("📨 WebSocket: Received '%s' from user %s", msg.Type, c.UserID.Hex())

	switch WSMessageType(msg.Type) {
	case WSTypingStart:
		c.handleTyping(msg.Payload, true)
	case WSTypingStop:
		c.handleTyping(msg.Payload, false)
	case WSUserJoinChat:
		c.handleJoinChat(msg.Payload)
	case WSUserLeaveChat:
		c.handleLeaveChat(msg.Payload)
	case WSPing:
		c.handlePing()
	default:
		log.Printf("❓ WebSocket: Unknown message type: %s", msg.Type)
	}
}

func (c *Client) handleTyping(payload interface{}, isTyping bool) {
	data, _ := json.Marshal(payload)
	var typingData TypingPayload
	if err := json.Unmarshal(data, &typingData); err != nil {
		return
	}

	typingData.UserID = c.UserID
	typingData.Username = c.Username
	typingData.IsTyping = isTyping

	var eventType WSMessageType
	if isTyping {
		eventType = WSTypingStart
	} else {
		eventType = WSTypingStop
	}

	c.Hub.BroadcastToChat(typingData.ChatID, c.UserID, WSMessage{
		Type:    string(eventType),
		Payload: typingData,
	})
}

func (c *Client) handleJoinChat(payload interface{}) {
	data, _ := json.Marshal(payload)
	var chatData ChatActionPayload
	if err := json.Unmarshal(data, &chatData); err != nil {
		return
	}

	// Add client to chat room
	if c.Hub.ChatClients[chatData.ChatID] == nil {
		c.Hub.ChatClients[chatData.ChatID] = make(map[*Client]bool)
	}
	c.Hub.ChatClients[chatData.ChatID][c] = true

	log.Printf("👥 User %s joined chat %s", c.Username, chatData.ChatID.Hex())
}

func (c *Client) handleLeaveChat(payload interface{}) {
	data, _ := json.Marshal(payload)
	var chatData ChatActionPayload
	if err := json.Unmarshal(data, &chatData); err != nil {
		return
	}

	// Remove client from chat room
	if chatClients, exists := c.Hub.ChatClients[chatData.ChatID]; exists {
		delete(chatClients, c)
		if len(chatClients) == 0 {
			delete(c.Hub.ChatClients, chatData.ChatID)
		}
	}

	log.Printf("👤 User %s left chat %s", c.Username, chatData.ChatID.Hex())
}

func (c *Client) handlePing() {
	pongMsg := WSMessage{
		Type:    string(WSPong),
		Payload: map[string]interface{}{"timestamp": time.Now()},
	}

	data, _ := json.Marshal(pongMsg)
	select {
	case c.Send <- data:
	default:
		// Channel is full, ignore
	}
}

// Broadcasting methods
func (h *Hub) BroadcastNewMessage(message *entities.Message, senderName string) {
	payload := NewMessagePayload{
		Message:    message,
		ChatID:     message.ChatID,
		SenderName: senderName,
	}

	h.BroadcastToChat(message.ChatID, message.SenderID, WSMessage{
		Type:    string(WSNewMessage),
		Payload: payload,
	})
}

func (h *Hub) BroadcastMessageStatus(messageID, chatID, userID primitive.ObjectID, status entities.MessageStatus) {
	payload := MessageStatusPayload{
		MessageID: messageID,
		ChatID:    chatID,
		Status:    status,
		UserID:    userID,
		Timestamp: time.Now(),
	}

	h.BroadcastToChat(chatID, userID, WSMessage{
		Type:    string(WSMessageStatus),
		Payload: payload,
	})
}

func (h *Hub) BroadcastMessageReaction(messageID, chatID, userID primitive.ObjectID, username string, reaction entities.ReactionType, action string) {
	payload := MessageReactionPayload{
		MessageID: messageID,
		ChatID:    chatID,
		UserID:    userID,
		Username:  username,
		Reaction:  reaction,
		Action:    action,
		Timestamp: time.Now(),
	}

	h.BroadcastToChat(chatID, primitive.NilObjectID, WSMessage{
		Type:    string(WSMessageReaction),
		Payload: payload,
	})
}

func (h *Hub) BroadcastUserStatus(userID primitive.ObjectID, username string, isOnline bool) {
	payload := UserStatusPayload{
		UserID:   userID,
		Username: username,
		IsOnline: isOnline,
	}

	if !isOnline {
		now := time.Now()
		payload.LastSeen = &now
	}

	msg := WSMessage{
		Type:    string(WSUserOnline),
		Payload: payload,
	}

	if !isOnline {
		msg.Type = string(WSUserOffline)
	}

	data, _ := json.Marshal(msg)
	h.Broadcast <- data
}

func (h *Hub) BroadcastToChat(chatID, excludeUserID primitive.ObjectID, message WSMessage) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("❌ WebSocket: Error marshaling message: %v", err)
		return
	}

	broadcastCount := 0

	// Broadcast to all clients in the specific chat
	if chatClients, exists := h.ChatClients[chatID]; exists {
		for client := range chatClients {
			if excludeUserID != primitive.NilObjectID && client.UserID == excludeUserID {
				continue
			}

			select {
			case client.Send <- data:
				broadcastCount++
			default:
				close(client.Send)
				delete(h.Clients, client)
				delete(h.UserClients, client.UserID)
				delete(chatClients, client)
			}
		}
	}

	log.Printf("📤 WebSocket: Message sent to %d clients in chat %s", broadcastCount, chatID.Hex())
}

func (h *Hub) SendToUser(userID primitive.ObjectID, message WSMessage) {
	if client, ok := h.UserClients[userID]; ok {
		data, _ := json.Marshal(message)
		select {
		case client.Send <- data:
		default:
			close(client.Send)
			delete(h.Clients, client)
			delete(h.UserClients, userID)
		}
	}
}

func (h *Hub) NotifyFileUploadProgress(userID primitive.ObjectID, uploadID string, chatID primitive.ObjectID, fileName string, progress int) {
	payload := FileUploadPayload{
		UploadID: uploadID,
		ChatID:   chatID,
		UserID:   userID,
		FileName: fileName,
		Progress: progress,
	}

	h.SendToUser(userID, WSMessage{
		Type:    string(WSFileUploadProgress),
		Payload: payload,
	})
}

func (h *Hub) NotifyFileUploadComplete(userID primitive.ObjectID, uploadID string, chatID primitive.ObjectID, fileName, fileURL string) {
	payload := FileUploadPayload{
		UploadID: uploadID,
		ChatID:   chatID,
		UserID:   userID,
		FileName: fileName,
		FileURL:  fileURL,
	}

	h.SendToUser(userID, WSMessage{
		Type:    string(WSFileUploadComplete),
		Payload: payload,
	})
}

func (h *Hub) NotifyFileUploadError(userID primitive.ObjectID, uploadID string, chatID primitive.ObjectID, fileName, errorMsg string) {
	payload := FileUploadPayload{
		UploadID: uploadID,
		ChatID:   chatID,
		UserID:   userID,
		FileName: fileName,
		Error:    errorMsg,
	}

	h.SendToUser(userID, WSMessage{
		Type:    string(WSFileUploadError),
		Payload: payload,
	})
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var msg WSMessage
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		c.handleMessage(msg)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
