package handlers

import (
	"bro-chat/internal/infrastructure/config"
	"bro-chat/internal/usecases"
	"bro-chat/pkg/auth"
	"bro-chat/pkg/websocket"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type WebSocketHandler struct {
	hub            *websocket.Hub
	messageUsecase *usecases.MessageUsecase
}

func NewWebSocketHandler(hub *websocket.Hub, messageUsecase *usecases.MessageUsecase) *WebSocketHandler {
	return &WebSocketHandler{
		hub:            hub,
		messageUsecase: messageUsecase,
	}
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Get token from query parameter for WebSocket
	token := c.Query("token")
	if token == "" {
		log.Printf("WebSocket: No token provided")
		c.Status(http.StatusUnauthorized)
		return
	}

	// Validate token
	cfg := config.Load()
	claims, err := auth.ValidateToken(token, cfg.JWTSecret)
	if err != nil {
		log.Printf("WebSocket: Token validation failed: %v", err)
		c.Status(http.StatusUnauthorized)
		return
	}

	log.Printf("WebSocket: User %s attempting to connect", claims.UserID.Hex())

	// Upgrade connection to WebSocket
	conn, err := websocket.Upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket: Failed to upgrade connection: %v", err)
		return
	}

	log.Printf("WebSocket: Successfully upgraded connection for user %s", claims.UserID.Hex())

	// Create client and register with hub
	client := &websocket.Client{
		Hub:    h.hub,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		UserID: claims.UserID,
	}

	h.hub.Register <- client

	// Start client goroutines
	go client.WritePump()
	go client.ReadPump()
}
