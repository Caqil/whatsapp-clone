"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Phone, Video, MoreVertical, Loader2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { ChatWithUsers } from "@/types/chat";
import { User } from "@/types/user";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { getChatById, isLoading, error, selectChatById } = useChat();

  const chatId = params.chatId as string;
  const [chat, setChat] = useState<ChatWithUsers | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);

  // Load the specific chat
  useEffect(() => {
    const loadChat = async () => {
      if (!chatId) return;

      try {
        setIsLoadingChat(true);

        // First try to get chat from local state
        const localChat = getChatById(chatId);

        if (localChat) {
          setChat(localChat);
          setIsLoadingChat(false);
        } else {
          // If not found locally, try to load it from API
          await selectChatById(chatId);
          const updatedChat = getChatById(chatId);
          setChat(updatedChat);
          setIsLoadingChat(false);
        }
      } catch (error) {
        console.error("Failed to load chat:", error);
        setIsLoadingChat(false);
      }
    };

    loadChat();
  }, [chatId, getChatById, selectChatById]);

  // Update chat when it changes in the store
  useEffect(() => {
    if (chatId) {
      const updatedChat = getChatById(chatId);
      setChat(updatedChat);
    }
  }, [chatId, getChatById]);

  // Get chat display name
  const getChatDisplayName = (chat: ChatWithUsers, user: User | null) => {
    // Early return if user is not available
    if (!user?.id) {
      return "Loading...";
    }

    if (chat.type === "group") {
      return chat.name || "Group Chat";
    }

    // For direct chats, find the other participant with full safety checks
    const otherUser = chat.participants?.find((p: any) => {
      return p && typeof p === "object" && p.id && p.id !== user.id;
    });

    if (!otherUser) {
      return "Direct Chat";
    }

    const displayName = `${otherUser.firstName || ""} ${
      otherUser.lastName || ""
    }`.trim();
    return displayName || otherUser.username || "Unknown User";
  };

  // Get chat avatar
  const getChatAvatar = (chat: any) => {
    if (!chat) return "";

    if (chat.avatar) return chat.avatar;

    if (chat.type === "group" || chat.isGroup) {
      return "/images/group-avatar.png"; // Default group avatar
    }

    // For direct chats, use other participant's avatar
    const otherUser = chat.participants?.find((p: any) => p.id !== user?.id);
    return otherUser?.avatar || "/images/default-avatar.png";
  };

  // Loading state
  if (isLoadingChat || isLoading) {
    return (
      <div className="h-full flex flex-col">
        {/* Header skeleton */}
        <div className="h-16 border-b bg-background/95 backdrop-blur flex items-center px-4">
          <div className="flex items-center gap-3 flex-1">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>

        {/* Loading content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load chat</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  // Chat not found
  if (!chat) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Chat not found</p>
          <p className="text-muted-foreground text-sm mb-4">
            The chat you're looking for doesn't exist or has been deleted.
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const chatName = getChatDisplayName(chat, user);
  const chatAvatar = getChatAvatar(chat);

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="h-16 border-b bg-background/95 backdrop-blur flex items-center px-4">
        <div className="flex items-center gap-3 flex-1">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <Avatar className="h-10 w-10">
            <AvatarImage src={chatAvatar} />
            <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h2 className="font-medium text-sm truncate">{chatName}</h2>
            <p className="text-xs text-muted-foreground">
              {chat.type === "group"
                ? `${chat.participants?.length || 0} participants`
                : "Online"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-auto">
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="mb-4">
              <Avatar className="h-20 w-20 mx-auto mb-4">
                <AvatarImage src={chatAvatar} />
                <AvatarFallback className="text-2xl">
                  {getInitials(chatName)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-medium text-foreground">
                {chatName}
              </h3>
              <p className="text-sm">
                {chat.type === "group"
                  ? "Start your group conversation"
                  : "Start your conversation"}
              </p>
            </div>
            <p className="text-sm">Chat messages will appear here</p>
          </div>
        </div>
      </div>

      {/* Message input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full px-4 py-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full bg-transparent border-none outline-none text-sm"
            />
          </div>
          <Button size="icon" className="rounded-full">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
