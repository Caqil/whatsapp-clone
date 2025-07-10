package main

import (
	"bro-chat/internal/infrastructure/config"
	"bro-chat/internal/infrastructure/database"
	mongoRepo "bro-chat/internal/infrastructure/database/repositories"
	"bro-chat/internal/interfaces/handlers"
	"bro-chat/internal/interfaces/middleware"
	"bro-chat/internal/usecases"
	"bro-chat/pkg/services"
	"bro-chat/pkg/websocket"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to MongoDB
	db, err := database.NewMongoDB(cfg.MongoURI, cfg.DBName)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}

	// Initialize repositories
	userRepo := mongoRepo.NewUserRepository(db)
	chatRepo := mongoRepo.NewChatRepository(db)
	messageRepo := mongoRepo.NewMessageRepository(db)

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize services
	fileUploadService := services.NewFileUploadService()

	// Initialize use cases (with updated dependencies)
	userUsecase := usecases.NewUserUsecase(userRepo)
	chatUsecase := usecases.NewChatUsecase(chatRepo, userRepo)
	messageUsecase := usecases.NewMessageUsecase(messageRepo, chatRepo, userRepo, hub)

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userUsecase)
	chatHandler := handlers.NewChatHandler(chatUsecase)
	messageHandler := handlers.NewMessageHandler(messageUsecase, fileUploadService)
	wsHandler := handlers.NewWebSocketHandler(hub, messageUsecase)

	// Setup Gin router
	r := gin.Default()
	r.Use(middleware.CORS())

	// Serve static files (for uploaded media)
	r.Static("/uploads", "./uploads")

	// Public routes
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", userHandler.Register)
		auth.POST("/login", userHandler.Login)
	}

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// User routes
		users := api.Group("/users")
		{
			users.GET("/profile", userHandler.GetProfile)
			users.PUT("/profile", userHandler.UpdateProfile)
			users.GET("/search", userHandler.SearchUsers)
		}

		// Chat routes
		chats := api.Group("/chats")
		{
			chats.POST("", chatHandler.CreateChat)
			chats.GET("", chatHandler.GetUserChats)
			chats.GET("/:chatId", chatHandler.GetChat)
		}

		// Message routes
		messages := api.Group("/messages")
		{
			// Core message operations
			messages.POST("", messageHandler.SendMessage)
			messages.GET("/chat/:chatId", messageHandler.GetChatMessages)
			messages.GET("/:messageId", messageHandler.GetMessage)

			// Message status
			messages.PUT("/:messageId/read", messageHandler.MarkAsRead)
			messages.PUT("/read-multiple", messageHandler.MarkMultipleAsRead)
			messages.GET("/chat/:chatId/unread-count", messageHandler.GetUnreadCount)

			// File upload and media
			messages.POST("/upload", messageHandler.UploadFile)
			messages.POST("/media", messageHandler.SendMediaMessage)
			messages.GET("/chat/:chatId/media", messageHandler.GetMediaMessages)

			// Message reactions
			messages.POST("/reactions", messageHandler.AddReaction)
			messages.DELETE("/:messageId/reactions", messageHandler.RemoveReaction)

			// Message management
			messages.POST("/forward", messageHandler.ForwardMessages)
			messages.DELETE("/delete", messageHandler.DeleteMessage)
			messages.PUT("/:messageId/edit", messageHandler.EditMessage)

			// Search
			messages.GET("/chat/:chatId/search", messageHandler.SearchMessages)
		}

		// WebSocket route
		api.GET("/ws", wsHandler.HandleWebSocket)
	}

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"version": "2.0.0",
			"features": []string{
				"enhanced-messaging",
				"file-upload",
				"reactions",
				"message-status",
				"search",
				"media-support",
			},
		})
	})

	// API documentation endpoint
	r.GET("/api/docs", func(c *gin.Context) {
		docs := map[string]interface{}{
			"version": "2.0.0",
			"name":    "WhatsApp Clone API",
			"endpoints": map[string]interface{}{
				"auth": map[string]string{
					"POST /api/auth/register": "Register new user",
					"POST /api/auth/login":    "Login user",
				},
				"users": map[string]string{
					"GET /api/users/profile": "Get user profile",
					"PUT /api/users/profile": "Update user profile",
					"GET /api/users/search":  "Search users",
				},
				"chats": map[string]string{
					"POST /api/chats":        "Create new chat",
					"GET /api/chats":         "Get user chats",
					"GET /api/chats/:chatId": "Get specific chat",
				},
				"messages": map[string]string{
					"POST /api/messages":                          "Send text message",
					"POST /api/messages/media":                    "Send media message with file upload",
					"POST /api/messages/upload":                   "Upload file only",
					"GET /api/messages/chat/:chatId":              "Get chat messages",
					"GET /api/messages/:messageId":                "Get specific message",
					"PUT /api/messages/:messageId/read":           "Mark message as read",
					"PUT /api/messages/read-multiple":             "Mark multiple messages as read",
					"GET /api/messages/chat/:chatId/unread-count": "Get unread message count",
					"GET /api/messages/chat/:chatId/media":        "Get media messages",
					"GET /api/messages/chat/:chatId/search":       "Search messages in chat",
					"POST /api/messages/reactions":                "Add reaction to message",
					"DELETE /api/messages/:messageId/reactions":   "Remove reaction from message",
					"POST /api/messages/forward":                  "Forward messages",
					"DELETE /api/messages/delete":                 "Delete message",
					"PUT /api/messages/:messageId/edit":           "Edit message",
				},
				"websocket": map[string]string{
					"GET /api/ws": "WebSocket connection for real-time features",
				},
			},
			"websocket_events": map[string]string{
				"new_message":          "New message received",
				"message_status":       "Message status update (delivered/read)",
				"message_reaction":     "Message reaction added/removed",
				"message_deleted":      "Message deleted",
				"message_edited":       "Message edited",
				"typing_start":         "User started typing",
				"typing_stop":          "User stopped typing",
				"user_online":          "User came online",
				"user_offline":         "User went offline",
				"file_upload_progress": "File upload progress",
				"file_upload_complete": "File upload completed",
				"file_upload_error":    "File upload error",
			},
		}

		c.JSON(http.StatusOK, docs)
	})

	log.Printf("🚀 Enhanced WhatsApp Clone Server starting on port %s", cfg.Port)
	log.Printf("📚 API Documentation: http://localhost:%s/api/docs", cfg.Port)
	log.Printf("🏥 Health Check: http://localhost:%s/health", cfg.Port)
	log.Printf("📁 File Uploads: http://localhost:%s/uploads/", cfg.Port)

	log.Printf("\n🎉 New Features Available:")
	log.Printf("   • 📎 File Upload & Media Messages")
	log.Printf("   • 👍 Message Reactions")
	log.Printf("   • ↩️  Reply to Messages")
	log.Printf("   • ➡️  Forward Messages")
	log.Printf("   • ✏️  Edit & Delete Messages")
	log.Printf("   • 🔍 Message Search")
	log.Printf("   • 📊 Message Status Tracking")
	log.Printf("   • 🔴 Real-time Typing Indicators")
	log.Printf("   • 📱 Enhanced WebSocket Events")

	log.Fatal(r.Run(":" + cfg.Port))
}
