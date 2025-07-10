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
  const { user } = useAuth(); // ✅ Get user from auth
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

  const chatName = getChatDisplayName(chat, user); // ✅ Pass user parameter
  const chatAvatar = getChatAvatar(chat);
  const isGroup = chat.type === "group";

  // Get other participant for direct chats
  const otherParticipant = !isGroup
    ? chat.participants?.find((p) => p && p.id !== user?.id)
    : null;

  // Format participant count or online status
  const getSubtitle = () => {
    if (isGroup) {
      const participantCount = chat.participants?.length || 0;
      const onlineCount =
        chat.participants?.filter((p) => p?.isOnline)?.length || 0;

      if (chat.isTyping && chat.typingUsers?.length > 0) {
        const typingNames = chat.typingUsers.map((u) => u.firstName).join(", ");
        return `${typingNames} typing...`;
      }

      return `${participantCount} participants${
        onlineCount > 0 ? `, ${onlineCount} online` : ""
      }`;
    } else {
      if (chat.isTyping && chat.typingUsers?.length > 0) {
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
    onToggleSidebar?.();
  };

  return (
    <div
      className={cn(
        "h-16 border-b bg-background/95 backdrop-blur flex items-center px-4",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        {(isMobile || onBack) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack || (() => router.back())}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <Avatar className="h-10 w-10">
          <AvatarImage src={chatAvatar} />
          <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold truncate">{chatName}</h2>
            {chat.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
            {chat.isMuted && (
              <VolumeX className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {getSubtitle()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onSearch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search messages</TooltipContent>
          </Tooltip>
        )}

        {onCall && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onCall}>
                <Phone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voice call</TooltipContent>
          </Tooltip>
        )}

        {onVideoCall && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onVideoCall}>
                <Video className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Video call</TooltipContent>
          </Tooltip>
        )}

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
              Chat Info
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handlePin}>
              <Pin className="h-4 w-4 mr-2" />
              {chat.isPinned ? "Unpin Chat" : "Pin Chat"}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleMute}>
              {chat.isMuted ? (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Unmute Chat
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Mute Chat
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Star className="h-4 w-4 mr-2" />
              Star Chat
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive Chat
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleCopyId}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Chat ID
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
