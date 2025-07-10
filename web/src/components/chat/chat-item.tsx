"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Check, CheckCheck, Mic, Image, FileText, Video } from "lucide-react";
import type { ChatWithUsers } from "@/types/chat";
import type { MessageType } from "@/types/message";

interface ChatItemProps {
  chat: ChatWithUsers;
  isSelected?: boolean;
  onClick?: () => void;
}

export function ChatItem({ chat, isSelected, onClick }: ChatItemProps) {
  const getChatName = () => {
    if (chat.type === "group") {
      return chat.name || "Group Chat";
    }
    // For direct chats, get the other participant
    const otherParticipant = chat.participants.find(
      (p) => p.id !== chat.createdBy
    );
    return otherParticipant
      ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
      : "Unknown";
  };

  const getChatAvatar = () => {
    if (chat.avatar) return chat.avatar;
    if (chat.type === "group") return "";
    const otherParticipant = chat.participants.find(
      (p) => p.id !== chat.createdBy
    );
    return otherParticipant?.avatar || "";
  };

  const getLastMessagePreview = () => {
    if (!chat.lastMessage) return "No messages yet";

    const message = chat.lastMessage;
    const isOwn = message.senderId === chat.createdBy; // Simplified check

    let preview = "";
    if (isOwn) preview += "You: ";

    switch (message.type) {
      case "text":
        preview += message.content;
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
      case "document":
        preview += "📄 Document";
        break;
      case "file":
        preview += "📎 File";
        break;
      default:
        preview += message.content;
    }

    return preview;
  };

  const getLastMessageTime = () => {
    if (!chat.lastMessage) return "";

    const messageDate = new Date(chat.lastMessage.createdAt);
    const now = new Date();
    const diffInHours =
      (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getMessageStatusIcon = () => {
    if (!chat.lastMessage) return null;

    const message = chat.lastMessage;
    const isOwn = message.senderId === chat.createdBy; // Simplified check

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

  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50",
        isSelected &&
          "bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-600"
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={getChatAvatar()} />
          <AvatarFallback className="bg-blue-600 text-white text-sm">
            {getChatName().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {chat.isPinned && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm truncate pr-2">
            {getChatName()}
          </h3>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {getMessageStatusIcon()}
            <span>{getLastMessageTime()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate pr-2">
            {chat.isTyping ? (
              <span className="text-blue-600">typing...</span>
            ) : (
              getLastMessagePreview()
            )}
          </p>

          <div className="flex items-center space-x-2">
            {chat.isMuted && (
              <div className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                <span className="text-xs">🔇</span>
              </div>
            )}
            {chat.unreadCount > 0 && (
              <Badge
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-xs min-w-[1.25rem] h-5 rounded-full px-1.5"
              >
                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
