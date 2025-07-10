"use client";

import { useState, useEffect } from "react";
import { useGroupManagement } from "@/hooks/use-group-management";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Crown,
  Shield,
  User,
  Edit,
  Save,
  X,
  UserPlus,
  UserMinus,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { GroupInfo } from "@/types/group";

interface GroupInfoDialogProps {
  groupId: string;
  trigger: React.ReactNode;
  onMemberAction?: (action: string, userId: string) => void;
}

export function GroupInfoDialog({
  groupId,
  trigger,
  onMemberAction,
}: GroupInfoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
  });

  const {
    groupInfo,
    isLoading,
    error,
    loadGroupInfo,
    updateGroupInfo,
    removeMember,
    leaveGroup,
    changeRole,
  } = useGroupManagement();

  useEffect(() => {
    if (isOpen) {
      loadGroupInfo(groupId);
    }
  }, [isOpen, groupId, loadGroupInfo]);

  useEffect(() => {
    if (groupInfo) {
      setEditForm({
        name: groupInfo.name || "",
        description: groupInfo.description || "",
      });
    }
  }, [groupInfo]);

  const handleSave = async () => {
    try {
      await updateGroupInfo(groupId, editForm);
      setIsEditing(false);
      toast.success("Group info updated successfully");
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(groupId, userId);
      await loadGroupInfo(groupId);
      onMemberAction?.("remove", userId);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveGroup(groupId);
      setIsOpen(false);
      onMemberAction?.("leave", "");
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleChangeRole = async (
    userId: string,
    newRole: "admin" | "member"
  ) => {
    try {
      await changeRole(groupId, userId, newRole);
      await loadGroupInfo(groupId);
      onMemberAction?.("role_change", userId);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
            Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="secondary" className="text-blue-700 bg-blue-100">
            Admin
          </Badge>
        );
      default:
        return <Badge variant="outline">Member</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Info
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {groupInfo && (
          <div className="space-y-6">
            {/* Group Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={groupInfo.avatar} alt={groupInfo.name} />
                <AvatarFallback>
                  {groupInfo.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Group name"
                    />
                    <Textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Group description"
                      rows={2}
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold">{groupInfo.name}</h3>
                    {groupInfo.description && (
                      <p className="text-sm text-muted-foreground">
                        {groupInfo.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={isLoading}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Group Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Members</span>
                </div>
                <p className="text-2xl font-bold">{groupInfo.memberCount}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Created</span>
                </div>
                <p className="text-sm font-medium">
                  {new Date(groupInfo.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Separator />

            {/* Members List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">
                  Members ({groupInfo.memberCount})
                </h4>
                <Button size="sm" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Members
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {groupInfo.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 hover:bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={member.user.avatar}
                            alt={member.user.firstName}
                          />
                          <AvatarFallback>
                            {member.user.firstName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{member.user.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role)}
                        {getRoleBadge(member.role)}
                        {member.role !== "owner" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {member.role === "member" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleChangeRole(member.userId, "admin")
                                  }
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Make Admin
                                </DropdownMenuItem>
                              )}
                              {member.role === "admin" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleChangeRole(member.userId, "member")
                                  }
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Remove Admin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  handleRemoveMember(member.userId)
                                }
                                className="text-red-600"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={handleLeaveGroup}
                disabled={isLoading}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Group
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
