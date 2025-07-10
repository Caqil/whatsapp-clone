package repositories

import (
	"bro-chat/internal/domain/entities"
	"bro-chat/internal/domain/repositories"
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type groupRepository struct {
	chatCollection     *mongo.Collection
	membersCollection  *mongo.Collection
	invitesCollection  *mongo.Collection
	activityCollection *mongo.Collection
	userCollection     *mongo.Collection
}

func NewGroupRepository(db *mongo.Database) repositories.GroupRepository {
	repo := &groupRepository{
		chatCollection:     db.Collection("chats"),
		membersCollection:  db.Collection("group_members"),
		invitesCollection:  db.Collection("group_invites"),
		activityCollection: db.Collection("group_activities"),
		userCollection:     db.Collection("users"),
	}

	repo.createIndexes()
	return repo
}

func (r *groupRepository) createIndexes() {
	ctx := context.Background()

	// Group members indexes
	r.membersCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{"group_id", 1},
			{"user_id", 1},
		},
		Options: options.Index().SetUnique(true),
	})

	// Group invites indexes
	r.invitesCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{"invite_code", 1}},
		Options: options.Index().SetUnique(true),
	})

	// Group activities index
	r.activityCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{"group_id", 1},
			{"timestamp", -1},
		},
	})
}

func (r *groupRepository) GetGroupInfo(ctx context.Context, groupID primitive.ObjectID) (*entities.GroupInfo, error) {
	// Get group chat info
	var chat entities.Chat
	err := r.chatCollection.FindOne(ctx, bson.M{"_id": groupID, "type": "group"}).Decode(&chat)
	if err != nil {
		return nil, err
	}

	// Get group members
	members, err := r.GetGroupMembers(ctx, groupID)
	if err != nil {
		return nil, err
	}

	// Get pending invites
	pendingInvites, err := r.GetGroupInvites(ctx, groupID)
	if err != nil {
		return nil, err
	}

	return &entities.GroupInfo{
		Chat:           &chat,
		MemberCount:    len(members),
		Members:        members,
		PendingInvites: pendingInvites,
		Settings:       chat.Settings,
	}, nil
}

func (r *groupRepository) UpdateGroupInfo(ctx context.Context, groupID primitive.ObjectID, updates *entities.UpdateGroupInfoRequest) error {
	updateDoc := bson.M{"updated_at": time.Now()}

	if updates.Name != "" {
		updateDoc["name"] = updates.Name
	}
	if updates.Description != "" {
		updateDoc["description"] = updates.Description
	}
	if updates.Avatar != "" {
		updateDoc["avatar"] = updates.Avatar
	}

	_, err := r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID, "type": "group"},
		bson.M{"$set": updateDoc},
	)
	return err
}

func (r *groupRepository) UpdateGroupSettings(ctx context.Context, groupID primitive.ObjectID, settings *entities.UpdateGroupSettingsRequest) error {
	updateDoc := bson.M{"updated_at": time.Now()}

	if settings.WhoCanSendMessages != "" {
		updateDoc["settings.who_can_send_messages"] = settings.WhoCanSendMessages
	}
	if settings.WhoCanEditInfo != "" {
		updateDoc["settings.who_can_edit_info"] = settings.WhoCanEditInfo
	}
	if settings.WhoCanAddMembers != "" {
		updateDoc["settings.who_can_add_members"] = settings.WhoCanAddMembers
	}
	if settings.DisappearingMessages != nil {
		updateDoc["settings.disappearing_messages"] = *settings.DisappearingMessages
	}
	if settings.DisappearingTime != nil {
		updateDoc["settings.disappearing_time"] = *settings.DisappearingTime
	}

	_, err := r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID, "type": "group"},
		bson.M{"$set": updateDoc},
	)
	return err
}

