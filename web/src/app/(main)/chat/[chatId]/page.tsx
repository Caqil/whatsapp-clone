"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Phone, Video, MoreVertical, Loader2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { getChat } = useChat();

  const chatId = params.chatId as string;
  const chat = getChat(chatId);

  // Loading state when user is not yet loaded
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Chat not found
  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Chat not found</p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Helper function to get chat display name with proper null safety
  const getChatDisplayName = () => {
    // Early return if user is not loaded
    if (!user?.id) {
      return "Loading...";
    }

    // For group chats
    if (chat.type === "group" || chat.isGroup) {
      return chat.name || "Group Chat";
    }

    // For direct chats, find the other participant
    const otherUser = chat.participants?.find((p: any) => p.id !== user.id);

    return otherUser
      ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
          "Unknown User"
      : "Unknown User";
  };

  // Helper function to get chat status/subtitle
  const getChatStatus = () => {
    if (!user?.id) {
      return "Loading...";
    }

    if (chat.type === "group" || chat.isGroup) {
      const participantCount = chat.participants?.length || 0;
      const onlineCount =
        chat.participants?.filter((p: any) => p.isOnline)?.length || 0;

      if (chat.isTyping && chat.typingUsers?.length > 0) {
        const typingNames = chat.typingUsers
          .map((u: any) => u.firstName)
          .join(", ");
        return `${typingNames} typing...`;
      }

      return `${participantCount} participants${
        onlineCount > 0 ? `, ${onlineCount} online` : ""
      }`;
    } else {
      const otherUser = chat.participants?.find((p: any) => p.id !== user.id);

      if (chat.isTyping && chat.typingUsers?.length > 0) {
        return "typing...";
      }

      if (otherUser?.isOnline) {
        return "online";
      }

      if (otherUser?.lastSeen) {
        return `last seen ${new Date(otherUser.lastSeen).toLocaleString()}`;
      }

      return "offline";
    }
  };

  const chatName = getChatDisplayName();
  const chatStatus = getChatStatus();

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
            <AvatarImage src={chat.avatar} />
            <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h2 className="font-medium text-sm truncate">{chatName}</h2>
            <p className="text-xs text-muted-foreground">{chatStatus}</p>
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
      <div className="flex-1 p-4 overflow-auto">
        <div className="text-center text-muted-foreground">
          Chat messages will appear here
        </div>
      </div>

      {/* Message input */}
      <div className="border-t p-4">
        <div className="text-center text-muted-foreground text-sm">
          Message input component will go here
        </div>
      </div>
    </div>
  );
}
