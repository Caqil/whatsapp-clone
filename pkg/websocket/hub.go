package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

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
	Broadcast   chan []byte
	Register    chan *Client
	Unregister  chan *Client
}

type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID primitive.ObjectID
}

type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
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
		Broadcast:   make(chan []byte),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
	}
}

func (h *Hub) Run() {
	log.Printf("WebSocket Hub started")
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			h.UserClients[client.UserID] = client
			log.Printf("✅ WebSocket: User %s connected (Total: %d)", client.UserID.Hex(), len(h.Clients))

		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				delete(h.UserClients, client.UserID)
				close(client.Send)
				log.Printf("❌ WebSocket: User %s disconnected (Total: %d)", client.UserID.Hex(), len(h.Clients))
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

func (c *Client) handleMessage(msg Message) {
	log.Printf("📨 WebSocket: Received message type '%s' from user %s", msg.Type, c.UserID.Hex())

	switch msg.Type {
	case "message":
		log.Printf("💬 WebSocket: Broadcasting message to other clients")
		// Broadcast to other clients
		broadcastMsg := Message{
			Type:    "message",
			Payload: msg.Payload,
		}
		c.Hub.BroadcastToOthers(c.UserID, broadcastMsg)

	case "typing":
		log.Printf("⌨️  WebSocket: Broadcasting typing indicator")
		// Broadcast typing indicator to other clients
		broadcastMsg := Message{
			Type:    "typing",
			Payload: msg.Payload,
		}
		c.Hub.BroadcastToOthers(c.UserID, broadcastMsg)

	default:
		log.Printf("❓ WebSocket: Unknown message type: %s", msg.Type)
	}
}

func (h *Hub) BroadcastToOthers(senderID primitive.ObjectID, message interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("❌ WebSocket: Error marshaling message: %v", err)
		return
	}

	broadcastCount := 0
	for client := range h.Clients {
		if client.UserID != senderID {
			select {
			case client.Send <- data:
				broadcastCount++
			default:
				close(client.Send)
				delete(h.Clients, client)
				delete(h.UserClients, client.UserID)
			}
		}
	}
	log.Printf("📤 WebSocket: Message sent to %d clients", broadcastCount)
}

func (h *Hub) SendToUser(userID primitive.ObjectID, message interface{}) {
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
		var msg Message
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Handle the message
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

			// Add queued chat messages to the current websocket message.
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
