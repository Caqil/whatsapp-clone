// src/components/chat/chat-item.tsx
"use client";

import React, { useState } from "react";
import {
  Pin,
  VolumeX,
  Archive,
  Check,
  CheckCheck,
  Mic,
  Image,
  Video,
  FileText,
  MapPin,
  User,
  MoreVertical,
  Trash2,
  Star,
  Volume2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials, formatChatDate } from "@/lib/utils";
import type { ChatWithUsers } from "@/types/chat";
import type { MessageType } from "@/types/message";

interface ChatItemProps {
  chat: ChatWithUsers;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onSelect?: (chatId: string) => void;
  onToggleSelection?: (chatId: string) => void;
  className?: string;
}

const messageTypeIcons: Record<
  MessageType,
  React.ComponentType<{ className?: string }>
> = {
  text: () => null,
  image: Image,
  video: Video,
  audio: Mic,
  file: FileText,
  document: FileText,
  location: MapPin,
  contact: User,
};

export function ChatItem({
  chat,
  isSelected = false,
  isSelectionMode = false,
  onSelect,
  onToggleSelection,
  className,
}: ChatItemProps) {
  const { user } = useAuth();
  const {
    getChatDisplayName,
    getChatAvatar,
    pinChat,
    unpinChat,
    muteChat,
    unmuteChat,
    archiveChat,
    deleteChat,
  } = useChat();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const chatName = getChatDisplayName(chat);
  const chatAvatar = getChatAvatar(chat);
  const isGroup = chat.type === "group";

  // Get other participant for direct chats
  const otherParticipant = !isGroup
    ? chat.participants.find((p) => p.id !== user?.id)
    : null;

  // Format last message preview
  const getLastMessagePreview = () => {
    if (!chat.lastMessage) return "No messages yet";

    const { lastMessage } = chat;
    const isOwn = lastMessage.senderId === user?.id;
    const senderName =
      isGroup && !isOwn
        ? chat.participants.find((p) => p.id === lastMessage.senderId)
            ?.firstName || "Someone"
        : "";

    let preview = "";

    // Add sender name for group chats
    if (senderName) {
      preview += `${senderName}: `;
    } else if (isOwn) {
      preview += "You: ";
    }

    // Add message content based on type
    switch (lastMessage.type) {
      case "text":
        preview += lastMessage.content;
        break;
      case "image":
        preview += "📷 Photo";
        break;
      case "video":
        preview += "🎥 Video";
        break;
      case "audio":
        preview += "🎵 Audio";
        break;
      case "file":
      case "document":
        preview += `📎 ${lastMessage.fileName || "Document"}`;
        break;
      case "location":
        preview += "📍 Location";
        break;
      case "contact":
        preview += "👤 Contact";
        break;
      default:
        preview += lastMessage.content || "Message";
    }

    return preview;
  };

  // Get status icon for last message
  const getStatusIcon = () => {
    if (!chat.lastMessage || chat.lastMessage.senderId !== user?.id) {
      return null;
    }

    const { status } = chat.lastMessage;
    switch (status) {
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case "failed":
        return <div className="h-3 w-3 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };

  // Get typing indicator
  const getTypingIndicator = () => {
    if (!chat.isTyping || chat.typingUsers.length === 0) return null;

    if (isGroup) {
      const names = chat.typingUsers.map((u) => u.firstName).join(", ");
      return `${names} typing...`;
    } else {
      return "typing...";
    }
  };

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelection?.(chat.id);
    } else {
      onSelect?.(chat.id);
    }
  };

  const handlePin = async () => {
    try {
      if (chat.isPinned) {
        await unpinChat(chat.id);
      } else {
        await pinChat(chat.id);
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
    setIsMenuOpen(false);
  };

  const handleMute = async () => {
    try {
      if (chat.isMuted) {
        await unmuteChat(chat.id);
      } else {
        await muteChat(chat.id, 8 * 60 * 60 * 1000); // 8 hours
      }
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
    setIsMenuOpen(false);
  };

  const handleArchive = async () => {
    try {
      await archiveChat(chat.id);
    } catch (error) {
      console.error("Failed to archive chat:", error);
    }
    setIsMenuOpen(false);
  };

  const handleDelete = async () => {
    try {
      await deleteChat(chat.id);
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
    setIsMenuOpen(false);
  };

  const lastMessageIcon = chat.lastMessage?.type
    ? messageTypeIcons[chat.lastMessage.type]
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer transition-colors relative group",
        isSelected && "bg-accent",
        chat.isPinned && "bg-accent/30",
        className
      )}
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <div className="flex-shrink-0">
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
              isSelected
                ? "bg-primary border-primary"
                : "border-muted-foreground"
            )}
          >
            {isSelected && (
              <Check className="h-3 w-3 text-primary-foreground" />
            )}
          </div>
        </div>
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={chatAvatar} alt={chatName} />
          <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
        </Avatar>

        {/* Online indicator for direct chats */}
        {!isGroup && otherParticipant?.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
        )}

        {/* Unread count badge */}
        {chat.unreadCount > 0 && (
          <Badge
            variant="default"
            className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] text-xs px-1 flex items-center justify-center"
          >
            {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
          </Badge>
        )}
      </div>

      {/* Chat info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-medium text-sm truncate">{chatName}</h3>

            {/* Status indicators */}
            <div className="flex items-center gap-1 flex-shrink-0">
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

          {/* Timestamp */}
          {chat.lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatChatDate(chat.lastMessage.createdAt)}
            </span>
          )}
        </div>

        {/* Last message or typing indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Message status icon */}
            {getStatusIcon()}

            {/* Message type icon */}
            {lastMessageIcon &&
              React.createElement(lastMessageIcon, {
                className: "h-3 w-3 text-muted-foreground flex-shrink-0",
              })}

            {/* Message preview or typing indicator */}
            <p
              className={cn(
                "text-sm truncate",
                getTypingIndicator()
                  ? "text-green-600 dark:text-green-400 italic"
                  : chat.unreadCount > 0
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {getTypingIndicator() || getLastMessagePreview()}
            </p>
          </div>
        </div>
      </div>

      {/* More options (visible on hover) */}
      {!isSelectionMode && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handlePin}>
                <Pin className="h-4 w-4 mr-2" />
                {chat.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleMute}>
                {chat.isMuted ? (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Unmute
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 mr-2" />
                    Mute
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => {}}>
                <Star className="h-4 w-4 mr-2" />
                Add to favorites
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
