// src/app/chat/page.tsx
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
  const { chats, isLoading, error } = useChat();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");

  const chatList = Array.from(chats.values()).filter((chat) => {
    if (!searchQuery.trim()) return true;
    const chatName = getChatDisplayName(chat);
    return chatName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatDisplayName = (chat: any) => {
    if (chat.type === "group" || chat.isGroup) {
      return chat.name || "Group Chat";
    }
    // For direct chats, find the other participant
    const otherUser = chat.participants?.find((p: any) => p.id !== user?.id);
    return otherUser
      ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
          "Unknown User"
      : "Unknown User";
  };

  const getChatLastMessage = (chat: any) => {
    if (!chat.lastMessage) return "No messages yet";
    return chat.lastMessage.content || "Media message";
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleNewChat = () => {
    // For now, just navigate to a mock chat
    router.push("/chat/new");
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load chats</p>
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

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>
                      {getInitials(`${user?.firstName} ${user?.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // Add logout logic here
                    router.push("/login");
                  }}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-muted-foreground">
                  Loading chats...
                </span>
              </div>
            ) : chatList.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No chats yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start a conversation with your friends and family
                </p>
                <Button onClick={handleNewChat}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            ) : (
              chatList.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className="flex items-center space-x-3 p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={chat.avatar || chat.participants[0].avatar}
                      />
                      <AvatarFallback>
                        {getInitials(getChatDisplayName(chat))}
                      </AvatarFallback>
                    </Avatar>
                    {chat.isPinned && (
                      <Pin className="absolute -top-1 -right-1 h-3 w-3 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">
                        {getChatDisplayName(chat)}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {chat.lastMessage?.createdAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(chat.lastMessage.createdAt)
                            )}
                          </span>
                        )}
                        {chat.unreadCount > 0 && (
                          <Badge
                            variant="default"
                            className="h-5 min-w-[20px] text-xs"
                          >
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {getChatLastMessage(chat)}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pin className="h-4 w-4 mr-2" />
                        {chat.isPinned ? "Unpin" : "Pin"} Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
