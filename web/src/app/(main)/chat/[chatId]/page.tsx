"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { getChat } = useChat();

  const chatId = params.chatId as string;
  const chat = getChat(chatId);

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

  const chatName = chat.isGroup ? chat.name : "John Doe"; // Replace with actual logic

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
            <p className="text-xs text-muted-foreground">Online</p>
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
