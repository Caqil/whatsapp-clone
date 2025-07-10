package repositories

import (
	"bro-chat/internal/domain/entities"
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GroupRepository interface {
	// Group management
	GetGroupInfo(ctx context.Context, groupID primitive.ObjectID) (*entities.GroupInfo, error)
	UpdateGroupInfo(ctx context.Context, groupID primitive.ObjectID, updates *entities.UpdateGroupInfoRequest) error
	UpdateGroupSettings(ctx context.Context, groupID primitive.ObjectID, settings *entities.UpdateGroupSettingsRequest) error

	// Member management
	AddMember(ctx context.Context, groupID, userID, addedBy primitive.ObjectID, role entities.GroupRole) error
	RemoveMember(ctx context.Context, groupID, userID primitive.ObjectID) error
	GetGroupMembers(ctx context.Context, groupID primitive.ObjectID) ([]entities.GroupMemberWithUser, error)
	GetMemberRole(ctx context.Context, groupID, userID primitive.ObjectID) (entities.GroupRole, error)
	ChangeRole(ctx context.Context, groupID, userID primitive.ObjectID, role entities.GroupRole) error
	IsGroupMember(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error)
	IsGroupAdmin(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error)
	IsGroupOwner(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error)

	// Group invitations
	CreateInvite(ctx context.Context, invite *entities.GroupInvite) error
	GetInviteByCode(ctx context.Context, inviteCode string) (*entities.GroupInvite, error)
	GetGroupInvites(ctx context.Context, groupID primitive.ObjectID) ([]entities.GroupInvite, error)
	UpdateInviteUsage(ctx context.Context, inviteID primitive.ObjectID) error
	RevokeInvite(ctx context.Context, inviteID primitive.ObjectID) error

	// Group actions
	PinGroup(ctx context.Context, groupID, userID primitive.ObjectID) error
	UnpinGroup(ctx context.Context, groupID, userID primitive.ObjectID) error
	MuteGroup(ctx context.Context, groupID, userID primitive.ObjectID, duration int) error
	UnmuteGroup(ctx context.Context, groupID, userID primitive.ObjectID) error
	ArchiveGroup(ctx context.Context, groupID, userID primitive.ObjectID) error
	UnarchiveGroup(ctx context.Context, groupID, userID primitive.ObjectID) error

	// Group activities
	LogActivity(ctx context.Context, activity *entities.GroupActivity) error
	GetGroupActivities(ctx context.Context, groupID primitive.ObjectID, limit int) ([]entities.GroupActivity, error)
}
