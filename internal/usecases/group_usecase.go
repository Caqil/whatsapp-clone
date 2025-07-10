// internal/usecases/group_usecase.go
package usecases

import (
	"context"
	"errors"
	"time"
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/domain/repositories"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GroupUsecase struct {
	groupRepo repositories.GroupRepository
	userRepo  repositories.UserRepository
}

func NewGroupUsecase(groupRepo repositories.GroupRepository, userRepo repositories.UserRepository) *GroupUsecase {
	return &GroupUsecase{
		groupRepo: groupRepo,
		userRepo:  userRepo,
	}
}

// ========== Group Information ==========

func (u *GroupUsecase) GetGroupInfo(ctx context.Context, groupIDStr, userIDStr string) (*entities.GroupInfo, error) {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return nil, errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	// Check if user is a member
	isMember, err := u.groupRepo.IsGroupMember(ctx, groupID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("you are not a member of this group")
	}

	// Get group info
	return u.groupRepo.GetGroupInfo(ctx, groupID)
}

func (u *GroupUsecase) UpdateGroupInfo(ctx context.Context, groupIDStr, userIDStr string, req *entities.UpdateGroupInfoRequest) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check permissions
	canEdit, err := u.canEditGroupInfo(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !canEdit {
		return errors.New("you don't have permission to edit group info")
	}

	// Update group info
	err = u.groupRepo.UpdateGroupInfo(ctx, groupID, req)
	if err != nil {
		return err
	}

	// Log activity
	u.logActivity(ctx, groupID, userID, "group_info_updated", nil, map[string]interface{}{
		"name":        req.Name,
		"description": req.Description,
	})

	// Broadcast group update
	u.broadcastGroupUpdate(groupID, "group_info_updated", req)

	return nil
}

func (u *GroupUsecase) UpdateGroupSettings(ctx context.Context, groupIDStr, userIDStr string, req *entities.UpdateGroupSettingsRequest) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check if user is admin or owner
	isAdmin, err := u.groupRepo.IsGroupAdmin(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("you don't have permission to update group settings")
	}

	// Update group settings
	err = u.groupRepo.UpdateGroupSettings(ctx, groupID, req)
	if err != nil {
		return err
	}

	// Log activity
	u.logActivity(ctx, groupID, userID, "group_settings_updated", nil, map[string]interface{}{
		"settings": req,
	})

	// Broadcast settings update
	u.broadcastGroupUpdate(groupID, "group_settings_updated", req)

	return nil
}

// ========== Member Management ==========

func (u *GroupUsecase) AddMembers(ctx context.Context, groupIDStr, userIDStr string, req *entities.AddMembersRequest) (*entities.AddMembersResult, error) {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return nil, errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	// Check permissions
	canAdd, err := u.canAddMembers(ctx, groupID, userID)
	if err != nil {
		return nil, err
	}
	if !canAdd {
		return nil, errors.New("you don't have permission to add members")
	}

	result := &entities.AddMembersResult{
		AddedMembers: []entities.GroupMemberWithUser{},
		FailedToAdd:  []entities.FailedMember{},
	}

	for _, newUserID := range req.UserIDs {
		// Get user info
		user, err := u.userRepo.GetByID(ctx, newUserID)
		if err != nil {
			result.FailedToAdd = append(result.FailedToAdd, entities.FailedMember{
				UserID: newUserID.Hex(),
				Reason: "user not found",
			})
			continue
		}

		// Check if already a member
		isMember, err := u.groupRepo.IsGroupMember(ctx, groupID, newUserID)
		if err != nil {
			result.FailedToAdd = append(result.FailedToAdd, entities.FailedMember{
				UserID: newUserID.Hex(),
				Reason: "error checking membership",
			})
			continue
		}
		if isMember {
			result.FailedToAdd = append(result.FailedToAdd, entities.FailedMember{
				UserID: newUserID.Hex(),
				Reason: "already a member",
			})
			continue
		}

		// Add member
		err = u.groupRepo.AddMember(ctx, groupID, newUserID, userID, entities.RoleMember)
		if err != nil {
			result.FailedToAdd = append(result.FailedToAdd, entities.FailedMember{
				UserID: newUserID.Hex(),
				Reason: "failed to add member",
			})
			continue
		}

		// Add to result
		result.AddedMembers = append(result.AddedMembers, entities.GroupMemberWithUser{
			GroupMember: &entities.GroupMember{
				GroupID:  groupID,
				UserID:   newUserID,
				Role:     entities.RoleMember,
				JoinedAt: time.Now(),
				AddedBy:  &userID,
				IsActive: true,
			},
			User: *user,
		})

		// Log activity
		u.logActivity(ctx, groupID, userID, "member_added", &newUserID, nil)

		// Broadcast member added
		u.broadcastMemberUpdate(groupID, "member_added", *user)
	}

	return result, nil
}

