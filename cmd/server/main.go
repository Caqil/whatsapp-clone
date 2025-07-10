package main

import (
	"bro-chat/internal/infrastructure/config"
	"bro-chat/internal/infrastructure/database"
	mongoRepo "bro-chat/internal/infrastructure/database/repositories"
	"bro-chat/internal/interfaces/handlers"
	"bro-chat/internal/interfaces/middleware"
	"bro-chat/internal/usecases"
	"bro-chat/pkg/websocket"
	"log"

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

	// Initialize use cases
	userUsecase := usecases.NewUserUsecase(userRepo)
	chatUsecase := usecases.NewChatUsecase(chatRepo, userRepo)
	messageUsecase := usecases.NewMessageUsecase(messageRepo, chatRepo)

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userUsecase)
	chatHandler := handlers.NewChatHandler(chatUsecase)
	messageHandler := handlers.NewMessageHandler(messageUsecase)
	wsHandler := handlers.NewWebSocketHandler(hub, messageUsecase)

	// Setup Gin router
	r := gin.Default()
	r.Use(middleware.CORS())

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
			messages.POST("", messageHandler.SendMessage)
			messages.GET("/chat/:chatId", messageHandler.GetChatMessages)
			messages.PUT("/:messageId/read", messageHandler.MarkAsRead)
		}

		// WebSocket route
		api.GET("/ws", wsHandler.HandleWebSocket)
	}

	log.Printf("🚀 Server starting on port %s", cfg.Port)
	log.Fatal(r.Run(":" + cfg.Port))
}