func (r *groupRepository) AddMember(ctx context.Context, groupID, userID, addedBy primitive.ObjectID, role entities.GroupRole) error {
	member := &entities.GroupMember{
		ID:       primitive.NewObjectID(),
		GroupID:  groupID,
		UserID:   userID,
		Role:     role,
		JoinedAt: time.Now(),
		AddedBy:  &addedBy,
		IsActive: true,
	}

	// Insert member
	_, err := r.membersCollection.InsertOne(ctx, member)
	if err != nil {
		return err
	}

	// Update chat participants
	_, err = r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$addToSet": bson.M{"participants": userID}},
	)
	return err
}

func (r *groupRepository) RemoveMember(ctx context.Context, groupID, userID primitive.ObjectID) error {
	// Mark member as inactive
	_, err := r.membersCollection.UpdateOne(
		ctx,
		bson.M{"group_id": groupID, "user_id": userID},
		bson.M{"$set": bson.M{"is_active": false, "left_at": time.Now()}},
	)
	if err != nil {
		return err
	}

	// Remove from chat participants
	_, err = r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$pull": bson.M{"participants": userID}},
	)
	return err
}

func (r *groupRepository) GetGroupMembers(ctx context.Context, groupID primitive.ObjectID) ([]entities.GroupMemberWithUser, error) {
	pipeline := []bson.M{
		{"$match": bson.M{"group_id": groupID, "is_active": true}},
		{"$lookup": bson.M{
			"from":         "users",
			"localField":   "user_id",
			"foreignField": "_id",
			"as":           "user",
		}},
		{"$unwind": "$user"},
		{"$sort": bson.M{"joined_at": 1}},
	}

	cursor, err := r.membersCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var members []entities.GroupMemberWithUser
	for cursor.Next(ctx) {
		var result struct {
			entities.GroupMember `bson:",inline"`
			User                 entities.User `bson:"user"`
		}
		if err := cursor.Decode(&result); err != nil {
			continue
		}

		members = append(members, entities.GroupMemberWithUser{
			GroupMember: &result.GroupMember,
			User:        result.User,
		})
	}

	return members, nil
}

func (r *groupRepository) GetMemberRole(ctx context.Context, groupID, userID primitive.ObjectID) (entities.GroupRole, error) {
	var member entities.GroupMember
	err := r.membersCollection.FindOne(ctx, bson.M{
		"group_id":  groupID,
		"user_id":   userID,
		"is_active": true,
	}).Decode(&member)
	if err != nil {
		return "", err
	}
	return member.Role, nil
}

func (r *groupRepository) ChangeRole(ctx context.Context, groupID, userID primitive.ObjectID, role entities.GroupRole) error {
	_, err := r.membersCollection.UpdateOne(
		ctx,
		bson.M{"group_id": groupID, "user_id": userID, "is_active": true},
		bson.M{"$set": bson.M{"role": role}},
	)
	return err
}

func (r *groupRepository) IsGroupMember(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error) {
	count, err := r.membersCollection.CountDocuments(ctx, bson.M{
		"group_id":  groupID,
		"user_id":   userID,
		"is_active": true,
	})
	return count > 0, err
}

func (r *groupRepository) IsGroupAdmin(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error) {
	count, err := r.membersCollection.CountDocuments(ctx, bson.M{
		"group_id":  groupID,
		"user_id":   userID,
		"is_active": true,
		"role":      bson.M{"$in": []string{"admin", "owner"}},
	})
	return count > 0, err
}

func (r *groupRepository) IsGroupOwner(ctx context.Context, groupID, userID primitive.ObjectID) (bool, error) {
	count, err := r.membersCollection.CountDocuments(ctx, bson.M{
		"group_id":  groupID,
		"user_id":   userID,
		"is_active": true,
		"role":      "owner",
	})
	return count > 0, err
}

func (r *groupRepository) CreateInvite(ctx context.Context, invite *entities.GroupInvite) error {
	// Generate unique invite code
	invite.ID = primitive.NewObjectID()
	invite.InviteCode = r.generateInviteCode()
	invite.CreatedAt = time.Now()
	invite.IsActive = true

	_, err := r.invitesCollection.InsertOne(ctx, invite)
	return err
}

