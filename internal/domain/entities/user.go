package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username    string             `bson:"username" json:"username"`
	Email       string             `bson:"email" json:"email"`
	Password    string             `bson:"password,omitempty" json:"-"` // Optional now
	FirstName   string             `bson:"first_name" json:"firstName"`
	LastName    string             `bson:"last_name" json:"lastName"`
	Avatar      string             `bson:"avatar" json:"avatar"`
	Phone       string             `bson:"phone" json:"phone"`
	Bio         string             `bson:"bio" json:"bio"` // NEW
	IsOnline    bool               `bson:"is_online" json:"isOnline"`
	LastSeen    time.Time          `bson:"last_seen" json:"lastSeen"`
	IsVerified  bool               `bson:"is_verified" json:"isVerified"`                        // NEW - email verified
	VerifiedAt  *time.Time         `bson:"verified_at,omitempty" json:"verifiedAt,omitempty"`    // NEW
	LoginMethod string             `bson:"login_method" json:"loginMethod"`                      // NEW - "magic_link", "password", "qr"
	LastLoginAt *time.Time         `bson:"last_login_at,omitempty" json:"lastLoginAt,omitempty"` // NEW
	CreatedAt   time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updatedAt"`
}

// Updated request structures
type UserRegisterRequest struct {
	Username  string `json:"username" binding:"required,min=3,max=30"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password,omitempty"` // Optional now
	FirstName string `json:"firstName" binding:"required"`
	LastName  string `json:"lastName" binding:"required"`
	Phone     string `json:"phone"`
	Bio       string `json:"bio"`
}

type UserLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password,omitempty"` // Optional now
}

type UserUpdateRequest struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Avatar    string `json:"avatar"`
	Phone     string `json:"phone"`
	Bio       string `json:"bio"`
	Username  string `json:"username"`
}

// Magic link user creation
type MagicLinkUserRequest struct {
	Email     string `json:"email" binding:"required,email"`
	FirstName string `json:"firstName" binding:"required"`
	LastName  string `json:"lastName" binding:"required"`
	Username  string `json:"username" binding:"required,min=3,max=30"`
	Phone     string `json:"phone"`
	Bio       string `json:"bio"`
}
