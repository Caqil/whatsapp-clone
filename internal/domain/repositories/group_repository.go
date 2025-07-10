// internal/domain/repositories/group_repository.go
package repositories

import (
	"bro-chat/internal/domain/entities"
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GroupRepository interface {
	// ========== Group Information ==========
	GetGroupInfo(ctx context.Context, groupID primitive.ObjectID) (*entities.GroupInfo, error)
	UpdateGroupInfo(ctx context.Context, groupID primitive.ObjectID, req *entities.UpdateGroupInfoRequest) error
	UpdateGroupSettings(ctx context.Context, groupID primitive.ObjectID, req *entities.UpdateGroupSettingsRequest) error

	// ========== Member Management ==========
	AddMember(ctx context.Context, groupID, userID, addedBy primitive.ObjectID, role entities.GroupRole) error
	RemoveMember(ctx context.Context, groupID, userID primitive.ObjectID) error
	ChangeRole(ctx context.Context, groupID, userID primitive.ObjectID, role entities.GroupRole) error
	GetGroupMembers(ctx context.Context, groupID primitive.ObjectID) ([]entities.GroupMemberWithUser, error)
	GetMemberRole(ctx context.Context, groupID, userID primitive.ObjectID) (entities.GroupRole, error)

	// ========== Permission Checks ==========
	IsGroupMember(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error)
	IsGroupAdmin(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error)
	IsGroupOwner(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error)

	// ========== Invitation Management ==========
	CreateInvite(ctx context.Context, invite *entities.GroupInvite) error
	GetGroupInvites(ctx context.Context, groupID primitive.ObjectID) ([]*entities.GroupInvite, error)
	GetInviteByID(ctx context.Context, inviteID primitive.ObjectID) (*entities.GroupInvite, error)
	GetInviteByCode(ctx context.Context, inviteCode string) (*entities.GroupInvite, error)
	RevokeInvite(ctx context.Context, inviteID primitive.ObjectID) error
	UpdateInviteUsage(ctx context.Context, inviteID primitive.ObjectID) error

	// ========== Group Actions ==========
	PinGroup(ctx context.Context, groupID, userID primitive.ObjectID) error
	UnpinGroup(ctx context.Context, groupID, userID primitive.ObjectID) error
	MuteGroup(ctx context.Context, groupID, userID primitive.ObjectID, duration int) error
	UnmuteGroup(ctx context.Context, groupID, userID primitive.ObjectID) error
	ArchiveGroup(ctx context.Context, groupID, userID primitive.ObjectID) error
	UnarchiveGroup(ctx context.Context, groupID, userID primitive.ObjectID) error

	// ========== Activity Logging ==========
	LogActivity(ctx context.Context, activity *entities.GroupActivity) error
	GetGroupActivities(ctx context.Context, groupID primitive.ObjectID, limit int) ([]entities.GroupActivity, error)

	// ========== Group Creation ==========
	CreateGroup(ctx context.Context, group *entities.GroupInfo) error
	DeleteGroup(ctx context.Context, groupID primitive.ObjectID) error
	GetUserGroups(ctx context.Context, userID primitive.ObjectID) ([]entities.GroupInfo, error)
}
