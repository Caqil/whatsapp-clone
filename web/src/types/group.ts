import type { User } from './user';

// Group roles
export type GroupRole = 'owner' | 'admin' | 'member';

// Group settings
export interface GroupSettings {
  whoCanSendMessages: 'everyone' | 'admins';
  whoCanEditInfo: 'everyone' | 'admins';
  whoCanAddMembers: 'everyone' | 'admins';
  disappearingMessages: boolean;
  disappearingTime?: number;
}

// Group member with user info
export interface GroupMemberWithUser {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  role: GroupRole;
  joinedAt: string;
  addedBy?: string;
  isActive: boolean;
}

// Group invite
export interface GroupInvite {
  id: string;
  groupId: string;
  inviteCode: string;
  inviteLink: string;
  createdBy: string;
  expiresAt?: string;
  maxUses: number;
  currentUses: number;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: string;
}

// Group info (extended chat with members)
export interface GroupInfo {
  id: string;
  type: 'group';
  name: string;
  description?: string;
  avatar?: string;
  participants: string[];
  createdBy: string;
  owner?: string;
  admins: string[];
  settings?: GroupSettings;
  isPinned: boolean;
  isMuted: boolean;
  mutedUntil?: string;
  isArchived: boolean;
  memberCount: number;
  members: GroupMemberWithUser[];
  pendingInvites: GroupInvite[];
  lastMessage?: any;
  createdAt: string;
  updatedAt: string;
}

// Request types
export interface UpdateGroupInfoRequest {
  name?: string;
  description?: string;
  avatar?: string;
}

export interface UpdateGroupSettingsRequest {
  whoCanSendMessages?: 'everyone' | 'admins';
  whoCanEditInfo?: 'everyone' | 'admins';
  whoCanAddMembers?: 'everyone' | 'admins';
  disappearingMessages?: boolean;
  disappearingTime?: number;
}

export interface AddMembersRequest {
  userIds: string[];
  sendWelcomeMessage?: boolean;
}

export interface AddMembersResult {
  addedMembers: GroupMemberWithUser[];
  failedToAdd: FailedMember[];
}

export interface FailedMember {
  userId: string;
  reason: string;
}

export interface ChangeRoleRequest {
  role: GroupRole;
}

export interface CreateInviteRequest {
  expiresAt?: string;
  maxUses?: number;
  requiresApproval?: boolean;
}

export interface JoinViaInviteRequest {
  inviteCode: string;
}

export interface MuteGroupRequest {
  duration: number; // in seconds, -1 for forever
}

export interface GroupInviteInfo {
  groupId: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  inviteInfo: {
    inviteId: string;
    expiresAt?: string;
    requiresApproval: boolean;
    createdBy: User;
  };
}

// WebSocket event payloads
export interface MemberUpdatePayload {
  groupId: string;
  user: User;
  role?: GroupRole;
}

export interface GroupUpdatePayload {
  groupId: string;
  updates: any;
}

export interface InviteUpdatePayload {
  groupId: string;
  inviteId: string;
  inviteCode?: string;
  action: 'created' | 'revoked' | 'used';
}