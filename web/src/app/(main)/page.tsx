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
  VolumeX,
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
  const { chats, isLoading, error, getChatDisplayName, getChatAvatar } =
    useChat();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");

  const chatList = Array.from(chats.values()).filter((chat) => {
    if (!searchQuery.trim()) return true;
    const chatName = getChatDisplayName(chat); // ✅ Pass user parameter
    return chatName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatLastMessage = (chat: any) => {
    if (!chat.lastMessage) return "No messages yet";

    const { lastMessage } = chat;
    const isOwn = lastMessage.senderId === user?.id;

    if (lastMessage.type === "text") {
      return lastMessage.content || "Message";
    }

    // Handle different message types
    const typeLabels = {
      image: "📷 Image",
      video: "🎥 Video",
      audio: "🎵 Audio",
      file: "📎 File",
      document: "📄 Document",
      location: "📍 Location",
      contact: "👤 Contact",
    };

    return typeLabels[lastMessage.type as keyof typeof typeLabels] || "Message";
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleNewChat = () => {
    // Navigate to new chat creation
    router.push("/chat/new");
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
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Chats</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNewChat}>
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Users className="h-4 w-4 mr-2" />
                    New Group
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archived
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search */}
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : chatList.length === 0 ? (
            <div className="text-center p-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">
                {searchQuery ? "No chats found" : "No chats yet"}
              </p>
              {!searchQuery && (
                <Button variant="outline" onClick={handleNewChat}>
                  Start a conversation
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {chatList.map((chat) => {
                const chatName = getChatDisplayName(chat); // ✅ Pass user parameter
                const chatAvatar = getChatAvatar(chat);
                const lastMessage = getChatLastMessage(chat);
                const isGroup = chat.type === "group";

                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatClick(chat.id)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={chatAvatar} />
                        <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
                      </Avatar>
                      {/* Online indicator for direct chats */}
                      {!isGroup && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate flex items-center gap-2">
                          {chatName}
                          {chat.isPinned && (
                            <Pin className="h-3 w-3 text-muted-foreground" />
                          )}
                        </h3>
                        {chat.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(chat.lastMessage.createdAt)
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                          {chat.isTyping ? (
                            <span className="text-green-500 italic">
                              typing...
                            </span>
                          ) : (
                            lastMessage
                          )}
                        </p>

                        <div className="flex items-center gap-1">
                          {chat.isMuted && (
                            <VolumeX className="h-3 w-3 text-muted-foreground" />
                          )}
                          {chat.unreadCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="h-5 min-w-[20px] text-xs"
                            >
                              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Empty State */}
      {!isMobile && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Select a chat</h2>
            <p className="text-muted-foreground mb-4">
              Choose a conversation to start messaging
            </p>
            <Button onClick={handleNewChat}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
