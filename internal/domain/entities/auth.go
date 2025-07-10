// internal/domain/entities/auth.go
package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MagicLinkStatus string

const (
	MagicLinkPending   MagicLinkStatus = "pending"
	MagicLinkUsed      MagicLinkStatus = "used"
	MagicLinkExpired   MagicLinkStatus = "expired"
	MagicLinkCancelled MagicLinkStatus = "cancelled"
)

type DeviceType string

const (
	DeviceWeb     DeviceType = "web"
	DeviceMobile  DeviceType = "mobile"
	DeviceDesktop DeviceType = "desktop"
)

type MagicLink struct {
	ID        primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Email     string              `bson:"email" json:"email"`
	Token     string              `bson:"token" json:"token"`
	UserID    *primitive.ObjectID `bson:"user_id,omitempty" json:"userId,omitempty"`
	Status    MagicLinkStatus     `bson:"status" json:"status"`
	ExpiresAt time.Time           `bson:"expires_at" json:"expiresAt"`
	UsedAt    *time.Time          `bson:"used_at,omitempty" json:"usedAt,omitempty"`
	IPAddress string              `bson:"ip_address" json:"ipAddress"`
	UserAgent string              `bson:"user_agent" json:"userAgent"`
	CreatedAt time.Time           `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time           `bson:"updated_at" json:"updatedAt"`
}

type QRCodeSession struct {
	ID        primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	QRCode    string              `bson:"qr_code" json:"qrCode"`
	Secret    string              `bson:"secret" json:"secret"`
	UserID    *primitive.ObjectID `bson:"user_id,omitempty" json:"userId,omitempty"`
	Status    MagicLinkStatus     `bson:"status" json:"status"`
	ExpiresAt time.Time           `bson:"expires_at" json:"expiresAt"`
	ScannedAt *time.Time          `bson:"scanned_at,omitempty" json:"scannedAt,omitempty"`
	IPAddress string              `bson:"ip_address" json:"ipAddress"`
	UserAgent string              `bson:"user_agent" json:"userAgent"`
	CreatedAt time.Time           `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time           `bson:"updated_at" json:"updatedAt"`
}

type UserSession struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID `bson:"user_id" json:"userId"`
	RefreshToken string             `bson:"refresh_token" json:"refreshToken"`
	DeviceType   DeviceType         `bson:"device_type" json:"deviceType"`
	DeviceName   string             `bson:"device_name" json:"deviceName"`
	IPAddress    string             `bson:"ip_address" json:"ipAddress"`
	UserAgent    string             `bson:"user_agent" json:"userAgent"`
	IsActive     bool               `bson:"is_active" json:"isActive"`
	LastUsedAt   time.Time          `bson:"last_used_at" json:"lastUsedAt"`
	ExpiresAt    time.Time          `bson:"expires_at" json:"expiresAt"`
	CreatedAt    time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updatedAt"`
}

// Request structures
type MagicLinkRequest struct {
	Email      string     `json:"email" binding:"required,email"`
	DeviceType DeviceType `json:"deviceType" binding:"required"`
	DeviceName string     `json:"deviceName"`
}

type VerifyMagicLinkRequest struct {
	Token string `json:"token" binding:"required"`
}

type QRCodeRequest struct {
	DeviceType DeviceType `json:"deviceType" binding:"required"`
	DeviceName string     `json:"deviceName"`
}

type QRCodeScanRequest struct {
	QRCode string `json:"qrCode" binding:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

// Response structures
type MagicLinkResponse struct {
	Message   string    `json:"message"`
	ExpiresAt time.Time `json:"expiresAt"`
	Email     string    `json:"email"`
}

type QRCodeResponse struct {
	QRCode    string    `json:"qrCode"`
	Secret    string    `json:"secret"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type AuthResponse struct {
	User         *User  `json:"user"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresAt    int64  `json:"expiresAt"`
}

type QRStatusResponse struct {
	Status    MagicLinkStatus `json:"status"`
	User      *User           `json:"user,omitempty"`
	ScannedAt *time.Time      `json:"scannedAt,omitempty"`
}
type AuthError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
	Email   string `json:"email,omitempty"`
}

func (e *AuthError) Error() string {
	return e.Message
}
