"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreVertical, Phone, Video, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatWithUsers } from "@/types/chat";
import type { User } from "@/types/user";

interface ChatHeaderProps {
  chat: ChatWithUsers | null;
  onCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  onChatInfo?: () => void;
}

export function ChatHeader({
  chat,
  onCall,
  onVideoCall,
  onSearch,
  onChatInfo,
}: ChatHeaderProps) {
  if (!chat) {
    return (
      <div className="h-16 border-b border-border bg-background flex items-center justify-center">
        <p className="text-muted-foreground">
          Select a chat to start messaging
        </p>
      </div>
    );
  }

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

  const getStatusText = () => {
    if (chat.type === "group") {
      return `${chat.participants.length} participants`;
    }
    // For direct chats, show online status or typing
    if (chat.isTyping) return "typing...";
    const otherParticipant = chat.participants.find(
      (p) => p.id !== chat.createdBy
    );
    return otherParticipant?.isOnline ? "online" : "last seen recently";
  };

  return (
    <div className="h-16 border-b border-border bg-background flex items-center justify-between px-4">
      {/* Left side - Avatar and info */}
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={getChatAvatar()} />
          <AvatarFallback className="bg-blue-600 text-white">
            {getChatName().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{getChatName()}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="sm" onClick={onCall}>
          <Phone className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onVideoCall}>
          <Video className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onSearch}>
          <Search className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onChatInfo}>Chat info</DropdownMenuItem>
            <DropdownMenuItem>Select messages</DropdownMenuItem>
            <DropdownMenuItem>Mute notifications</DropdownMenuItem>
            <DropdownMenuItem>Clear chat</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
