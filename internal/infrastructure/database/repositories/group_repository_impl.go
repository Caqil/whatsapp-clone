// internal/infrastructure/database/repositories/group_repository_impl.go
package repositories

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/domain/repositories"
	"context"
	"crypto/rand"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type groupRepository struct {
	database              *mongo.Database
	collection            *mongo.Collection
	memberCollection      *mongo.Collection
	inviteCollection      *mongo.Collection
	preferencesCollection *mongo.Collection
	activityCollection    *mongo.Collection
	userCollection        *mongo.Collection
}

func NewGroupRepository(db *mongo.Database) repositories.GroupRepository {
	return &groupRepository{
		database:              db,
		collection:            db.Collection("groups"),
		memberCollection:      db.Collection("group_members"),
		inviteCollection:      db.Collection("group_invites"),
		preferencesCollection: db.Collection("user_group_preferences"),
		activityCollection:    db.Collection("group_activities"),
		userCollection:        db.Collection("users"),
	}
}

// ========== Group Information ==========

func (r *groupRepository) GetGroupInfo(ctx context.Context, groupID primitive.ObjectID) (*entities.GroupInfo, error) {
	var group entities.GroupInfo
	err := r.collection.FindOne(ctx, bson.M{"_id": groupID}).Decode(&group)
	if err != nil {
		return nil, err
	}

	// Get member count
	memberCount, err := r.memberCollection.CountDocuments(ctx, bson.M{
		"group_id":  groupID,
		"is_active": true,
	})
	if err == nil {
		group.MemberCount = int(memberCount)
	}

	// Get members with user data
	members, err := r.GetGroupMembers(ctx, groupID)
	if err == nil {
		group.Members = members
	}

	// Get pending invites
	invites, err := r.GetGroupInvites(ctx, groupID)
	if err == nil {
		group.PendingInvites = make([]entities.GroupInvite, len(invites))
		for i, invite := range invites {
			group.PendingInvites[i] = *invite
		}
	}

	return &group, nil
}

func (r *groupRepository) UpdateGroupInfo(ctx context.Context, groupID primitive.ObjectID, req *entities.UpdateGroupInfoRequest) error {
	update := bson.M{}
	if req.Name != "" {
		update["name"] = req.Name
	}
	if req.Description != "" {
		update["description"] = req.Description
	}
	if req.Avatar != "" {
		update["avatar"] = req.Avatar
	}
	update["updated_at"] = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$set": update},
	)
	return err
}

func (r *groupRepository) UpdateGroupSettings(ctx context.Context, groupID primitive.ObjectID, req *entities.UpdateGroupSettingsRequest) error {
	update := bson.M{}
	if req.WhoCanSendMessages != "" {
		update["settings.who_can_send_messages"] = req.WhoCanSendMessages
	}
	if req.WhoCanEditInfo != "" {
		update["settings.who_can_edit_info"] = req.WhoCanEditInfo
	}
	if req.WhoCanAddMembers != "" {
		update["settings.who_can_add_members"] = req.WhoCanAddMembers
	}
	update["settings.disappearing_messages"] = req.DisappearingMessages
	if req.DisappearingTime != nil {
		update["settings.disappearing_time"] = *req.DisappearingTime
	}
	update["updated_at"] = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$set": update},
	)
	return err
}

// ========== Member Management ==========

func (r *groupRepository) AddMember(ctx context.Context, groupID, userID, addedBy primitive.ObjectID, role entities.GroupRole) error {
	member := entities.GroupMember{
		ID:       primitive.NewObjectID(),
		GroupID:  groupID,
		UserID:   userID,
		Role:     role,
		JoinedAt: time.Now(),
		AddedBy:  &addedBy,
		IsActive: true,
	}

	// Add to members collection
	_, err := r.memberCollection.InsertOne(ctx, member)
	if err != nil {
		return err
	}

	// Add to group's participants array
	_, err = r.collection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{
			"$addToSet": bson.M{"participants": userID},
			"$set":      bson.M{"updated_at": time.Now()},
		},
	)
	if err != nil {
		return err
	}

	// If admin role, add to admins array
	if role == entities.RoleAdmin {
		_, err = r.collection.UpdateOne(
			ctx,
			bson.M{"_id": groupID},
			bson.M{"$addToSet": bson.M{"admins": userID}},
		)
	}

	return err
}

func (r *groupRepository) RemoveMember(ctx context.Context, groupID, userID primitive.ObjectID) error {
	// Deactivate member
	_, err := r.memberCollection.UpdateOne(
		ctx,
		bson.M{
			"group_id":  groupID,
			"user_id":   userID,
			"is_active": true,
		},
		bson.M{"$set": bson.M{"is_active": false}},
	)
	if err != nil {
		return err
	}

	// Remove from group's participants and admins arrays
	_, err = r.collection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{
			"$pull": bson.M{
				"participants": userID,
				"admins":       userID,
			},
			"$set": bson.M{"updated_at": time.Now()},
		},
	)
	return err
}

