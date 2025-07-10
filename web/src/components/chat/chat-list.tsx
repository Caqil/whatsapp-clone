"use client";

import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Users,
  Pin,
  VolumeX,
  Archive,
  Crown,
  Shield,
  Check,
  CheckCheck,
} from "lucide-react";
import type { ChatWithUsers } from "@/types/chat";
import type { MessageWithUser } from "@/types/message";

interface ChatListProps {
  chats: ChatWithUsers[];
  selectedChatId?: string | null;
  onChatSelect?: (chat: ChatWithUsers) => void;
  className?: string;
  currentUserId?: string; // Add current user ID for admin/owner checks
}

export function ChatList({
  chats,
  selectedChatId,
  onChatSelect,
  className,
  currentUserId,
}: ChatListProps) {
  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  const getLastMessagePreview = (chat: ChatWithUsers) => {
    if (!chat.lastMessage) return "No messages yet";

    const message = chat.lastMessage;
    // Check if it's a MessageWithUser (has senderName) or base Message
    const isMessageWithUser = "senderName" in message;
    const isOwn = message.senderId === currentUserId;

    let preview = "";
    if (isOwn) {
      preview = "You: ";
    } else if (chat.type === "group") {
      // Use senderName if available, otherwise fallback to "Someone"
      const senderName = isMessageWithUser
        ? (message as MessageWithUser).senderName
        : "Someone";
      preview = `${senderName}: `;
    }

    switch (message.type) {
      case "text":
        return preview + message.content;
      case "image":
        return preview + "📷 Photo";
      case "file":
        return preview + "📎 File";
      case "audio":
        return preview + "🎵 Audio";
      case "video":
        return preview + "📹 Video";
      default:
        return preview + message.content;
    }
  };

  const getMessageStatus = (chat: ChatWithUsers) => {
    if (!chat.lastMessage) return null;

    const message = chat.lastMessage;
    const isOwn = message.senderId === currentUserId;

    if (!isOwn) return null;

    switch (message.status) {
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  // Sort chats: pinned first, then by last message time
  const sortedChats = [...chats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    const aTime = a.lastMessage?.createdAt || a.updatedAt;
    const bTime = b.lastMessage?.createdAt || b.updatedAt;

    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <div className={cn("space-y-1", className)}>
      {sortedChats.map((chat) => {
        const isSelected = selectedChatId === chat.id;
        const isGroup = chat.type === "group";
        const otherParticipant = isGroup
          ? null
          : chat.participants.find((p) => p.id !== chat.createdBy);

        // Check admin/owner status for groups
        const isOwner =
          isGroup && currentUserId
            ? (chat as any).owner === currentUserId
            : false;
        const isAdmin =
          isGroup && currentUserId
            ? (chat as any).admins?.includes(currentUserId) || false
            : false;

        return (
          <div
            key={chat.id}
            onClick={() => onChatSelect?.(chat)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
              "hover:bg-accent/50",
              isSelected && "bg-accent"
            )}
          >
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={
                    chat.avatar ||
                    (isGroup ? undefined : otherParticipant?.avatar)
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

              {/* Online indicator for direct chats */}
              {!isGroup && otherParticipant?.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {isGroup
                      ? chat.name
                      : `${otherParticipant?.firstName} ${otherParticipant?.lastName}`}
                  </h3>

                  {/* Group indicators */}
                  {isGroup && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {isOwner && <Crown className="h-3 w-3 text-yellow-500" />}
                      {isAdmin && !isOwner && (
                        <Shield className="h-3 w-3 text-blue-500" />
                      )}
                    </div>
                  )}

                  {/* Status indicators */}
                  <div className="flex items-center gap-1">
                    {chat.isPinned && (
                      <Pin className="h-3 w-3 text-muted-foreground" />
                    )}
                    {chat.isMuted && (
                      <VolumeX className="h-3 w-3 text-muted-foreground" />
                    )}
                    {chat.isArchived && (
                      <Archive className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Time and message status */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getMessageStatus(chat)}
                  <span>
                    {chat.lastMessage
                      ? formatLastMessageTime(chat.lastMessage.createdAt)
                      : formatLastMessageTime(chat.updatedAt)}
                  </span>
                </div>
              </div>

              {/* Last message and unread count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  {getLastMessagePreview(chat)}
                </p>

                {/* Unread count */}
                {chat.unreadCount > 0 && (
                  <Badge
                    variant="default"
                    className="ml-2 min-w-[20px] h-5 text-xs"
                  >
                    {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
