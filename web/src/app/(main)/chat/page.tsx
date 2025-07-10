// src/app/(main)/chat/page.tsx - Fixed navigation
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  MessageSquare,
  Users,
  MoreVertical,
  Pin,
  Archive,
  Trash2,
  Phone,
  Video,
  Loader2,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials, formatDistanceToNow } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/constants";

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const { chats, isLoading, error,loadChats, getChatDisplayName } = useChat();
  // Load chats when component mounts
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const chatList = Array.from(chats.values()).filter((chat) => {
    if (!searchQuery.trim()) return true;
    const chatName = getChatDisplayName(chat);
    return chatName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatLastMessage = (chat: any) => {
    if (!chat.lastMessage) return "No messages yet";
    return chat.lastMessage.content || "Media message";
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleNewChat = () => {
    // FIXED: Navigate to proper new chat page instead of /chat/new
    router.push("/chat/new");
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load chats</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">{APP_CONFIG.NAME}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleNewChat} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleNewChat}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  New Chat
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
                  New Group
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="mr-2 h-4 w-4" />
                  Archived
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="container mx-auto px-4 pb-4">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-lg">
                <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : chatList.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No chats yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a conversation by creating a new chat
            </p>
            <Button onClick={handleNewChat}>
              <Plus className="h-4 w-4 mr-2" />
              Start New Chat
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {chatList.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors",
                  "hover:bg-muted/50"
                )}
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback>
                      {getInitials(getChatDisplayName(chat))}
                    </AvatarFallback>
                  </Avatar>
                  {chat.isPinned && (
                    <Pin className="h-3 w-3 absolute -top-1 -right-1 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium truncate">
                      {getChatDisplayName(chat)}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {chat.lastMessage?.createdAt &&
                        formatDistanceToNow(
                          new Date(chat.lastMessage.createdAt)
                        )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">
                      {getChatLastMessage(chat)}
                    </p>
                    <div className="flex items-center gap-1">
                      {chat.isMuted && (
                        <div className="h-4 w-4 text-muted-foreground">🔇</div>
                      )}
                      {chat.unreadCount > 0 && (
                        <Badge variant="default" className="h-5 px-2 text-xs">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pin className="mr-2 h-4 w-4" />
                      {chat.isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
