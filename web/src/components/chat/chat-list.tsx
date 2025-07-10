// src/components/chat/chat-list.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Archive,
  Star,
  Users,
  MessageSquare,
  Check,
  X,
  Pin,
  VolumeX,
  Trash2,
  Loader2,
} from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import { ChatItem } from "./chat-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatWithUsers } from "@/types/chat";

interface ChatListProps {
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
  onSearch?: () => void;
  selectedChatId?: string;
  className?: string;
}

type ChatFilter =
  | "all"
  | "unread"
  | "pinned"
  | "archived"
  | "groups"
  | "direct";
type SortOption = "recent" | "name" | "unread";

export function ChatList({
  onChatSelect,
  onNewChat,
  onSearch,
  selectedChatId,
  className,
}: ChatListProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    chats,
    isLoading,
    loadChats,
    searchChats,
    getChatDisplayName,
    getPinnedChats,
    getTotalUnreadCount,
  } = useChat();
  const isMobile = useIsMobile();

  const [filter, setFilter] = useState<ChatFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Filter and sort chats
  const filteredAndSortedChats = useMemo(() => {
    let chatList = Array.from(chats.values());

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      chatList = chatList.filter((chat) => {
        const chatName = getChatDisplayName(chat).toLowerCase();
        const lastMessage = chat.lastMessage?.content?.toLowerCase() || "";
        const participantNames = chat.participants
          .map((p) => `${p.firstName} ${p.lastName}`.toLowerCase())
          .join(" ");

        return (
          chatName.includes(query) ||
          lastMessage.includes(query) ||
          participantNames.includes(query)
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
      case "direct":
        chatList = chatList.filter((chat) => chat.type === "direct");
        break;
      case "all":
      default:
        chatList = chatList.filter((chat) => !chat.isArchived);
        break;
    }

    // Sort chats
    switch (sortBy) {
      case "name":
        chatList.sort((a, b) =>
          getChatDisplayName(a).localeCompare(getChatDisplayName(b))
        );
        break;
      case "unread":
        chatList.sort((a, b) => b.unreadCount - a.unreadCount);
        break;
      case "recent":
      default:
        chatList.sort((a, b) => {
          // Pinned chats always come first
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;

          // Then sort by last message time
          const aTime = a.lastMessage?.createdAt || a.updatedAt;
          const bTime = b.lastMessage?.createdAt || b.updatedAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
        break;
    }

    return chatList;
  }, [chats, searchQuery, filter, sortBy, getChatDisplayName]);

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedChats(new Set());
  };

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    if (isSelectionMode) {
      toggleChatSelection(chatId);
    } else {
      onChatSelect?.(chatId);
    }
  };

  // Toggle chat selection in selection mode
  const toggleChatSelection = (chatId: string) => {
    setSelectedChats((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  // Select all chats
  const selectAllChats = () => {
    const allChatIds = filteredAndSortedChats.map((chat) => chat.id);
    setSelectedChats(new Set(allChatIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedChats(new Set());
  };

  // Bulk actions
  const handleBulkPin = () => {
    // Implement bulk pin logic
    console.log("Bulk pin:", Array.from(selectedChats));
    setIsSelectionMode(false);
    setSelectedChats(new Set());
  };

  const handleBulkMute = () => {
    // Implement bulk mute logic
    console.log("Bulk mute:", Array.from(selectedChats));
    setIsSelectionMode(false);
    setSelectedChats(new Set());
  };

  const handleBulkArchive = () => {
    // Implement bulk archive logic
    console.log("Bulk archive:", Array.from(selectedChats));
    setIsSelectionMode(false);
    setSelectedChats(new Set());
  };

  const handleBulkDelete = () => {
    // Implement bulk delete logic
    console.log("Bulk delete:", Array.from(selectedChats));
    setIsSelectionMode(false);
    setSelectedChats(new Set());
  };

  const totalUnreadCount = getTotalUnreadCount();

  if (isLoading && chats.size === 0) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading chats...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            Chats
            {totalUnreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {totalUnreadCount}
              </Badge>
            )}
          </h1>

          <div className="flex items-center gap-1">
            {/* New chat button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onNewChat}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>

            {/* Filter menu */}
            <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter chats</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuCheckboxItem
                  checked={filter === "all"}
                  onCheckedChange={() => setFilter("all")}
                >
                  All chats
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                  checked={filter === "unread"}
                  onCheckedChange={() => setFilter("unread")}
                >
                  Unread
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                  checked={filter === "pinned"}
                  onCheckedChange={() => setFilter("pinned")}
                >
                  Pinned
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                  checked={filter === "groups"}
                  onCheckedChange={() => setFilter("groups")}
                >
                  Groups
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                  checked={filter === "direct"}
                  onCheckedChange={() => setFilter("direct")}
                >
                  Direct chats
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                  checked={filter === "archived"}
                  onCheckedChange={() => setFilter("archived")}
                >
                  Archived
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>

                <DropdownMenuCheckboxItem
                  checked={sortBy === "recent"}
                  onCheckedChange={() => setSortBy("recent")}
                >
                  Recent activity
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                  checked={sortBy === "name"}
                  onCheckedChange={() => setSortBy("name")}
                >
                  Name
                </DropdownMenuCheckboxItem>

                <DropdownMenuCheckboxItem
                  checked={sortBy === "unread"}
                  onCheckedChange={() => setSortBy("unread")}
                >
                  Unread count
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleSelectionMode}>
                  <Check className="h-4 w-4 mr-2" />
                  Select chats
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setFilter("archived")}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archived chats
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setFilter("pinned")}>
                  <Star className="h-4 w-4 mr-2" />
                  Starred chats
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selection mode header */}
        {isSelectionMode && (
          <div className="flex items-center justify-between mt-3 p-2 bg-accent rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedChats.size} selected
              </span>
              {selectedChats.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              )}
              {selectedChats.size < filteredAndSortedChats.length && (
                <Button variant="ghost" size="sm" onClick={selectAllChats}>
                  Select all
                </Button>
              )}
            </div>

            <Button variant="ghost" size="icon" onClick={toggleSelectionMode}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Bulk actions */}
        {isSelectionMode && selectedChats.size > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Button variant="outline" size="sm" onClick={handleBulkPin}>
              <Pin className="h-3 w-3 mr-1" />
              Pin
            </Button>

            <Button variant="outline" size="sm" onClick={handleBulkMute}>
              <VolumeX className="h-3 w-3 mr-1" />
              Mute
            </Button>

            <Button variant="outline" size="sm" onClick={handleBulkArchive}>
              <Archive className="h-3 w-3 mr-1" />
              Archive
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1">
        {filteredAndSortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">
              {searchQuery ? "No chats found" : "No chats yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Start a conversation to see your chats here"}
            </p>
            {!searchQuery && (
              <Button onClick={onNewChat}>
                <Plus className="h-4 w-4 mr-2" />
                Start new chat
              </Button>
            )}
          </div>
        ) : (
          <div className="pb-4">
            {filteredAndSortedChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isSelected={selectedChatId === chat.id}
                isSelectionMode={isSelectionMode}
                onSelect={handleChatSelect}
                onToggleSelection={toggleChatSelection}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Filter indicator */}
      {filter !== "all" && (
        <div className="flex-shrink-0 p-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {filter} chats ({filteredAndSortedChats.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("all")}
              className="h-6 text-xs"
            >
              Show all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
