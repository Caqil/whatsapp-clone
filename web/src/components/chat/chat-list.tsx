"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { ChatItem } from "./chat-item";
import type { ChatWithUsers } from "@/types/chat";

interface ChatListProps {
  chats: ChatWithUsers[];
  selectedChatId?: string | null;
  isLoading?: boolean;
  onChatSelect?: (chat: ChatWithUsers) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ChatList({
  chats,
  selectedChatId,
  isLoading,
  onChatSelect,
  onLoadMore,
  hasMore,
}: ChatListProps) {
  if (isLoading && chats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading chats...</p>
        </div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">No chats yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Start a new conversation by clicking the new chat button
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sort chats: pinned first, then by last message time
  const sortedChats = [...chats].sort((a, b) => {
    // Pinned chats first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Then by last message time
    const aTime = a.lastMessage
      ? new Date(a.lastMessage.createdAt).getTime()
      : 0;
    const bTime = b.lastMessage
      ? new Date(b.lastMessage.createdAt).getTime()
      : 0;
    return bTime - aTime;
  });

  return (
    <div className="flex-1 flex flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-0">
          {sortedChats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChatId === chat.id}
              onClick={() => onChatSelect?.(chat)}
            />
          ))}

          {/* Load more button */}
          {hasMore && (
            <div className="p-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Load more chats"
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
