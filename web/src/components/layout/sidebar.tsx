// src/components/layout/sidebar.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreVertical,
  Archive,
  Star,
  Settings,
  Users,
  Filter,
  Pin,
  Volume2,
  VolumeX,
  Trash2,
  MessageSquare,
  Clock,
} from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatListSkeleton } from "@/components/common/loading-spinner";
import { cn } from "@/lib/utils";
import { getInitials, formatDistanceToNow } from "@/lib/utils";
import type { ChatWithUsers } from "@/types/chat";

interface SidebarProps {
  className?: string;
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
  onSearch?: () => void;
}

type ChatFilter = "all" | "unread" | "pinned" | "archived" | "groups" | "starred";

export function Sidebar({
  className,
  onChatSelect,
  onNewChat,
  onSearch,
}: SidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    chats,
    currentChat,
    isLoading,
    setCurrentChat,
    getPinnedChats,
    getTotalUnreadCount,
    pinChat,
    unpinChat,
    muteChat,
    unmuteChat,
    deleteChat,
  } = useChat();
  const isMobile = useIsMobile();

  const [filter, setFilter] = useState<ChatFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Get filtered and sorted chats
  const filteredChats = useMemo(() => {
    let chatList = Array.from(chats.values());

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      chatList = chatList.filter((chat) => {
        const chatName = getChatDisplayName(chat);
        const lastMessage = chat.lastMessage?.content || "";
        return (
          chatName.toLowerCase().includes(query) ||
          lastMessage.toLowerCase().includes(query)
        );
      });
    }

    // Apply category filter
    switch (filter) {
      case "unread":
        chatList = chatList.filter((chat) => chat.unreadCount > 0);
        break;
      case "pinned":
        chatList = chatList.filter((chat) => chat.isPinned);
        break;
      case "archived":
        chatList = chatList.filter((chat) => chat.isArchived);
        break;
      case "groups":
        chatList = chatList.filter((chat) => chat.type === "group");
        break;
      // 'all' shows all non-archived chats
      case "all":
      default:
        chatList = chatList.filter((chat) => !chat.isArchived);
        break;
    }

    // Sort chats: pinned first, then by last message time
    return chatList.sort((a, b) => {
      // Pinned chats come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then sort by last message time
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [chats, searchQuery, filter]);

  // Get chat display name
  const getChatDisplayName = useCallback(
    (chat: ChatWithUsers): string => {
      if (chat.type === "group") {
        return chat.name || "Group Chat";
      }

      // For direct chats, find the other participant
      const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
      if (otherParticipant) {
        return `${otherParticipant.firstName} ${otherParticipant.lastName}`;
      }

      return "Unknown Contact";
    },
    [user?.id]
  );

  // Handle chat selection
  const handleChatSelect = useCallback(
    (chat: ChatWithUsers) => {
      if (isSelectionMode) {
        const newSelected = new Set(selectedChats);
        if (newSelected.has(chat.id)) {
          newSelected.delete(chat.id);
        } else {
          newSelected.add(chat.id);
        }
        setSelectedChats(newSelected);

        // Exit selection mode if no chats selected
        if (newSelected.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        setCurrentChat(chat);
        onChatSelect?.(chat.id);

        // Navigate to chat on mobile
        if (isMobile) {
          router.push(`/chat/${chat.id}`);
        }
      }
    },
    [
      isSelectionMode,
      selectedChats,
      setCurrentChat,
      onChatSelect,
      isMobile,
      router,
    ]
  );

  // Handle long press for selection mode
  const handleChatLongPress = useCallback(
    (chat: ChatWithUsers) => {
      if (!isSelectionMode) {
        setIsSelectionMode(true);
        setSelectedChats(new Set([chat.id]));
      }
    },
    [isSelectionMode]
  );

  // Bulk actions
  const handleBulkPin = useCallback(async () => {
    for (const chatId of selectedChats) {
      await pinChat(chatId);
    }
    setSelectedChats(new Set());
    setIsSelectionMode(false);
  }, [selectedChats, pinChat]);

  const handleBulkMute = useCallback(async () => {
    for (const chatId of selectedChats) {
      await muteChat(chatId);
    }
    setSelectedChats(new Set());
    setIsSelectionMode(false);
  }, [selectedChats, muteChat]);

  const handleBulkDelete = useCallback(async () => {
    for (const chatId of selectedChats) {
      await deleteChat(chatId);
    }
    setSelectedChats(new Set());
    setIsSelectionMode(false);
  }, [selectedChats, deleteChat]);

  // Exit selection mode on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedChats(new Set());
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSelectionMode]);

  const totalUnreadCount = getTotalUnreadCount();

  return (
    <aside
      className={cn(
        "flex flex-col bg-background border-r",
        "w-80 h-full", // Fixed width for desktop
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col p-4 border-b space-y-4">
        {/* Title and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold">Chats</h2>
            {totalUnreadCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] px-1">
                {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNewChat}
                  className="w-8 h-8"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/contacts")}>
                  <Users className="w-4 h-4 mr-2" />
                  New Group
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("starred")}>
                  <Star className="w-4 h-4 mr-2" />
                  Starred Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("archived")}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archived Chats
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            onClick={onSearch}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-1">
          {(["all", "unread", "pinned", "groups"] as ChatFilter[]).map(
            (filterOption) => (
              <Button
                key={filterOption}
                variant={filter === filterOption ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(filterOption)}
                className="h-7 px-2 text-xs"
              >
                {filterOption === "all" && "All"}
                {filterOption === "unread" && "Unread"}
                {filterOption === "pinned" && "Pinned"}
                {filterOption === "groups" && "Groups"}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedChats(new Set());
              }}
            >
              Cancel
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedChats.size} selected
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleBulkPin}>
                  <Pin className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pin Chats</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleBulkMute}>
                  <VolumeX className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mute Chats</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Chats</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <ChatListSkeleton count={8} />
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">
              {searchQuery ? "No chats found" : "No chats yet"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery
                ? "Try searching for a different term"
                : "Start a conversation with someone"}
            </p>
            {!searchQuery && (
              <Button onClick={onNewChat} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isSelected={selectedChats.has(chat.id)}
                isActive={currentChat?.id === chat.id}
                isSelectionMode={isSelectionMode}
                onClick={() => handleChatSelect(chat)}
                onLongPress={() => handleChatLongPress(chat)}
                getChatDisplayName={getChatDisplayName}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}

// Chat list item component
interface ChatListItemProps {
  chat: ChatWithUsers;
  isSelected: boolean;
  isActive: boolean;
  isSelectionMode: boolean;
  onClick: () => void;
  onLongPress: () => void;
  getChatDisplayName: (chat: ChatWithUsers) => string;
}

function ChatListItem({
  chat,
  isSelected,
  isActive,
  isSelectionMode,
  onClick,
  onLongPress,
  getChatDisplayName,
}: ChatListItemProps) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = useCallback(() => {
    setIsLongPressing(true);
    longPressTimeoutRef.current = setTimeout(() => {
      onLongPress();
      setIsLongPressing(false);
    }, 500);
  }, [onLongPress]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    if (isLongPressing) {
      onClick();
    }
    setIsLongPressing(false);
  }, [isLongPressing, onClick]);

  const handleMouseLeave = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    setIsLongPressing(false);
  }, []);

  const chatName = getChatDisplayName(chat);
  const lastMessage = chat.lastMessage;
  const isOnline = chat.type === "direct" && chat.participants[0]?.isOnline;

  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isActive && "bg-muted",
        isSelected && "bg-primary/10 border border-primary/20",
        isSelectionMode && "select-none"
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <div className="flex-shrink-0">
          <div
            className={cn(
              "w-4 h-4 rounded border transition-colors",
              isSelected
                ? "bg-primary border-primary"
                : "border-muted-foreground"
            )}
          >
            {isSelected && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 bg-primary-foreground rounded-full" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarImage src={chat.avatar || chat.participants[0]?.avatar} />
          <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
        </Avatar>

        {/* Online indicator */}
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        )}

        {/* Pinned indicator */}
        {chat.isPinned && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-muted rounded-full flex items-center justify-center">
            <Pin className="w-2 h-2 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium truncate">{chatName}</p>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {chat.isMuted && (
              <VolumeX className="w-3 h-3 text-muted-foreground" />
            )}
            {lastMessage && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastMessage.createdAt))}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {chat.isTyping ? (
              <p className="text-sm text-green-500 animate-pulse">typing...</p>
            ) : lastMessage ? (
              <p className="text-sm text-muted-foreground truncate">
                {lastMessage.type === "text"
                  ? lastMessage.content
                  : `📎 ${lastMessage.type}`}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No messages yet</p>
            )}
          </div>

          {/* Unread badge */}
          {chat.unreadCount > 0 && !chat.isMuted && (
            <Badge
              variant="default"
              className="h-5 min-w-[20px] px-1 text-xs bg-green-500 hover:bg-green-500"
            >
              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