func (u *GroupUsecase) RemoveMember(ctx context.Context, groupIDStr, memberIDStr, currentUserIDStr string) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	memberID, err := primitive.ObjectIDFromHex(memberIDStr)
	if err != nil {
		return errors.New("invalid member ID")
	}

	currentUserID, err := primitive.ObjectIDFromHex(currentUserIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check permissions
	canRemove, err := u.canRemoveMember(ctx, groupID, currentUserID, memberID)
	if err != nil {
		return err
	}
	if !canRemove {
		return errors.New("you don't have permission to remove this member")
	}

	// Remove member
	err = u.groupRepo.RemoveMember(ctx, groupID, memberID)
	if err != nil {
		return err
	}

	// Log activity
	u.logActivity(ctx, groupID, currentUserID, "member_removed", &memberID, nil)

	// Broadcast member removed
	member, _ := u.userRepo.GetByID(ctx, memberID)
	if member != nil {
		u.broadcastMemberUpdate(groupID, "member_removed", *member)
	}

	return nil
}

func (u *GroupUsecase) LeaveGroup(ctx context.Context, groupIDStr, userIDStr string) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check if user is owner
	isOwner, err := u.groupRepo.IsGroupOwner(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if isOwner {
		return errors.New("group owner cannot leave the group")
	}

	// Remove member
	err = u.groupRepo.RemoveMember(ctx, groupID, userID)
	if err != nil {
		return err
	}

	// Log activity
	u.logActivity(ctx, groupID, userID, "member_left", &userID, nil)

	// Broadcast member left
	user, _ := u.userRepo.GetByID(ctx, userID)
	if user != nil {
		u.broadcastMemberUpdate(groupID, "member_left", *user)
	}

	return nil
}

func (u *GroupUsecase) ChangeRole(ctx context.Context, groupIDStr, memberIDStr, currentUserIDStr string, newRole entities.GroupRole) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	memberID, err := primitive.ObjectIDFromHex(memberIDStr)
	if err != nil {
		return errors.New("invalid member ID")
	}

	currentUserID, err := primitive.ObjectIDFromHex(currentUserIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check permissions
	canChangeRole, err := u.canChangeRole(ctx, groupID, currentUserID, memberID, newRole)
	if err != nil {
		return err
	}
	if !canChangeRole {
		return errors.New("you don't have permission to change this member's role")
	}

	// Get current role
	currentRole, err := u.groupRepo.GetMemberRole(ctx, groupID, memberID)
	if err != nil {
		return err
	}

	// Change role
	err = u.groupRepo.ChangeRole(ctx, groupID, memberID, newRole)
	if err != nil {
		return err
	}

	// Log activity
	u.logActivity(ctx, groupID, currentUserID, "member_role_changed", &memberID, map[string]interface{}{
		"previous_role": currentRole,
		"new_role":      newRole,
	})

	// Broadcast role change
	member, _ := u.userRepo.GetByID(ctx, memberID)
	if member != nil {
		u.broadcastMemberUpdate(groupID, "member_role_changed", *member)
	}

	return nil
}

// ========== Invitation Management ==========

func (u *GroupUsecase) CreateInvite(ctx context.Context, groupIDStr, userIDStr string, req *entities.CreateInviteRequest) (*entities.GroupInvite, error) {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return nil, errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	// Check permissions
	canAdd, err := u.canAddMembers(ctx, groupID, userID)
	if err != nil {
		return nil, err
	}
	if !canAdd {
		return nil, errors.New("you don't have permission to create invites")
	}

	invite := &entities.GroupInvite{
		GroupID:          groupID,
		CreatedBy:        userID,
		ExpiresAt:        req.ExpiresAt,
		MaxUses:          req.MaxUses,
		RequiresApproval: req.RequiresApproval,
		CurrentUses:      0,
	}

	err = u.groupRepo.CreateInvite(ctx, invite)
	if err != nil {
		return nil, err
	}

	// Log activity
	u.logActivity(ctx, groupID, userID, "invite_created", nil, map[string]interface{}{
		"invite_id": invite.ID,
	})

	return invite, nil
}

func (u *GroupUsecase) GetGroupInvites(ctx context.Context, groupIDStr, userIDStr string) ([]*entities.GroupInvite, error) {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return nil, errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	// Check if user can manage invites (admin or owner)
	isAdmin, err := u.groupRepo.IsGroupAdmin(ctx, groupID, userID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("you don't have permission to view group invites")
	}

	return u.groupRepo.GetGroupInvites(ctx, groupID)
}

