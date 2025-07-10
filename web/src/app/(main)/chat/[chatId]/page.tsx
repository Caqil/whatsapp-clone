"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatHeader } from "@/components/chat/chat-header";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { MessageWithUser, ReactionType } from "@/types/message";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;

  const { user } = useAuth();
  const {
    currentChat,
    currentChatId,
    messages,
    isLoadingMessages,
    hasMoreMessages,
    typingUsers,
    switchChat,
    sendTextMessage,
    sendMediaMessage,
    loadMoreMessages,
    markAsRead,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
    forwardMessages,
    startTyping,
    stopTyping,
  } = useChat();

  const { isConnected } = useSocket();
  const [replyTo, setReplyTo] = useState<MessageWithUser | null>(null);

  // Switch to the chat when component mounts or chatId changes
  useEffect(() => {
    if (chatId && chatId !== currentChatId) {
      switchChat(chatId);
    }
  }, [chatId, currentChatId, switchChat]);

  // Auto-mark messages as read when chat is viewed
  useEffect(() => {
    if (currentChat && messages.size > 0) {
      const unreadMessages = Array.from(messages.values())
        .filter((msg) => !msg.isOwn && msg.status !== "read")
        .map((msg) => msg.id);

      if (unreadMessages.length > 0) {
        unreadMessages.forEach((messageId) => markAsRead(messageId));
      }
    }
  }, [currentChat, messages, markAsRead]);

  const handleSendMessage = async (content: string, replyToId?: string) => {
    try {
      await sendTextMessage(content, replyToId);
      setReplyTo(null);
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleSendMedia = async (
    file: File,
    content?: string,
    replyToId?: string
  ) => {
    try {
      await sendMediaMessage(file, content, replyToId);
      setReplyTo(null);
    } catch (error) {
      toast.error("Failed to send media");
    }
  };

  const handleReply = (message: MessageWithUser) => {
    setReplyTo(message);
  };

  const handleForward = (message: MessageWithUser) => {
    // TODO: Implement forward dialog
    console.log("Forward message:", message);
  };

  const handleEdit = (message: MessageWithUser) => {
    // TODO: Implement edit functionality
    console.log("Edit message:", message);
  };

  const handleDelete = async (message: MessageWithUser) => {
    try {
      await deleteMessage(message.id, false);
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const handleReaction = async (messageId: string, reaction: ReactionType) => {
    try {
      // Check if user already reacted with this emoji
      const message = messages.get(messageId);
      const userReaction = message?.reactions.find(
        (r) => r.userId === user?.id && r.reaction === reaction
      );

      if (userReaction) {
        await removeReaction(messageId, reaction);
      } else {
        await addReaction(messageId, reaction);
      }
    } catch (error) {
      toast.error("Failed to add reaction");
    }
  };

  const messagesArray = Array.from(messages.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const typingUserNames = Array.from(typingUsers.keys());

  // Loading state
  if (!currentChat && isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Chat not found
  if (!currentChat && !isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">❌</span>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Chat not found</h3>
            <p className="text-muted-foreground">
              This chat doesn't exist or you don't have access to it.
            </p>
          </div>
          <Button onClick={() => router.push("/chat")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chats
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <ChatHeader
        chat={currentChat}
        onCall={() => toast.info("Voice call feature coming soon!")}
        onVideoCall={() => toast.info("Video call feature coming soon!")}
        onSearch={() => toast.info("Search feature coming soon!")}
        onChatInfo={() => toast.info("Chat info feature coming soon!")}
      />

      {/* Messages */}
      <MessageList
        messages={messagesArray}
        isLoading={isLoadingMessages}
        hasMore={hasMoreMessages}
        currentUserId={user?.id}
        typingUsers={typingUserNames}
        onLoadMore={loadMoreMessages}
        onReply={handleReply}
        onForward={handleForward}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReaction={handleReaction}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendMedia={handleSendMedia}
        onStartTyping={() => startTyping(chatId)}
        onStopTyping={() => stopTyping(chatId)}
        disabled={!isConnected}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        placeholder={isConnected ? "Type a message..." : "Connecting..."}
      />

      {/* Connection status */}
      {!isConnected && (
        <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 border-t border-yellow-300 dark:border-yellow-700">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
            Reconnecting to chat server...
          </p>
        </div>
      )}
    </div>
  );
}