func (r *groupRepository) ChangeRole(ctx context.Context, groupID, userID primitive.ObjectID, role entities.GroupRole) error {
	_, err := r.memberCollection.UpdateOne(
		ctx,
		bson.M{
			"group_id":  groupID,
			"user_id":   userID,
			"is_active": true,
		},
		bson.M{"$set": bson.M{"role": role}},
	)
	if err != nil {
		return err
	}

	// Update admins array based on new role
	if role == entities.RoleAdmin {
		_, err = r.collection.UpdateOne(
			ctx,
			bson.M{"_id": groupID},
			bson.M{"$addToSet": bson.M{"admins": userID}},
		)
	} else {
		_, err = r.collection.UpdateOne(
			ctx,
			bson.M{"_id": groupID},
			bson.M{"$pull": bson.M{"admins": userID}},
		)
	}
	return err
}

func (r *groupRepository) GetGroupMembers(ctx context.Context, groupID primitive.ObjectID) ([]entities.GroupMemberWithUser, error) {
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"group_id":  groupID,
				"is_active": true,
			},
		},
		{
			"$lookup": bson.M{
				"from":         "users",
				"localField":   "user_id",
				"foreignField": "_id",
				"as":           "user",
			},
		},
		{
			"$unwind": "$user",
		},
	}

	cursor, err := r.memberCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var members []entities.GroupMemberWithUser
	err = cursor.All(ctx, &members)
	return members, err
}

func (r *groupRepository) GetMemberRole(ctx context.Context, groupID, userID primitive.ObjectID) (entities.GroupRole, error) {
	var member entities.GroupMember
	err := r.memberCollection.FindOne(ctx, bson.M{
		"group_id":  groupID,
		"user_id":   userID,
		"is_active": true,
	}).Decode(&member)
	if err != nil {
		return "", err
	}
	return member.Role, nil
}

// ========== Permission Checks ==========

func (r *groupRepository) IsGroupMember(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error) {
	count, err := r.memberCollection.CountDocuments(ctx, bson.M{
		"group_id":  groupID,
		"user_id":   userID,
		"is_active": true,
	})
	return count > 0, err
}

func (r *groupRepository) IsGroupAdmin(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error) {
	// Check if user is owner first
	isOwner, err := r.IsGroupOwner(ctx, groupID, userID)
	if err != nil {
		return false, err
	}
	if isOwner {
		return true, nil
	}

	// Check if user is in admins array
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"_id":    groupID,
		"admins": userID,
	})
	return count > 0, err
}

func (r *groupRepository) IsGroupOwner(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"_id":   groupID,
		"owner": userID,
	})
	return count > 0, err
}

// ========== Invitation Management ==========

func (r *groupRepository) CreateInvite(ctx context.Context, invite *entities.GroupInvite) error {
	invite.ID = primitive.NewObjectID()
	invite.InviteCode = generateInviteCode()
	invite.InviteLink = fmt.Sprintf("/invite/%s", invite.InviteCode)
	invite.IsActive = true
	invite.CreatedAt = time.Now()

	_, err := r.inviteCollection.InsertOne(ctx, invite)
	return err
}

func (r *groupRepository) GetGroupInvites(ctx context.Context, groupID primitive.ObjectID) ([]*entities.GroupInvite, error) {
	cursor, err := r.inviteCollection.Find(ctx, bson.M{
		"group_id":  groupID,
		"is_active": true,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var invites []*entities.GroupInvite
	err = cursor.All(ctx, &invites)
	return invites, err
}

func (r *groupRepository) GetInviteByID(ctx context.Context, inviteID primitive.ObjectID) (*entities.GroupInvite, error) {
	var invite entities.GroupInvite
	err := r.inviteCollection.FindOne(ctx, bson.M{"_id": inviteID}).Decode(&invite)
	if err != nil {
		return nil, err
	}
	return &invite, nil
}

func (r *groupRepository) GetInviteByCode(ctx context.Context, inviteCode string) (*entities.GroupInvite, error) {
	var invite entities.GroupInvite
	err := r.inviteCollection.FindOne(ctx, bson.M{
		"invite_code": inviteCode,
		"is_active":   true,
	}).Decode(&invite)
	if err != nil {
		return nil, err
	}
	return &invite, nil
}

func (r *groupRepository) RevokeInvite(ctx context.Context, inviteID primitive.ObjectID) error {
	_, err := r.inviteCollection.UpdateOne(
		ctx,
		bson.M{"_id": inviteID},
		bson.M{"$set": bson.M{"is_active": false}},
	)
	return err
}

func (r *groupRepository) UpdateInviteUsage(ctx context.Context, inviteID primitive.ObjectID) error {
	_, err := r.inviteCollection.UpdateOne(
		ctx,
		bson.M{"_id": inviteID},
		bson.M{"$inc": bson.M{"current_uses": 1}},
	)
	return err
}

// ========== Group Actions ==========

func (r *groupRepository) PinGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	return r.updateUserGroupPreference(ctx, userID, groupID, "is_pinned", true)
}

func (r *groupRepository) UnpinGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	return r.updateUserGroupPreference(ctx, userID, groupID, "is_pinned", false)
}

