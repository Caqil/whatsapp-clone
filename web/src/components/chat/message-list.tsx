'use client';

import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowDown } from 'lucide-react';
import { MessageItem } from './message-item';
import { TypingIndicator } from './typing-indicator';
import type { MessageWithUser, ReactionType } from '@/types/message';

interface MessageListProps {
  messages: MessageWithUser[];
  isLoading?: boolean;
  hasMore?: boolean;
  currentUserId?: string;
  typingUsers?: string[];
  onLoadMore?: () => void;
  onReply?: (message: MessageWithUser) => void;
  onForward?: (message: MessageWithUser) => void;
  onEdit?: (message: MessageWithUser) => void;
  onDelete?: (message: MessageWithUser) => void;
  onReaction?: (messageId: string, reaction: ReactionType) => void;
  onScrollToBottom?: () => void;
}

export function MessageList({
  messages,
  isLoading,
  hasMore,
  currentUserId,
  typingUsers = [],
  onLoadMore,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  onScrollToBottom
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Handle scroll events
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShowScrollButton(!isAtBottom);

    // Load more messages when scrolled to top
    if (target.scrollTop === 0 && hasMore && !isLoading) {
      onLoadMore?.();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    onScrollToBottom?.();
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">💬</span>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">No messages yet</h3>
            <p className="text-sm text-muted-foreground">
              Send a message to start the conversation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, MessageWithUser[]>);

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateString === today) return 'Today';
    if (dateString === yesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex-1 relative flex flex-col">
      <ScrollArea 
        className="flex-1" 
        ref={scrollAreaRef}
        onScrollCapture={handleScroll}
      >
        <div className="min-h-full flex flex-col">
          {/* Load more indicator */}
          {hasMore && (
            <div className="p-4 text-center">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  className="text-muted-foreground"
                >
                  Load earlier messages
                </Button>
              )}
            </div>
          )}

          {/* Messages grouped by date */}
          <div className="flex-1 pb-4">
            {Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date} className="space-y-1">
                {/* Date header */}
                <div className="text-center py-2">
                  <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                    {formatDateHeader(date)}
                  </span>
                </div>

                {/* Messages for this date */}
                {dayMessages.map((message, index) => {
                  const prevMessage = dayMessages[index - 1];
                  const isConsecutive = prevMessage && 
                    prevMessage.senderId === message.senderId &&
                    new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 60000; // 1 minute

                  return (
                    <MessageItem
                      key={message.id}
                      message={message}
                      isOwn={message.isOwn}
                      showAvatar={!isConsecutive}
                      onReply={onReply}
                      onForward={onForward}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReaction={onReaction}
                    />
                  );
                })}
              </div>
            ))}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-2">
                <TypingIndicator users={typingUsers} />
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4">
          <Button
            size="sm"
            className="rounded-full w-10 h-10 p-0 shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}