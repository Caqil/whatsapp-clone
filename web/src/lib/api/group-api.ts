
import { groupEndpoints } from '@/config/api-endpoints';
import type {
  GroupInfo,
  UpdateGroupInfoRequest,
  UpdateGroupSettingsRequest,
  AddMembersRequest,
  AddMembersResult,
  ChangeRoleRequest,
  CreateInviteRequest,
  GroupInvite,
  JoinViaInviteRequest,
  MuteGroupRequest,
  GroupInviteInfo,
} from '@/types/group';

export class GroupAPI extends BaseAPI {
  // Group information
  async getGroupInfo(groupId: string): Promise<GroupInfo> {
    const response = await this.get<{ data: GroupInfo }>(
      groupEndpoints.getGroupInfo(groupId)
    );
    return response.data;
  }

  async updateGroupInfo(
    groupId: string,
    updates: UpdateGroupInfoRequest
  ): Promise<void> {
    await this.put(groupEndpoints.updateGroupInfo(groupId), updates);
  }

  async updateGroupSettings(
    groupId: string,
    settings: UpdateGroupSettingsRequest
  ): Promise<void> {
    await this.put(groupEndpoints.updateGroupSettings(groupId), settings);
  }

  // Member management
  async addMembers(
    groupId: string,
    request: AddMembersRequest
  ): Promise<AddMembersResult> {
    const response = await this.post<{ data: AddMembersResult }>(
      groupEndpoints.addMembers(groupId),
      request
    );
    return response.data;
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.delete(groupEndpoints.removeMember(groupId, userId));
  }

  async leaveGroup(groupId: string): Promise<void> {
    await this.post(groupEndpoints.leaveGroup(groupId));
  }

  async changeRole(
    groupId: string,
    userId: string,
    request: ChangeRoleRequest
  ): Promise<void> {
    await this.put(groupEndpoints.changeRole(groupId, userId), request);
  }

  // Group invitations
  async createInvite(
    groupId: string,
    request: CreateInviteRequest
  ): Promise<GroupInvite> {
    const response = await this.post<{ data: GroupInvite }>(
      groupEndpoints.createInvite(groupId),
      request
    );
    return response.data;
  }

  async getGroupInvites(groupId: string): Promise<GroupInvite[]> {
    const response = await this.get<{ data: GroupInvite[] }>(
      groupEndpoints.getGroupInvites(groupId)
    );
    return response.data;
  }

  async revokeInvite(groupId: string, inviteId: string): Promise<void> {
    await this.delete(groupEndpoints.revokeInvite(groupId, inviteId));
  }

  async joinViaInvite(request: JoinViaInviteRequest): Promise<void> {
    await this.post(groupEndpoints.joinViaInvite(), request);
  }

  async getInviteInfo(inviteCode: string): Promise<GroupInviteInfo> {
    const response = await this.get<{ data: GroupInviteInfo }>(
      groupEndpoints.getInviteInfo(inviteCode)
    );
    return response.data;
  }

  // Group actions
  async pinGroup(groupId: string): Promise<void> {
    await this.post(groupEndpoints.pinGroup(groupId));
  }

  async unpinGroup(groupId: string): Promise<void> {
    await this.post(groupEndpoints.unpinGroup(groupId));
  }

  async muteGroup(groupId: string, request: MuteGroupRequest): Promise<void> {
    await this.post(groupEndpoints.muteGroup(groupId), request);
  }

  async unmuteGroup(groupId: string): Promise<void> {
    await this.post(groupEndpoints.unmuteGroup(groupId));
  }

  async archiveGroup(groupId: string): Promise<void> {
    await this.post(groupEndpoints.archiveGroup(groupId));
  }

  async unarchiveGroup(groupId: string): Promise<void> {
    await this.post(groupEndpoints.unarchiveGroup(groupId));
  }
}

// Export singleton instance
export const groupApi = new GroupAPI();