// cmd/server/main.go - UPDATED
package main

import (
	"bro-chat/internal/infrastructure/config"
	"bro-chat/internal/infrastructure/database"
	"bro-chat/internal/infrastructure/database/repositories"
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
	groupRepo := repositories.NewGroupRepository(db)
	// Initialize new auth repositories
	magicLinkRepo := mongoRepo.NewMagicLinkRepository(db)
	qrCodeRepo := mongoRepo.NewQRCodeRepository(db)
	sessionRepo := mongoRepo.NewUserSessionRepository(db)

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize services
	fileUploadService := services.NewFileUploadService()
	emailService := services.NewEmailService()

	// Initialize use cases
	userUsecase := usecases.NewUserUsecase(userRepo)
	chatUsecase := usecases.NewChatUsecase(chatRepo, userRepo)
	messageUsecase := usecases.NewMessageUsecase(messageRepo, chatRepo, userRepo, hub)
	groupUsecase := usecases.NewGroupUsecase(groupRepo, userRepo, chatRepo, hub)
	// Initialize new auth usecase
	authUsecase := usecases.NewAuthUsecase(
		userRepo,
		magicLinkRepo,
		qrCodeRepo,
		sessionRepo,
		emailService,
		cfg.JWTSecret,
		cfg.FrontendURL, // Add this to config
	)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authUsecase, userUsecase)
	userHandler := handlers.NewUserHandler(userUsecase)
	chatHandler := handlers.NewChatHandler(chatUsecase)
	messageHandler := handlers.NewMessageHandler(messageUsecase, fileUploadService)
	wsHandler := handlers.NewWebSocketHandler(hub, messageUsecase)
	groupHandler := handlers.NewGroupHandler(groupUsecase)
	// Setup Gin router
	r := gin.Default()
	r.Use(middleware.CORS())

	// Serve static files (for uploaded media)
	r.Static("/uploads", "./uploads")

	// ========== NEW MAGIC LINK AUTH ROUTES ==========
	auth := r.Group("/api/auth")
	{
		// Magic Link Authentication
		auth.POST("/magic-link", authHandler.SendMagicLink)
		auth.POST("/verify", authHandler.VerifyMagicLink)
		auth.POST("/register-magic", authHandler.RegisterWithMagicLink)

		// QR Code Authentication
		auth.POST("/qr/generate", authHandler.GenerateQRCode)
		auth.GET("/qr/status", authHandler.CheckQRStatus)
		auth.POST("/qr/login", authHandler.LoginWithQRCode)

		// Session Management
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)

		// Utilities
		auth.GET("/validate", authHandler.ValidateToken)
		auth.POST("/cleanup", authHandler.CleanupExpired)

		// Legacy password auth (backward compatibility)
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
	}

	// Protected routes that require QR scanning (mobile app simulation)
	qr := r.Group("/api/qr")
	qr.Use(middleware.AuthMiddleware())
	{
		qr.POST("/scan", authHandler.ScanQRCode)
		qr.POST("/logout-all", authHandler.LogoutAllDevices)
	}

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		groups := api.Group("/groups")
		{
			// Group information
			groups.GET("/:groupId/info", groupHandler.GetGroupInfo)
			groups.PUT("/:groupId/info", groupHandler.UpdateGroupInfo)
			groups.PUT("/:groupId/settings", groupHandler.UpdateGroupSettings)

			// Member management
			groups.POST("/:groupId/members", groupHandler.AddMembers)
			groups.DELETE("/:groupId/members/:userId", groupHandler.RemoveMember)
			groups.POST("/:groupId/leave", groupHandler.LeaveGroup)
			groups.PUT("/:groupId/members/:userId/role", groupHandler.ChangeRole)

			// Group invitations
			groups.POST("/:groupId/invites", groupHandler.CreateInvite)
			groups.GET("/:groupId/invites", groupHandler.GetGroupInvites)
			groups.DELETE("/:groupId/invites/:inviteId", groupHandler.RevokeInvite)
			groups.POST("/join", groupHandler.JoinViaInvite)

			// Group actions
			groups.POST("/:groupId/pin", groupHandler.PinGroup)
			groups.POST("/:groupId/unpin", groupHandler.UnpinGroup)
			groups.POST("/:groupId/mute", groupHandler.MuteGroup)
			groups.POST("/:groupId/unmute", groupHandler.UnmuteGroup)
			groups.POST("/:groupId/archive", groupHandler.ArchiveGroup)
			groups.POST("/:groupId/unarchive", groupHandler.UnarchiveGroup)
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
	r.GET("/api/groups/invites/:inviteCode/info", groupHandler.GetInviteInfo)
	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"version": "3.0.0",
			"features": []string{
				"magic-link-auth",
				"qr-code-auth",
				"session-management",
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
			"version": "3.0.0",
			"name":    "WhatsApp Clone API with Magic Link Auth",
			"endpoints": map[string]interface{}{
				"auth": map[string]string{
					"POST /api/auth/magic-link":     "Send magic link to email",
					"POST /api/auth/verify":         "Verify magic link token",
					"POST /api/auth/register-magic": "Register new user with magic link",
					"POST /api/auth/qr/generate":    "Generate QR code for login",
					"GET /api/auth/qr/status":       "Check QR code scan status",
					"POST /api/auth/qr/login":       "Login with scanned QR code",
					"POST /api/auth/refresh":        "Refresh access token",
					"POST /api/auth/logout":         "Logout current session",
					"POST /api/qr/scan":             "Scan QR code (requires auth)",
					"POST /api/qr/logout-all":       "Logout all devices (requires auth)",
					"POST /api/auth/register":       "Legacy password registration",
					"POST /api/auth/login":          "Legacy password login",
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
			"auth_flow": map[string]interface{}{
				"magic_link": []string{
					"1. POST /api/auth/magic-link with email",
					"2. Check email for magic link",
					"3. POST /api/auth/verify with token from email",
					"4. If user doesn't exist, POST /api/auth/register-magic",
					"5. Use accessToken for API calls",
					"6. Use refreshToken to get new accessToken",
				},
				"qr_code": []string{
					"1. POST /api/auth/qr/generate to get QR code",
					"2. Display QR code to user",
					"3. User scans with mobile app (POST /api/qr/scan)",
					"4. Web client polls GET /api/auth/qr/status",
					"5. When scanned, POST /api/auth/qr/login with secret",
					"6. Use returned tokens for authentication",
				},
			},
		}

		c.JSON(http.StatusOK, docs)
	})

	log.Printf("🚀 Enhanced WhatsApp Clone Server v3.0.0 starting on port %s", cfg.Port)
	log.Printf("📚 API Documentation: http://localhost:%s/api/docs", cfg.Port)
	log.Printf("🏥 Health Check: http://localhost:%s/health", cfg.Port)
	log.Printf("📁 File Uploads: http://localhost:%s/uploads/", cfg.Port)

	log.Printf("\n🎉 New Authentication Features:")
	log.Printf("   • 🔗 Magic Link Authentication (passwordless)")
	log.Printf("   • 📱 QR Code Login (like WhatsApp Web)")
	log.Printf("   • 🔄 Session Management & Refresh Tokens")
	log.Printf("   • 📧 Email Service Integration")
	log.Printf("   • 🔐 Secure Token Generation")
	log.Printf("   • 🕒 Auto-cleanup of Expired Tokens")
	log.Printf("   • 📱 Multi-device Support")
	log.Printf("   • 🔙 Backward Compatible with Password Auth")

	log.Printf("\n🔧 Previous Features Still Available:")
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