func (u *GroupUsecase) RevokeInvite(ctx context.Context, groupIDStr, inviteIDStr, userIDStr string) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	inviteID, err := primitive.ObjectIDFromHex(inviteIDStr)
	if err != nil {
		return errors.New("invalid invite ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check if user can manage invites (admin or owner)
	isAdmin, err := u.groupRepo.IsGroupAdmin(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("you don't have permission to revoke invites")
	}

	// Get invite to verify it belongs to this group
	invite, err := u.groupRepo.GetInviteByID(ctx, inviteID)
	if err != nil {
		return errors.New("invite not found")
	}
	if invite.GroupID != groupID {
		return errors.New("invite does not belong to this group")
	}

	// Revoke invite
	err = u.groupRepo.RevokeInvite(ctx, inviteID)
	if err != nil {
		return err
	}

	// Log activity
	u.logActivity(ctx, groupID, userID, "invite_revoked", nil, map[string]interface{}{
		"invite_id": inviteID,
	})

	return nil
}

func (u *GroupUsecase) JoinViaInvite(ctx context.Context, userIDStr, inviteCode string) error {
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Get invite
	invite, err := u.groupRepo.GetInviteByCode(ctx, inviteCode)
	if err != nil {
		return errors.New("invalid invite code")
	}

	// Check if invite is valid
	if invite.ExpiresAt != nil && time.Now().After(*invite.ExpiresAt) {
		return errors.New("invite has expired")
	}

	if invite.MaxUses > 0 && invite.CurrentUses >= invite.MaxUses {
		return errors.New("invite has reached maximum uses")
	}

	// Check if already a member
	isMember, err := u.groupRepo.IsGroupMember(ctx, invite.GroupID, userID)
	if err != nil {
		return err
	}
	if isMember {
		return errors.New("already a member of this group")
	}

	// Add member
	err = u.groupRepo.AddMember(ctx, invite.GroupID, userID, invite.CreatedBy, entities.RoleMember)
	if err != nil {
		return err
	}

	// Update invite usage
	err = u.groupRepo.UpdateInviteUsage(ctx, invite.ID)
	if err != nil {
		return err
	}

	// Log activity
	u.logActivity(ctx, invite.GroupID, userID, "member_joined", &userID, map[string]interface{}{
		"invite_id": invite.ID,
	})

	// Broadcast member joined
	user, _ := u.userRepo.GetByID(ctx, userID)
	if user != nil {
		u.broadcastMemberUpdate(invite.GroupID, "member_joined", *user)
	}

	return nil
}

func (u *GroupUsecase) GetInviteInfo(ctx context.Context, inviteCode string) (*entities.GroupInviteInfo, error) {
	// Get invite by code
	invite, err := u.groupRepo.GetInviteByCode(ctx, inviteCode)
	if err != nil {
		return nil, errors.New("invalid invite code")
	}

	// Check if invite is still valid
	if invite.ExpiresAt != nil && time.Now().After(*invite.ExpiresAt) {
		return nil, errors.New("invite has expired")
	}

	if !invite.IsActive {
		return nil, errors.New("invite is no longer active")
	}

	if invite.MaxUses > 0 && invite.CurrentUses >= invite.MaxUses {
		return nil, errors.New("invite has reached maximum uses")
	}

	// Get group info
	groupInfo, err := u.groupRepo.GetGroupInfo(ctx, invite.GroupID)
	if err != nil {
		return nil, err
	}

	// Get invite creator info
	creator, err := u.userRepo.GetByID(ctx, invite.CreatedBy)
	if err != nil {
		return nil, err
	}

	return &entities.GroupInviteInfo{
		GroupID:     groupInfo.ID.Hex(),
		Name:        groupInfo.Name,
		Description: groupInfo.Description,
		Avatar:      groupInfo.Avatar,
		MemberCount: len(groupInfo.Participants),
		InviteInfo: entities.InviteDetails{
			InviteID:         invite.ID.Hex(),
			ExpiresAt:        invite.ExpiresAt,
			RequiresApproval: invite.RequiresApproval,
			CreatedBy:        *creator,
		},
	}, nil
}

// ========== Group Actions ==========

func (u *GroupUsecase) PinGroup(ctx context.Context, groupIDStr, userIDStr string) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check if user is a member
	isMember, err := u.groupRepo.IsGroupMember(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this group")
	}

	return u.groupRepo.PinGroup(ctx, groupID, userID)
}

func (u *GroupUsecase) UnpinGroup(ctx context.Context, groupIDStr, userIDStr string) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check if user is a member
	isMember, err := u.groupRepo.IsGroupMember(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this group")
	}

	return u.groupRepo.UnpinGroup(ctx, groupID, userID)
}

