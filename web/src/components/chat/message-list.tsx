// src/components/chat/message-list.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { Loader2, ArrowDown, AlertCircle } from "lucide-react";
import { useMessages } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageItem } from "./message-item";
import { TypingIndicator } from "./typing-indicator";
import { cn } from "@/lib/utils";
import type { MessageWithUser, ReactionType } from "@/types/message";
import type { ChatWithUsers } from "@/types/chat";

interface MessageListProps {
  chat: ChatWithUsers;
  onReply?: (message: MessageWithUser) => void;
  onForward?: (messageIds: string[]) => void;
  onEditMessage?: (message: MessageWithUser) => void;
  className?: string;
}

interface MessageGroup {
  date: string;
  messages: MessageWithUser[];
}

const MESSAGE_GROUP_TIME_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const SCROLL_THRESHOLD = 100;
const LOAD_MORE_THRESHOLD = 200;

export function MessageList({
  chat,
  onReply,
  onForward,
  onEditMessage,
  className,
}: MessageListProps) {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    hasMore,
    typingUsers,
    loadMessages,
    loadMoreMessages,
    markAsRead,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
  } = useMessages();

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(
    null
  );
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const scrollElementRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  // Get chat messages
  const chatMessages = useMemo(() => {
    return Array.from(messages.values())
      .filter((msg) => msg.chatId === chat.id)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [messages, chat.id]);

  // Group messages by date and sender
  const messageGroups = useMemo((): MessageGroup[] => {
    if (!chatMessages.length) return [];

    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;

    chatMessages.forEach((message) => {
      const messageDate = new Date(message.createdAt);
      const dateKey = format(messageDate, "yyyy-MM-dd");

      // Check if we need a new date group
      if (!currentGroup || currentGroup.date !== dateKey) {
        currentGroup = {
          date: dateKey,
          messages: [],
        };
        groups.push(currentGroup);
      }

      currentGroup.messages.push(message);
    });

    return groups;
  }, [chatMessages]);

  // Get formatted date label
  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMMM d, yyyy");
    }
  };

  // Check if messages should be grouped (same sender, within time threshold)
  const shouldGroupMessages = (
    prevMessage: MessageWithUser | null,
    currentMessage: MessageWithUser
  ) => {
    if (!prevMessage || !currentMessage) return false;
    if (prevMessage.senderId !== currentMessage.senderId) return false;
    if (prevMessage.isDeleted || currentMessage.isDeleted) return false;

    const timeDiff =
      new Date(currentMessage.createdAt).getTime() -
      new Date(prevMessage.createdAt).getTime();
    return timeDiff < MESSAGE_GROUP_TIME_THRESHOLD;
  };

  // Load messages when chat changes
  useEffect(() => {
    if (chat.id) {
      loadMessages(chat.id);
    }
  }, [chat.id, loadMessages]);

  // Set up intersection observer for read receipts
  useEffect(() => {
    if (!scrollElementRef.current) return;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute("data-message-id");
            if (messageId) {
              markAsRead(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, [markAsRead]);

  // Observe message elements for read receipts
  useEffect(() => {
    const observer = intersectionObserverRef.current;
    if (!observer) return;

    const messageElements =
      scrollElementRef.current?.querySelectorAll("[data-message-id]");
    messageElements?.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      messageElements?.forEach((element) => {
        observer.unobserve(element);
      });
    };
  }, [chatMessages]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Update scroll to bottom button visibility
    const atBottom = distanceFromBottom < SCROLL_THRESHOLD;
    setIsAtBottom(atBottom);
    setShowScrollToBottom(!atBottom && chatMessages.length > 0);

    // Load more messages when near top
    if (scrollTop < LOAD_MORE_THRESHOLD && hasMore && !isLoadingMore) {
      handleLoadMore();
    }
  }, [chatMessages.length, hasMore, isLoadingMore]);

  // Load more messages
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      await loadMoreMessages();
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, loadMoreMessages]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll to bottom for new messages (only if user is at bottom)
  useEffect(() => {
    if (isAtBottom && chatMessages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [chatMessages.length, isAtBottom]);

  // Handle message reactions
  const handleReaction = async (messageId: string, reaction: ReactionType) => {
    try {
      const message = chatMessages.find((m) => m.id === messageId);
      if (!message) return;

      const existingReaction = message.reactions.find(
        (r) => r.userId === user?.id
      );

      if (existingReaction?.reaction === reaction) {
        await removeReaction(messageId);
      } else {
        await addReaction(messageId, reaction);
      }
    } catch (error) {
      console.error("Failed to handle reaction:", error);
    }
  };

  // Handle message editing
  const handleEdit = async (message: MessageWithUser) => {
    onEditMessage?.(message);
  };

  // Handle message deletion
  const handleDelete = async (messageId: string, deleteForEveryone = false) => {
    try {
      await deleteMessage(messageId, deleteForEveryone);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  // Render empty state
  if (!chatMessages.length && !isLoading) {
    return (
      <div
        className={cn("flex-1 flex items-center justify-center p-8", className)}
      >
        <div className="text-center">
          <div className="text-muted-foreground mb-2">No messages yet</div>
          <div className="text-sm text-muted-foreground">
            Start the conversation by sending a message
          </div>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoading && !chatMessages.length) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col relative", className)}>
      {/* Messages container */}
      <div
        ref={scrollElementRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        onScroll={handleScroll}
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading more messages...</span>
            </div>
          </div>
        )}

        {/* Error indicator */}
        {!hasMore && chatMessages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to load messages</span>
            </div>
          </div>
        )}

        {/* Message groups */}
        {messageGroups.map((group) => (
          <div key={group.date} className="space-y-1">
            {/* Date separator */}
            <div className="flex items-center justify-center py-4">
              <Badge variant="secondary" className="px-3 py-1 text-xs">
                {getDateLabel(group.date)}
              </Badge>
            </div>

            {/* Messages in group */}
            {group.messages.map((message, messageIndex) => {
              const prevMessage =
                messageIndex > 0 ? group.messages[messageIndex - 1] : null;
              const isGrouped = shouldGroupMessages(prevMessage, message);
              const isLastInGroup =
                messageIndex === group.messages.length - 1 ||
                !shouldGroupMessages(message, group.messages[messageIndex + 1]);

              return (
                <div
                  key={message.id}
                  data-message-id={message.id}
                  ref={
                    messageIndex === group.messages.length - 1
                      ? lastMessageRef
                      : undefined
                  }
                >
                  <MessageItem
                    message={message}
                    isGrouped={isGrouped}
                    showAvatar={!isGrouped || isLastInGroup}
                    showTimestamp={!isGrouped || isLastInGroup}
                    onReply={onReply}
                    onEdit={handleEdit}
                    onForward={onForward}
                    onDelete={handleDelete}
                    onReaction={handleReaction}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="px-4 py-2">
            <TypingIndicator
              users={Array.from(typingUsers)}
              chatType={chat.type}
            />
          </div>
        )}

        {/* Bottom anchor */}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            size="icon"
            onClick={scrollToBottom}
            className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>

          {/* Unread count badge */}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 min-w-[1.25rem] text-xs px-1 flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
