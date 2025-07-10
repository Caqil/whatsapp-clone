// internal/domain/entities/group.go
package entities

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ========== Group Roles ==========

type GroupRole string

const (
	RoleOwner  GroupRole = "owner"
	RoleAdmin  GroupRole = "admin"
	RoleMember GroupRole = "member"
)

// ========== Core Group Entities ==========

type GroupInfo struct {
	ID             primitive.ObjectID    `bson:"_id,omitempty" json:"id"`
	Type           string                `bson:"type" json:"type"` // should be "group"
	Name           string                `bson:"name" json:"name"`
	Description    string                `bson:"description,omitempty" json:"description,omitempty"`
	Avatar         string                `bson:"avatar,omitempty" json:"avatar,omitempty"`
	Participants   []primitive.ObjectID  `bson:"participants" json:"participants"`
	CreatedBy      primitive.ObjectID    `bson:"created_by" json:"createdBy"`
	Owner          *primitive.ObjectID   `bson:"owner,omitempty" json:"owner,omitempty"`
	Admins         []primitive.ObjectID  `bson:"admins,omitempty" json:"admins,omitempty"`
	Settings       *GroupSettings        `bson:"settings,omitempty" json:"settings,omitempty"`
	MemberCount    int                   `bson:"member_count" json:"memberCount"`
	Members        []GroupMemberWithUser `bson:"-" json:"members,omitempty"`        // Populated separately
	PendingInvites []GroupInvite         `bson:"-" json:"pendingInvites,omitempty"` // Populated separately
	IsPinned       bool                  `bson:"is_pinned" json:"isPinned"`
	IsMuted        bool                  `bson:"is_muted" json:"isMuted"`
	MutedUntil     *time.Time            `bson:"muted_until,omitempty" json:"mutedUntil,omitempty"`
	IsArchived     bool                  `bson:"is_archived" json:"isArchived"`
	LastMessage    *Message              `bson:"last_message,omitempty" json:"lastMessage,omitempty"`
	CreatedAt      time.Time             `bson:"created_at" json:"createdAt"`
	UpdatedAt      time.Time             `bson:"updated_at" json:"updatedAt"`
}

type GroupSettings struct {
	WhoCanSendMessages   string `bson:"who_can_send_messages" json:"whoCanSendMessages"`
	WhoCanEditInfo       string `bson:"who_can_edit_info" json:"whoCanEditInfo"`
	WhoCanAddMembers     string `bson:"who_can_add_members" json:"whoCanAddMembers"`
	DisappearingMessages bool   `bson:"disappearing_messages" json:"disappearingMessages"`
	DisappearingTime     int    `bson:"disappearing_time,omitempty" json:"disappearingTime,omitempty"`
}

type GroupMember struct {
	ID       primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	GroupID  primitive.ObjectID  `bson:"group_id" json:"groupId"`
	UserID   primitive.ObjectID  `bson:"user_id" json:"userId"`
	Role     GroupRole           `bson:"role" json:"role"`
	JoinedAt time.Time           `bson:"joined_at" json:"joinedAt"`
	AddedBy  *primitive.ObjectID `bson:"added_by,omitempty" json:"addedBy,omitempty"`
	IsActive bool                `bson:"is_active" json:"isActive"`
}

type GroupMemberWithUser struct {
	*GroupMember `bson:",inline"`
	User         User `bson:"-" json:"user"`
}

type GroupInvite struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	GroupID          primitive.ObjectID `bson:"group_id" json:"groupId"`
	InviteCode       string             `bson:"invite_code" json:"inviteCode"`
	InviteLink       string             `bson:"invite_link" json:"inviteLink"`
	CreatedBy        primitive.ObjectID `bson:"created_by" json:"createdBy"`
	ExpiresAt        *time.Time         `bson:"expires_at,omitempty" json:"expiresAt,omitempty"`
	MaxUses          int                `bson:"max_uses" json:"maxUses"`
	CurrentUses      int                `bson:"current_uses" json:"currentUses"`
	RequiresApproval bool               `bson:"requires_approval" json:"requiresApproval"`
	IsActive         bool               `bson:"is_active" json:"isActive"`
	CreatedAt        time.Time          `bson:"created_at" json:"createdAt"`
}

