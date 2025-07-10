"use client";

import { useState } from "react";
import { useGroupManagement } from "@/hooks/use-group-management";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreVertical,
  Pin,
  PinOff,
  Volume2,
  VolumeX,
  Archive,
  ArchiveRestore,
  Trash2,
  Users,
  Settings,
  Link,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type { ChatWithUsers } from "@/types/chat";

interface GroupActionsMenuProps {
  chat: ChatWithUsers;
  onGroupInfo?: () => void;
  onGroupSettings?: () => void;
  onGroupInvites?: () => void;
  onLeaveGroup?: () => void;
}

export function GroupActionsMenu({
  chat,
  onGroupInfo,
  onGroupSettings,
  onGroupInvites,
  onLeaveGroup,
}: GroupActionsMenuProps) {
  const [showMuteDialog, setShowMuteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [muteDuration, setMuteDuration] = useState<string>("3600"); // 1 hour

  const {
    pinGroup,
    unpinGroup,
    muteGroup,
    unmuteGroup,
    archiveGroup,
    unarchiveGroup,
    leaveGroup,
    isLoading,
  } = useGroupManagement();

  const handlePinToggle = async () => {
    try {
      if (chat.isPinned) {
        await unpinGroup(chat.id);
        toast.success("Group unpinned");
      } else {
        await pinGroup(chat.id);
        toast.success("Group pinned");
      }
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleMuteToggle = async () => {
    try {
      if (chat.isMuted) {
        await unmuteGroup(chat.id);
        toast.success("Group unmuted");
      } else {
        setShowMuteDialog(true);
      }
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleMute = async () => {
    try {
      const duration = parseInt(muteDuration);
      await muteGroup(chat.id, duration);
      setShowMuteDialog(false);
      toast.success("Group muted");
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleArchiveToggle = async () => {
    try {
      if (chat.isArchived) {
        await unarchiveGroup(chat.id);
        toast.success("Group unarchived");
      } else {
        await archiveGroup(chat.id);
        toast.success("Group archived");
      }
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveGroup(chat.id);
      setShowLeaveDialog(false);
      onLeaveGroup?.();
      toast.success("Left group successfully");
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const muteDurationOptions = [
    { value: "900", label: "15 minutes" },
    { value: "3600", label: "1 hour" },
    { value: "28800", label: "8 hours" },
    { value: "86400", label: "24 hours" },
    { value: "604800", label: "1 week" },
    { value: "-1", label: "Forever" },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onGroupInfo}>
            <Info className="h-4 w-4 mr-2" />
            Group Info
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onGroupSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Group Settings
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onGroupInvites}>
            <Link className="h-4 w-4 mr-2" />
            Invite Links
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handlePinToggle} disabled={isLoading}>
            {chat.isPinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Unpin Group
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Pin Group
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleMuteToggle} disabled={isLoading}>
            {chat.isMuted ? (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Unmute Group
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Mute Group
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleArchiveToggle} disabled={isLoading}>
            {chat.isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Unarchive Group
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive Group
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowLeaveDialog(true)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Leave Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mute Dialog */}
      <Dialog open={showMuteDialog} onOpenChange={setShowMuteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mute Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="muteDuration">Mute for</Label>
              <Select value={muteDuration} onValueChange={setMuteDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {muteDurationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMuteDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleMute} disabled={isLoading}>
                {isLoading ? "Muting..." : "Mute"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Group Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{chat.name}"? You'll need to be
              re-invited to join again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? "Leaving..." : "Leave Group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
