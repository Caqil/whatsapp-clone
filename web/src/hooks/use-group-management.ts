import { useState, useCallback } from 'react';
import { groupApi } from '@/lib/api/group-api';
import { useSocket } from '@/hooks/use-socket';
import { toast } from 'sonner';
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
  GroupRole,
} from '@/types/group';

interface UseGroupManagementState {
  isLoading: boolean;
  error: string | null;
  groupInfo: GroupInfo | null;
  invites: GroupInvite[];
}

interface UseGroupManagementActions {
  // Group information
  loadGroupInfo: (groupId: string) => Promise<GroupInfo | null>;
  updateGroupInfo: (groupId: string, updates: UpdateGroupInfoRequest) => Promise<void>;
  updateGroupSettings: (groupId: string, settings: UpdateGroupSettingsRequest) => Promise<void>;
  
  // Member management
  addMembers: (groupId: string, userIds: string[]) => Promise<AddMembersResult | null>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  changeRole: (groupId: string, userId: string, role: GroupRole) => Promise<void>;
  
  // Group invitations
  createInvite: (groupId: string, options: CreateInviteRequest) => Promise<GroupInvite | null>;
  loadGroupInvites: (groupId: string) => Promise<GroupInvite[]>;
  revokeInvite: (groupId: string, inviteId: string) => Promise<void>;
  joinViaInvite: (inviteCode: string) => Promise<void>;
  getInviteInfo: (inviteCode: string) => Promise<GroupInviteInfo | null>;
  
  // Group actions
  pinGroup: (groupId: string) => Promise<void>;
  unpinGroup: (groupId: string) => Promise<void>;
  muteGroup: (groupId: string, duration: number) => Promise<void>;
  unmuteGroup: (groupId: string) => Promise<void>;
  archiveGroup: (groupId: string) => Promise<void>;
  unarchiveGroup: (groupId: string) => Promise<void>;
  
  // State management
  clearError: () => void;
  reset: () => void;
}

export interface UseGroupManagement extends UseGroupManagementState, UseGroupManagementActions {}

const INITIAL_STATE: UseGroupManagementState = {
  isLoading: false,
  error: null,
  groupInfo: null,
  invites: [],
};

