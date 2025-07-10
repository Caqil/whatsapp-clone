// internal/infrastructure/config/config.go - UPDATED
package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	MongoURI    string
	JWTSecret   string
	DBName      string
	FrontendURL string

	// Email configuration
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string
}

func Load() *Config {
	godotenv.Load()

	return &Config{
		Port:        getEnv("PORT", "8080"),
		MongoURI:    getEnv("MONGO_URI", "mongodb://localhost:27017"),
		JWTSecret:   getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production"),
		DBName:      getEnv("DB_NAME", "bro-chat"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),

		// Email settings
		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		FromEmail:    getEnv("FROM_EMAIL", "noreply@whatsapp-clone.com"),
		FromName:     getEnv("FROM_NAME", "WhatsApp Clone"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
