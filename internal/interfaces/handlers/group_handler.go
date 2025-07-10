package handlers

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/usecases"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GroupHandler struct {
	groupUsecase *usecases.GroupUsecase
}

func NewGroupHandler(groupUsecase *usecases.GroupUsecase) *GroupHandler {
	return &GroupHandler{
		groupUsecase: groupUsecase,
	}
}

// Group Information
func (h *GroupHandler) GetGroupInfo(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	groupInfo, err := h.groupUsecase.GetGroupInfo(c.Request.Context(), groupID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": groupInfo})
}

func (h *GroupHandler) UpdateGroupInfo(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	var req entities.UpdateGroupInfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.groupUsecase.UpdateGroupInfo(c.Request.Context(), groupID, userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group info updated successfully"})
}

func (h *GroupHandler) UpdateGroupSettings(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	var req entities.UpdateGroupSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.groupUsecase.UpdateGroupSettings(c.Request.Context(), groupID, userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group settings updated successfully"})
}

// Member Management
func (h *GroupHandler) AddMembers(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	var req entities.AddMembersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.groupUsecase.AddMembers(c.Request.Context(), groupID, userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *GroupHandler) RemoveMember(c *gin.Context) {
	groupID := c.Param("groupId")
	memberID := c.Param("userId")
	currentUserID := c.GetString("user_id")

	err := h.groupUsecase.RemoveMember(c.Request.Context(), groupID, memberID, currentUserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
}

func (h *GroupHandler) LeaveGroup(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	err := h.groupUsecase.LeaveGroup(c.Request.Context(), groupID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Left group successfully"})
}

func (h *GroupHandler) ChangeRole(c *gin.Context) {
	groupID := c.Param("groupId")
	memberID := c.Param("userId")
	currentUserID := c.GetString("user_id")

	var req entities.ChangeRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.groupUsecase.ChangeRole(c.Request.Context(), groupID, memberID, currentUserID, req.Role)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role changed successfully"})
}

// Group Invitations
func (h *GroupHandler) CreateInvite(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	var req entities.CreateInviteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	invite, err := h.groupUsecase.CreateInvite(c.Request.Context(), groupID, userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Add invite link to response
	inviteLink := c.Request.Host + "/invite/" + invite.InviteCode
	response := gin.H{
		"inviteId":         invite.ID,
		"inviteCode":       invite.InviteCode,
		"inviteLink":       inviteLink,
		"expiresAt":        invite.ExpiresAt,
		"maxUses":          invite.MaxUses,
		"currentUses":      invite.CurrentUses,
		"requiresApproval": invite.RequiresApproval,
		"createdBy":        invite.CreatedBy,
		"createdAt":        invite.CreatedAt,
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

func (h *GroupHandler) GetGroupInvites(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	// First check if user can manage invites
	groupIDObj, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	userIDObj, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Get invites (this should be implemented in the usecase)
	invites, err := h.groupUsecase.GetGroupInvites(c.Request.Context(), groupID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": invites})
}

func (h *GroupHandler) RevokeInvite(c *gin.Context) {
	groupID := c.Param("groupId")
	inviteID := c.Param("inviteId")
	userID := c.GetString("user_id")

	err := h.groupUsecase.RevokeInvite(c.Request.Context(), groupID, inviteID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invite revoked successfully"})
}

func (h *GroupHandler) JoinViaInvite(c *gin.Context) {
	userID := c.GetString("user_id")

	var req entities.JoinViaInviteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.groupUsecase.JoinViaInvite(c.Request.Context(), userID, req.InviteCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Joined group successfully"})
}

func (h *GroupHandler) GetInviteInfo(c *gin.Context) {
	inviteCode := c.Param("inviteCode")

	inviteInfo, err := h.groupUsecase.GetInviteInfo(c.Request.Context(), inviteCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": inviteInfo})
}

// Group Actions
func (h *GroupHandler) PinGroup(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	err := h.groupUsecase.PinGroup(c.Request.Context(), groupID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group pinned successfully"})
}

func (h *GroupHandler) UnpinGroup(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	err := h.groupUsecase.UnpinGroup(c.Request.Context(), groupID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group unpinned successfully"})
}

func (h *GroupHandler) MuteGroup(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	var req entities.MuteGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.groupUsecase.MuteGroup(c.Request.Context(), groupID, userID, req.Duration)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group muted successfully"})
}

func (h *GroupHandler) UnmuteGroup(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	err := h.groupUsecase.UnmuteGroup(c.Request.Context(), groupID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group unmuted successfully"})
}

func (h *GroupHandler) ArchiveGroup(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	err := h.groupUsecase.ArchiveGroup(c.Request.Context(), groupID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group archived successfully"})
}

func (h *GroupHandler) UnarchiveGroup(c *gin.Context) {
	groupID := c.Param("groupId")
	userID := c.GetString("user_id")

	err := h.groupUsecase.UnarchiveGroup(c.Request.Context(), groupID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group unarchived successfully"})
}