export function useGroupManagement(): UseGroupManagement {
  const [state, setState] = useState<UseGroupManagementState>(INITIAL_STATE);
  const { isConnected } = useSocket();

  const updateState = useCallback((updates: Partial<UseGroupManagementState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Group information
  const loadGroupInfo = useCallback(async (groupId: string): Promise<GroupInfo | null> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const groupInfo = await groupApi.getGroupInfo(groupId);
      
      updateState({ groupInfo, isLoading: false });
      return groupInfo;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load group info';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  }, [updateState]);

  const updateGroupInfo = useCallback(async (
    groupId: string,
    updates: UpdateGroupInfoRequest
  ): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      await groupApi.updateGroupInfo(groupId, updates);
      
      // Update local state
      if (state.groupInfo && state.groupInfo.id === groupId) {
        updateState({
          groupInfo: { ...state.groupInfo, ...updates },
          isLoading: false,
        });
      } else {
        updateState({ isLoading: false });
      }
      
      toast.success('Group info updated successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update group info';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, state.groupInfo]);

  const updateGroupSettings = useCallback(async (
    groupId: string,
    settings: UpdateGroupSettingsRequest
  ): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });

      await groupApi.updateGroupSettings(groupId, settings);

      // Optionally update local state if needed
      if (state.groupInfo && state.groupInfo.id === groupId) {
        updateState({
          groupInfo: { 
            ...state.groupInfo, 
            settings: { 
              ...state.groupInfo.settings, 
              ...settings,
              whoCanSendMessages: settings.whoCanSendMessages ?? state.groupInfo.settings?.whoCanSendMessages ?? "everyone",
              whoCanEditInfo: settings.whoCanEditInfo ?? state.groupInfo.settings?.whoCanEditInfo ?? "admins",
              whoCanAddMembers: settings.whoCanAddMembers ?? state.groupInfo.settings?.whoCanAddMembers ?? "everyone",
              disappearingMessages: settings.disappearingMessages ?? state.groupInfo.settings?.disappearingMessages ?? false,
              disappearingTime: settings.disappearingTime ?? state.groupInfo.settings?.disappearingTime ?? 0,
            } 
          },
          isLoading: false,
        });
      } else {
        updateState({ isLoading: false });
      }

      toast.success('Group settings updated successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update group settings';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, state.groupInfo]);

  // Member management
  const addMembers = useCallback(async (
    groupId: string,
    userIds: string[]
  ): Promise<AddMembersResult | null> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const request: AddMembersRequest = {
        userIds,
        sendWelcomeMessage: true,
      };
      
      const result = await groupApi.addMembers(groupId, request);
      
      updateState({ isLoading: false });
      
      if (result.addedMembers.length > 0) {
        toast.success(`${result.addedMembers.length} member(s) added successfully`);
      }
      
      if (result.failedToAdd.length > 0) {
        toast.warning(`Failed to add ${result.failedToAdd.length} member(s)`);
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to add members';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  }, [updateState]);

  const removeMember = useCallback(async (
    groupId: string,
    userId: string
  ): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      await groupApi.removeMember(groupId, userId);
      
      updateState({ isLoading: false });
      toast.success('Member removed successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to remove member';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState]);

  const leaveGroup = useCallback(async (groupId: string): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      await groupApi.leaveGroup(groupId);
      
      updateState({ isLoading: false });
      toast.success('Left group successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to leave group';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState]);

  const changeRole = useCallback(async (
    groupId: string,
    userId: string,
    role: GroupRole
  ): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const request: ChangeRoleRequest = { role };
      await groupApi.changeRole(groupId, userId, request);
      
      updateState({ isLoading: false });
      toast.success('Role changed successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to change role';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState]);

  // Group invitations
  const createInvite = useCallback(async (
    groupId: string,
    options: CreateInviteRequest
  ): Promise<GroupInvite | null> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const invite = await groupApi.createInvite(groupId, options);
      
      updateState({ isLoading: false });
      toast.success('Invite created successfully');
      
      return invite;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create invite';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  }, [updateState]);

  const loadGroupInvites = useCallback(async (groupId: string): Promise<GroupInvite[]> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const invites = await groupApi.getGroupInvites(groupId);
      
      updateState({ invites, isLoading: false });
      return invites;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load invites';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      return [];
    }
  }, [updateState]);

  const revokeInvite = useCallback(async (
    groupId: string,
    inviteId: string
  ): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      await groupApi.revokeInvite(groupId, inviteId);
      
      // Remove from local state
      updateState({
        invites: state.invites.filter(invite => invite.id !== inviteId),
        isLoading: false,
      });
      
      toast.success('Invite revoked successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to revoke invite';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState, state.invites]);

  const joinViaInvite = useCallback(async (inviteCode: string): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const request: JoinViaInviteRequest = { inviteCode };
      await groupApi.joinViaInvite(request);
      
      updateState({ isLoading: false });
      toast.success('Joined group successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to join group';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateState]);

  const getInviteInfo = useCallback(async (inviteCode: string): Promise<GroupInviteInfo | null> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const inviteInfo = await groupApi.getInviteInfo(inviteCode);
      
      updateState({ isLoading: false });
      return inviteInfo;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to get invite info';
      updateState({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  }, [updateState]);

  // Group actions
  const pinGroup = useCallback(async (groupId: string): Promise<void> => {
    try {
      await groupApi.pinGroup(groupId);
      toast.success('Group pinned');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to pin group';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const unpinGroup = useCallback(async (groupId: string): Promise<void> => {
    try {
      await groupApi.unpinGroup(groupId);
      toast.success('Group unpinned');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to unpin group';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const muteGroup = useCallback(async (groupId: string, duration: number): Promise<void> => {
    try {
      const request: MuteGroupRequest = { duration };
      await groupApi.muteGroup(groupId, request);
      toast.success('Group muted');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to mute group';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const unmuteGroup = useCallback(async (groupId: string): Promise<void> => {
    try {
      await groupApi.unmuteGroup(groupId);
      toast.success('Group unmuted');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to unmute group';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const archiveGroup = useCallback(async (groupId: string): Promise<void> => {
    try {
      await groupApi.archiveGroup(groupId);
      toast.success('Group archived');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to archive group';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const unarchiveGroup = useCallback(async (groupId: string): Promise<void> => {
    try {
      await groupApi.unarchiveGroup(groupId);
      toast.success('Group unarchived');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to unarchive group';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  // State management
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    loadGroupInfo,
    updateGroupInfo,
    updateGroupSettings,
    addMembers,
    removeMember,
    leaveGroup,
    changeRole,
    createInvite,
    loadGroupInvites,
    revokeInvite,
    joinViaInvite,
    getInviteInfo,
    pinGroup,
    unpinGroup,
    muteGroup,
    unmuteGroup,
    archiveGroup,
    unarchiveGroup,
    clearError,
    reset,
  };
}