func (r *groupRepository) generateInviteCode() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func (r *groupRepository) GetInviteByCode(ctx context.Context, inviteCode string) (*entities.GroupInvite, error) {
	var invite entities.GroupInvite
	err := r.invitesCollection.FindOne(ctx, bson.M{
		"invite_code": inviteCode,
		"is_active":   true,
	}).Decode(&invite)
	return &invite, err
}

func (r *groupRepository) GetGroupInvites(ctx context.Context, groupID primitive.ObjectID) ([]entities.GroupInvite, error) {
	cursor, err := r.invitesCollection.Find(ctx, bson.M{
		"group_id":  groupID,
		"is_active": true,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var invites []entities.GroupInvite
	for cursor.Next(ctx) {
		var invite entities.GroupInvite
		if err := cursor.Decode(&invite); err != nil {
			continue
		}
		invites = append(invites, invite)
	}

	return invites, nil
}

func (r *groupRepository) UpdateInviteUsage(ctx context.Context, inviteID primitive.ObjectID) error {
	_, err := r.invitesCollection.UpdateOne(
		ctx,
		bson.M{"_id": inviteID},
		bson.M{"$inc": bson.M{"current_uses": 1}},
	)
	return err
}

func (r *groupRepository) RevokeInvite(ctx context.Context, inviteID primitive.ObjectID) error {
	_, err := r.invitesCollection.UpdateOne(
		ctx,
		bson.M{"_id": inviteID},
		bson.M{"$set": bson.M{"is_active": false}},
	)
	return err
}

func (r *groupRepository) PinGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	// This would typically be stored in a user-specific collection
	// For now, we'll update the chat itself
	_, err := r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$set": bson.M{"is_pinned": true}},
	)
	return err
}

func (r *groupRepository) UnpinGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	_, err := r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$set": bson.M{"is_pinned": false}},
	)
	return err
}

func (r *groupRepository) MuteGroup(ctx context.Context, groupID, userID primitive.ObjectID, duration int) error {
	var muteUntil *time.Time
	if duration > 0 {
		t := time.Now().Add(time.Duration(duration) * time.Second)
		muteUntil = &t
	}

	_, err := r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$set": bson.M{
			"is_muted":    true,
			"muted_until": muteUntil,
		}},
	)
	return err
}

func (r *groupRepository) UnmuteGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	_, err := r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$set": bson.M{
			"is_muted":    false,
			"muted_until": nil,
		}},
	)
	return err
}

func (r *groupRepository) ArchiveGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	_, err := r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$set": bson.M{"is_archived": true}},
	)
	return err
}

func (r *groupRepository) UnarchiveGroup(ctx context.Context, groupID, userID primitive.ObjectID) error {
	_, err := r.chatCollection.UpdateOne(
		ctx,
		bson.M{"_id": groupID},
		bson.M{"$set": bson.M{"is_archived": false}},
	)
	return err
}

func (r *groupRepository) LogActivity(ctx context.Context, activity *entities.GroupActivity) error {
	activity.ID = primitive.NewObjectID()
	activity.Timestamp = time.Now()

	_, err := r.activityCollection.InsertOne(ctx, activity)
	return err
}

func (r *groupRepository) GetGroupActivities(ctx context.Context, groupID primitive.ObjectID, limit int) ([]entities.GroupActivity, error) {
	cursor, err := r.activityCollection.Find(
		ctx,
		bson.M{"group_id": groupID},
		options.Find().SetSort(bson.M{"timestamp": -1}).SetLimit(int64(limit)),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []entities.GroupActivity
	for cursor.Next(ctx) {
		var activity entities.GroupActivity
		if err := cursor.Decode(&activity); err != nil {
			continue
		}
		activities = append(activities, activity)
	}

	return activities, nil
}
