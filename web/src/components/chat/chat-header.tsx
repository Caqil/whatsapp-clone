// src/components/chat/chat-header.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Video,
  Search,
  MoreVertical,
  Pin,
  Volume2,
  VolumeX,
  Archive,
  Trash2,
  Users,
  Info,
  Copy,
  Star,
  Settings,
} from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getInitials, formatLastSeen } from "@/lib/utils";
import type { ChatWithUsers } from "@/types/chat";

interface ChatHeaderProps {
  chat: ChatWithUsers;
  onBack?: () => void;
  onSearch?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onToggleSidebar?: () => void;
  className?: string;
}

export function ChatHeader({
  chat,
  onBack,
  onSearch,
  onCall,
  onVideoCall,
  onToggleSidebar,
  className,
}: ChatHeaderProps) {
  const router = useRouter();
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
  const isMobile = useIsMobile();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const chatName = getChatDisplayName(chat);
  const chatAvatar = getChatAvatar(chat);
  const isGroup = chat.type === "group";

  // Get other participant for direct chats
  const otherParticipant = !isGroup
    ? chat.participants.find((p) => p.id !== user?.id)
    : null;

  // Format participant count or online status
  const getSubtitle = () => {
    if (isGroup) {
      const participantCount = chat.participants.length;
      const onlineCount = chat.participants.filter((p) => p.isOnline).length;

      if (chat.isTyping && chat.typingUsers.length > 0) {
        const typingNames = chat.typingUsers.map((u) => u.firstName).join(", ");
        return `${typingNames} typing...`;
      }

      return `${participantCount} participants${
        onlineCount > 0 ? `, ${onlineCount} online` : ""
      }`;
    } else {
      if (chat.isTyping && chat.typingUsers.length > 0) {
        return "typing...";
      }

      if (otherParticipant?.isOnline) {
        return "online";
      }

      if (otherParticipant?.lastSeen) {
        return `last seen ${formatLastSeen(otherParticipant.lastSeen)}`;
      }

      return "offline";
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
  };

  const handleArchive = async () => {
    try {
      await archiveChat(chat.id);
      if (isMobile && onBack) {
        onBack();
      }
    } catch (error) {
      console.error("Failed to archive chat:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteChat(chat.id);
      if (isMobile && onBack) {
        onBack();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(chat.id);
  };

  const handleInfo = () => {
    // Open chat info sidebar or modal
    onToggleSidebar?.();
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      {/* Left section - Back button and chat info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <button
          onClick={handleInfo}
          className="flex items-center gap-3 min-w-0 hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors"
        >
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={chatAvatar} alt={chatName} />
              <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
            </Avatar>
            {!isGroup && otherParticipant?.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm truncate">{chatName}</h2>
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
            <p
              className={cn(
                "text-xs truncate transition-colors",
                chat.isTyping && chat.typingUsers.length > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
              )}
            >
              {getSubtitle()}
            </p>
          </div>
        </button>
      </div>

      {/* Right section - Action buttons */}
      <div className="flex items-center gap-1">
        {/* Call buttons */}
        {!isGroup && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCall}
                  disabled={!onCall}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Voice call</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onVideoCall}
                  disabled={!onVideoCall}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Video call</TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Search button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearch}
              disabled={!onSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search in conversation</TooltipContent>
        </Tooltip>

        {/* More options */}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleInfo}>
              <Info className="h-4 w-4 mr-2" />
              Chat info
            </DropdownMenuItem>

            {isGroup && (
              <DropdownMenuItem onClick={() => {}}>
                <Users className="h-4 w-4 mr-2" />
                Manage members
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={handlePin}>
              <Pin className="h-4 w-4 mr-2" />
              {chat.isPinned ? "Unpin chat" : "Pin chat"}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleMute}>
              {chat.isMuted ? (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Unmute notifications
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Mute notifications
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
              Archive chat
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleCopyId}>
              <Copy className="h-4 w-4 mr-2" />
              Copy chat ID
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