func (u *GroupUsecase) MuteGroup(ctx context.Context, groupIDStr, userIDStr string, duration int) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check if user is a member
	isMember, err := u.groupRepo.IsGroupMember(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this group")
	}

	return u.groupRepo.MuteGroup(ctx, groupID, userID, duration)
}

func (u *GroupUsecase) UnmuteGroup(ctx context.Context, groupIDStr, userIDStr string) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check if user is a member
	isMember, err := u.groupRepo.IsGroupMember(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this group")
	}

	return u.groupRepo.UnmuteGroup(ctx, groupID, userID)
}

func (u *GroupUsecase) ArchiveGroup(ctx context.Context, groupIDStr, userIDStr string) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check if user is a member
	isMember, err := u.groupRepo.IsGroupMember(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this group")
	}

	return u.groupRepo.ArchiveGroup(ctx, groupID, userID)
}

func (u *GroupUsecase) UnarchiveGroup(ctx context.Context, groupIDStr, userIDStr string) error {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return errors.New("invalid group ID")
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	// Check if user is a member
	isMember, err := u.groupRepo.IsGroupMember(ctx, groupID, userID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("user is not a member of this group")
	}

	return u.groupRepo.UnarchiveGroup(ctx, groupID, userID)
}

// ========== Helper Methods for Permission Checks ==========

func (u *GroupUsecase) canEditGroupInfo(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error) {
	// Get group settings
	groupInfo, err := u.groupRepo.GetGroupInfo(ctx, groupID)
	if err != nil {
		return false, err
	}

	if groupInfo.Settings != nil && groupInfo.Settings.WhoCanEditInfo == "admins" {
		return u.groupRepo.IsGroupAdmin(ctx, groupID, userID)
	}

	// Default: everyone can edit
	return u.groupRepo.IsGroupMember(ctx, groupID, userID)
}

func (u *GroupUsecase) canAddMembers(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error) {
	// Get group settings
	groupInfo, err := u.groupRepo.GetGroupInfo(ctx, groupID)
	if err != nil {
		return false, err
	}

	if groupInfo.Settings != nil && groupInfo.Settings.WhoCanAddMembers == "admins" {
		return u.groupRepo.IsGroupAdmin(ctx, groupID, userID)
	}

	// Default: everyone can add
	return u.groupRepo.IsGroupMember(ctx, groupID, userID)
}

func (u *GroupUsecase) canRemoveMember(ctx context.Context, groupID, currentUserID, memberID primitive.ObjectID) (bool, error) {
	// Owners can remove anyone
	isOwner, err := u.groupRepo.IsGroupOwner(ctx, groupID, currentUserID)
	if err != nil {
		return false, err
	}
	if isOwner {
		return true, nil
	}

	// Admins can remove members but not other admins
	isAdmin, err := u.groupRepo.IsGroupAdmin(ctx, groupID, currentUserID)
	if err != nil {
		return false, err
	}
	if isAdmin {
		memberIsAdmin, err := u.groupRepo.IsGroupAdmin(ctx, groupID, memberID)
		if err != nil {
			return false, err
		}
		return !memberIsAdmin, nil
	}

	// Members can only remove themselves
	return currentUserID == memberID, nil
}

func (u *GroupUsecase) canChangeRole(ctx context.Context, groupID, currentUserID, memberID primitive.ObjectID, newRole entities.GroupRole) (bool, error) {
	// Only owners can change roles
	isOwner, err := u.groupRepo.IsGroupOwner(ctx, groupID, currentUserID)
	if err != nil {
		return false, err
	}
	if !isOwner {
		return false, nil
	}

	// Owners cannot change their own role
	if currentUserID == memberID {
		return false, nil
	}

	// Cannot promote to owner
	if newRole == entities.RoleOwner {
		return false, nil
	}

	return true, nil
}

func (u *GroupUsecase) logActivity(ctx context.Context, groupID, actorID primitive.ObjectID, activityType string, targetUserID *primitive.ObjectID, details map[string]interface{}) {
	activity := &entities.GroupActivity{
		GroupID:      groupID,
		Type:         activityType,
		ActorID:      actorID,
		TargetUserID: targetUserID,
		Details:      details,
	}

	u.groupRepo.LogActivity(ctx, activity)
}

func (u *GroupUsecase) broadcastGroupUpdate(groupID primitive.ObjectID, eventType string, data interface{}) {
	// Implement WebSocket broadcast to group members
	// This would use your existing WebSocket hub
}

func (u *GroupUsecase) broadcastMemberUpdate(groupID primitive.ObjectID, eventType string, user entities.User) {
	// Implement WebSocket broadcast to group members
	// This would use your existing WebSocket hub
}