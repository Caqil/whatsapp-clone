"use client";

import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Users,
  Crown,
  Shield,
} from "lucide-react";
import { GroupActionsMenu } from "@/components/group/group-actions-menu";
import { GroupInfoDialog } from "@/components/group/group-info-dialog";
import { GroupSettingsDialog } from "@/components/group/group-settings-dialog";
import { GroupInviteDialog } from "@/components/group/group-invite-dialog";
import type { ChatWithUsers } from "@/types/chat";

interface ChatHeaderProps {
  chat: ChatWithUsers;
  currentUserId?: string; // Add current user ID to check admin/owner status
  onCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  onChatInfo?: () => void;
  onLeaveGroup?: () => void;
}

export function ChatHeader({
  chat,
  currentUserId,
  onCall,
  onVideoCall,
  onSearch,
  onChatInfo,
  onLeaveGroup,
}: ChatHeaderProps) {
  const isGroup = chat.type === "group";
  const otherParticipant = isGroup
    ? null
    : chat.participants.find((p) => p.id !== chat.createdBy);

  // For groups, show member count and online status
  const onlineCount = isGroup
    ? chat.participants.filter((p) => p.isOnline).length
    : 0;

  // Check if current user is admin/owner (only for groups)
  const isAdmin =
    isGroup && currentUserId
      ? (chat as any).admins?.includes(currentUserId) || false
      : false;
  const isOwner =
    isGroup && currentUserId ? (chat as any).owner === currentUserId : false;

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={
              chat.avatar || (isGroup ? undefined : otherParticipant?.avatar)
            }
            alt={
              chat.name ||
              `${otherParticipant?.firstName} ${otherParticipant?.lastName}`
            }
          />
          <AvatarFallback>
            {isGroup
              ? chat.name?.charAt(0).toUpperCase()
              : `${otherParticipant?.firstName?.[0]}${otherParticipant?.lastName?.[0]}`}
          </AvatarFallback>
        </Avatar>

        {/* Chat Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">
              {isGroup
                ? chat.name
                : `${otherParticipant?.firstName} ${otherParticipant?.lastName}`}
            </h2>

            {/* Group indicators */}
            {isGroup && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                {isOwner && <Crown className="h-4 w-4 text-yellow-500" />}
                {isAdmin && !isOwner && (
                  <Shield className="h-4 w-4 text-blue-500" />
                )}
              </div>
            )}

            {/* Status indicators */}
            {chat.isPinned && (
              <Badge variant="outline" className="text-xs">
                Pinned
              </Badge>
            )}
            {chat.isMuted && (
              <Badge variant="outline" className="text-xs">
                Muted
              </Badge>
            )}
          </div>

          {/* Status line */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isGroup ? (
              <>
                <span>{chat.participants.length} members</span>
                {onlineCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{onlineCount} online</span>
                  </>
                )}
              </>
            ) : (
              <span>
                {otherParticipant?.isOnline ? "Online" : "Last seen recently"}
              </span>
            )}

            {/* Typing indicator */}
            {chat.isTyping && (
              <>
                <span>•</span>
                <span className="text-primary">
                  {isGroup && chat.typingUsers.length > 0
                    ? `${chat.typingUsers[0].firstName} is typing...`
                    : "Typing..."}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Call buttons */}
        <Button variant="ghost" size="sm" onClick={onCall}>
          <Phone className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onVideoCall}>
          <Video className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onSearch}>
          <Search className="h-4 w-4" />
        </Button>

        {/* Group-specific actions */}
        {isGroup ? (
          <GroupActionsMenu
            chat={chat}
            onGroupInfo={() => {}}
            onGroupSettings={() => {}}
            onGroupInvites={() => {}}
            onLeaveGroup={onLeaveGroup}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={onChatInfo}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
