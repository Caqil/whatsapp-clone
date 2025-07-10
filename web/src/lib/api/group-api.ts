// src/lib/api/group-api.ts

import axios from 'axios';
import { groupEndpoints } from '@/config/api-endpoints';
import { getStoredTokens } from '@/lib/storage';
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
import type { ApiResponse } from '@/types/api';

export class GroupAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  }

  private getAuthHeaders() {
    const { accessToken } = getStoredTokens();
    return {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    };
  }

  private async request<T>(method: string, url: string, data?: any): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${url}`,
        data,
        headers: this.getAuthHeaders(),
        timeout: 30000,
      });
      
      // Handle both direct data and wrapped responses
      return response.data.data || response.data;
    } catch (error) {
      console.error(`❌ ${method.toUpperCase()} ${url} failed:`, error);
      throw error;
    }
  }

  // Group information
  async getGroupInfo(groupId: string): Promise<GroupInfo> {
    return this.request<GroupInfo>('GET', groupEndpoints.getGroupInfo(groupId));
  }

  async updateGroupInfo(
    groupId: string,
    updates: UpdateGroupInfoRequest
  ): Promise<void> {
    await this.request<void>('PUT', groupEndpoints.updateGroupInfo(groupId), updates);
  }

  async updateGroupSettings(
    groupId: string,
    settings: UpdateGroupSettingsRequest
  ): Promise<void> {
    await this.request<void>('PUT', groupEndpoints.updateGroupSettings(groupId), settings);
  }

  // Member management
  async addMembers(
    groupId: string,
    request: AddMembersRequest
  ): Promise<AddMembersResult> {
    return this.request<AddMembersResult>('POST', groupEndpoints.addMembers(groupId), request);
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.request<void>('DELETE', groupEndpoints.removeMember(groupId, userId));
  }

  async leaveGroup(groupId: string): Promise<void> {
    await this.request<void>('POST', groupEndpoints.leaveGroup(groupId));
  }

  async changeRole(
    groupId: string,
    userId: string,
    request: ChangeRoleRequest
  ): Promise<void> {
    await this.request<void>('PUT', groupEndpoints.changeRole(groupId, userId), request);
  }

  // Group invitations
  async createInvite(
    groupId: string,
    request: CreateInviteRequest
  ): Promise<GroupInvite> {
    return this.request<GroupInvite>('POST', groupEndpoints.createInvite(groupId), request);
  }

  async getGroupInvites(groupId: string): Promise<GroupInvite[]> {
    return this.request<GroupInvite[]>('GET', groupEndpoints.getGroupInvites(groupId));
  }

  async revokeInvite(groupId: string, inviteId: string): Promise<void> {
    await this.request<void>('DELETE', groupEndpoints.revokeInvite(groupId, inviteId));
  }

  async joinViaInvite(request: JoinViaInviteRequest): Promise<void> {
    await this.request<void>('POST', groupEndpoints.joinViaInvite(), request);
  }

  async getInviteInfo(inviteCode: string): Promise<GroupInviteInfo> {
    return this.request<GroupInviteInfo>('GET', groupEndpoints.getInviteInfo(inviteCode));
  }

  // Group actions
  async pinGroup(groupId: string): Promise<void> {
    await this.request<void>('POST', groupEndpoints.pinGroup(groupId));
  }

  async unpinGroup(groupId: string): Promise<void> {
    await this.request<void>('POST', groupEndpoints.unpinGroup(groupId));
  }

  async muteGroup(groupId: string, request: MuteGroupRequest): Promise<void> {
    await this.request<void>('POST', groupEndpoints.muteGroup(groupId), request);
  }

  async unmuteGroup(groupId: string): Promise<void> {
    await this.request<void>('POST', groupEndpoints.unmuteGroup(groupId));
  }

  async archiveGroup(groupId: string): Promise<void> {
    await this.request<void>('POST', groupEndpoints.archiveGroup(groupId));
  }

  async unarchiveGroup(groupId: string): Promise<void> {
    await this.request<void>('POST', groupEndpoints.unarchiveGroup(groupId));
  }
}

// Export singleton instance
export const groupApi = new GroupAPI();