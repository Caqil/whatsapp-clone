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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials, formatDistanceToNow } from "@/lib/utils";

export default function MainChatPage() {
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
    if (chat.isGroup) {
      return chat.name || "Group Chat";
    }
    const otherUser = chat.participants?.find((p: any) => p.id !== user?.id);
    return otherUser
      ? `${otherUser.firstName} ${otherUser.lastName}`
      : "Unknown";
  };

  const getChatLastMessage = (chat: any) => {
    return chat.lastMessage?.content || "No messages yet";
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load chats</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Chat List Sidebar */}
      <div
        className={cn(
          "border-r bg-background flex flex-col",
          isMobile ? "w-full" : "w-80"
        )}
      >
        {/* Chat list header */}
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Chats</h1>
            <Button size="icon" variant="ghost">
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Chat list */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : chatList.length > 0 ? (
            <div className="p-2">
              {chatList.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center p-3 hover:bg-muted/50 rounded-lg cursor-pointer group"
                  onClick={() => handleChatClick(chat.id)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback>
                      {getInitials(getChatDisplayName(chat))}
                    </AvatarFallback>
                  </Avatar>

                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate">
                        {getChatDisplayName(chat)}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {chat.lastMessage &&
                          formatDistanceToNow(
                            new Date(chat.lastMessage.updatedAt)
                          )}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {getChatLastMessage(chat)}
                    </p>
                  </div>

                  {chat.unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {chat.unreadCount}
                    </Badge>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pin className="mr-2 h-4 w-4" />
                        Pin chat
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
          ) : (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start a new chat to begin messaging
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Content Area - Welcome Screen (Desktop only) */}
      {!isMobile && (
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center max-w-md px-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-primary" />
            </div>

            <h2 className="text-2xl font-semibold mb-4">
              Welcome to WhatsApp Web
            </h2>

            <p className="text-muted-foreground mb-6">
              Send and receive messages without keeping your phone online.
              Select a chat from the sidebar to start messaging.
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="p-3 bg-background rounded-lg">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p>Messages</p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p>Groups</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