func (r *groupRepository) MuteGroup(ctx context.Context, groupID, userID primitive.ObjectID, duration int) error {
	var muteUntil *time.Time
	if duration == -1 {
		// Forever
		foreverTime := time.Date(2099, 12, 31, 23, 59, 59, 0, time.UTC)
		muteUntil = &foreverTime
	} else {
		untilTime := time.Now().Add(time.Duration(duration) * time.Second)
		muteUntil = &untilTime
	}

	err := r.updateUserGroupPreference(ctx, userID, groupID, "is_muted", true)
	if err != nil {
		return err
	}
	return r.updateUserGroupPreference(ctx, userID, groupID, "muted_until", muteUntil)
}

func (r *groupRepository) UnmuteGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	err := r.updateUserGroupPreference(ctx, userID, groupID, "is_muted", false)
	if err != nil {
		return err
	}
	return r.updateUserGroupPreference(ctx, userID, groupID, "muted_until", nil)
}

func (r *groupRepository) ArchiveGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	return r.updateUserGroupPreference(ctx, userID, groupID, "is_archived", true)
}

func (r *groupRepository) UnarchiveGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	return r.updateUserGroupPreference(ctx, userID, groupID, "is_archived", false)
}

// Helper method for user-group preferences
func (r *groupRepository) updateUserGroupPreference(ctx context.Context, userID, groupID primitive.ObjectID, field string, value interface{}) error {
	filter := bson.M{
		"user_id":  userID,
		"group_id": groupID,
	}
	update := bson.M{
		"$set": bson.M{
			field:        value,
			"updated_at": time.Now(),
		},
		"$setOnInsert": bson.M{
			"user_id":    userID,
			"group_id":   groupID,
			"created_at": time.Now(),
		},
	}
	opts := options.Update().SetUpsert(true)

	_, err := r.preferencesCollection.UpdateOne(ctx, filter, update, opts)
	return err
}

// ========== Activity Logging ==========

func (r *groupRepository) LogActivity(ctx context.Context, activity *entities.GroupActivity) error {
	activity.ID = primitive.NewObjectID()
	activity.CreatedAt = time.Now()
	_, err := r.activityCollection.InsertOne(ctx, activity)
	return err
}

func (r *groupRepository) GetGroupActivities(ctx context.Context, groupID primitive.ObjectID, limit int) ([]entities.GroupActivity, error) {
	opts := options.Find().SetSort(bson.D{{"created_at", -1}}).SetLimit(int64(limit))
	cursor, err := r.activityCollection.Find(ctx, bson.M{"group_id": groupID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []entities.GroupActivity
	err = cursor.All(ctx, &activities)
	return activities, err
}

// ========== Group Creation ==========

func (r *groupRepository) CreateGroup(ctx context.Context, group *entities.GroupInfo) error {
	group.ID = primitive.NewObjectID()
	group.CreatedAt = time.Now()
	group.UpdatedAt = time.Now()
	group.Type = "group"

	_, err := r.collection.InsertOne(ctx, group)
	return err
}

func (r *groupRepository) DeleteGroup(ctx context.Context, groupID primitive.ObjectID) error {
	// Soft delete - mark as inactive
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$set": bson.M{
			"is_active":  false,
			"deleted_at": time.Now(),
		}},
	)
	return err
}

func (r *groupRepository) GetUserGroups(ctx context.Context, userID primitive.ObjectID) ([]entities.GroupInfo, error) {
	// Get groups where user is a member
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"user_id":   userID,
				"is_active": true,
			},
		},
		{
			"$lookup": bson.M{
				"from":         "groups",
				"localField":   "group_id",
				"foreignField": "_id",
				"as":           "group",
			},
		},
		{
			"$unwind": "$group",
		},
		{
			"$replaceRoot": bson.M{
				"newRoot": "$group",
			},
		},
	}

	cursor, err := r.memberCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groups []entities.GroupInfo
	err = cursor.All(ctx, &groups)
	return groups, err
}

// Helper function to generate invite codes
func generateInviteCode() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 8)
	_, err := rand.Read(b)
	if err != nil {
		// Fallback to time-based generation
		return fmt.Sprintf("%d", time.Now().Unix())
	}

	for i := range b {
		b[i] = charset[b[i]%byte(len(charset))]
	}
	return string(b)
}