type GroupActivity struct {
	ID           primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	GroupID      primitive.ObjectID     `bson:"group_id" json:"groupId"`
	Type         string                 `bson:"type" json:"type"`
	ActorID      primitive.ObjectID     `bson:"actor_id" json:"actorId"`
	TargetUserID *primitive.ObjectID    `bson:"target_user_id,omitempty" json:"targetUserId,omitempty"`
	Details      map[string]interface{} `bson:"details,omitempty" json:"details,omitempty"`
	CreatedAt    time.Time              `bson:"created_at" json:"createdAt"`
}

// ========== User-Group Preferences ==========

type UserGroupPreferences struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID     primitive.ObjectID `bson:"user_id" json:"userId"`
	GroupID    primitive.ObjectID `bson:"group_id" json:"groupId"`
	IsPinned   bool               `bson:"is_pinned" json:"isPinned"`
	IsMuted    bool               `bson:"is_muted" json:"isMuted"`
	MutedUntil *time.Time         `bson:"muted_until,omitempty" json:"mutedUntil,omitempty"`
	IsArchived bool               `bson:"is_archived" json:"isArchived"`
	CreatedAt  time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt  time.Time          `bson:"updated_at" json:"updatedAt"`
}

// ========== Request Types ==========

type UpdateGroupInfoRequest struct {
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
	Avatar      string `json:"avatar,omitempty"`
}

type UpdateGroupSettingsRequest struct {
	WhoCanSendMessages   string `json:"whoCanSendMessages,omitempty"`
	WhoCanEditInfo       string `json:"whoCanEditInfo,omitempty"`
	WhoCanAddMembers     string `json:"whoCanAddMembers,omitempty"`
	DisappearingMessages bool   `json:"disappearingMessages"`
	DisappearingTime     *int   `json:"disappearingTime,omitempty"`
}

type AddMembersRequest struct {
	UserIDs            []primitive.ObjectID `json:"userIds" binding:"required"`
	SendWelcomeMessage bool                 `json:"sendWelcomeMessage"`
}

type ChangeRoleRequest struct {
	Role GroupRole `json:"role" binding:"required"`
}

type CreateInviteRequest struct {
	ExpiresAt        *time.Time `json:"expiresAt,omitempty"`
	MaxUses          int        `json:"maxUses,omitempty"`
	RequiresApproval bool       `json:"requiresApproval"`
}

type JoinViaInviteRequest struct {
	InviteCode string `json:"inviteCode" binding:"required"`
}

type MuteGroupRequest struct {
	Duration int `json:"duration" binding:"required"` // in seconds, -1 for forever
}

// ========== Response Types ==========

type AddMembersResult struct {
	AddedMembers []GroupMemberWithUser `json:"addedMembers"`
	FailedToAdd  []FailedMember        `json:"failedToAdd"`
}

type FailedMember struct {
	UserID string `json:"userId"`
	Reason string `json:"reason"`
}

type GroupInviteInfo struct {
	GroupID     string        `json:"groupId"`
	Name        string        `json:"name"`
	Description string        `json:"description,omitempty"`
	Avatar      string        `json:"avatar,omitempty"`
	MemberCount int           `json:"memberCount"`
	InviteInfo  InviteDetails `json:"inviteInfo"`
}

type InviteDetails struct {
	InviteID         string     `json:"inviteId"`
	ExpiresAt        *time.Time `json:"expiresAt,omitempty"`
	RequiresApproval bool       `json:"requiresApproval"`
	CreatedBy        User       `json:"createdBy"`
}
