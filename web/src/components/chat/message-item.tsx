"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  CheckCheck,
  MoreVertical,
  Reply,
  Forward,
  Copy,
  Download,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageStatus } from "./message-status";
import { TypingIndicator } from "./typing-indicator";
import type { MessageWithUser, ReactionType } from "@/types/message";

interface MessageItemProps {
  message: MessageWithUser;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onReply?: (message: MessageWithUser) => void;
  onForward?: (message: MessageWithUser) => void;
  onEdit?: (message: MessageWithUser) => void;
  onDelete?: (message: MessageWithUser) => void;
  onReaction?: (messageId: string, reaction: ReactionType) => void;
}

const REACTIONS: ReactionType[] = ["👍", "❤️", "😂", "😮", "😢", "😠"];

export function MessageItem({
  message,
  isOwn,
  showAvatar = true,
  showTimestamp = false,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReaction,
}: MessageItemProps) {
  const [showReactions, setShowReactions] = useState(false);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const renderMediaContent = () => {
    switch (message.type) {
      case "image":
        return (
          <div className="relative max-w-sm">
            <img
              src={message.mediaUrl}
              alt="Shared image"
              className="rounded-lg max-h-80 w-auto object-cover"
            />
            {message.content && (
              <div className="mt-2 text-sm">{message.content}</div>
            )}
          </div>
        );

      case "video":
        return (
          <div className="relative max-w-sm">
            <video
              src={message.mediaUrl}
              controls
              className="rounded-lg max-h-80 w-auto"
            />
            {message.content && (
              <div className="mt-2 text-sm">{message.content}</div>
            )}
          </div>
        );

      case "audio":
        return (
          <div className="flex items-center space-x-3 bg-muted/30 rounded-lg p-3 min-w-64">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">🎵</span>
            </div>
            <div className="flex-1">
              <audio src={message.mediaUrl} controls className="w-full" />
            </div>
          </div>
        );

      case "document":
      case "file":
        return (
          <div className="flex items-center space-x-3 bg-muted/30 rounded-lg p-3 min-w-64 max-w-sm">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">📄</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {message.fileName || "Document"}
              </p>
              <p className="text-xs text-muted-foreground">
                {message.fileSize
                  ? `${Math.round(message.fileSize / 1024)} KB`
                  : "File"}
              </p>
            </div>
            <Button size="sm" variant="ghost">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      default:
        return <div className="text-sm">{message.content}</div>;
    }
  };

  const renderReactions = () => {
    if (message.reactions.length === 0) return null;

    const reactionCounts = message.reactions.reduce((acc, reaction) => {
      acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
      return acc;
    }, {} as Record<ReactionType, number>);

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(reactionCounts).map(([reaction, count]) => (
          <button
            key={reaction}
            className="flex items-center space-x-1 bg-muted/50 rounded-full px-2 py-1 text-xs hover:bg-muted transition-colors"
            onClick={() => onReaction?.(message.id, reaction as ReactionType)}
          >
            <span>{reaction}</span>
            <span className="text-muted-foreground">{count}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-2 hover:bg-muted/20 group transition-colors",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback className="bg-blue-600 text-white text-xs">
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {/* Sender name (for group chats, non-own messages) */}
        {!isOwn && (
          <p className="text-xs text-blue-600 font-medium mb-1">
            {message.senderName}
          </p>
        )}

        {/* Reply to message */}
        {message.replyToMessage && (
          <div className="mb-2 p-2 border-l-4 border-blue-600 bg-muted/30 rounded text-xs max-w-full">
            <p className="font-medium text-blue-600">
              {message.replyToMessage.senderId === message.senderId
                ? "You"
                : "Other User"}
            </p>
            <p className="text-muted-foreground truncate">
              {message.replyToMessage.content}
            </p>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "relative px-3 py-2 rounded-lg text-sm max-w-full break-words",
            isOwn
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-background border border-border rounded-bl-sm shadow-sm"
          )}
        >
          {renderMediaContent()}

          {/* Message timestamp and status */}
          <div
            className={cn(
              "flex items-center justify-end space-x-1 mt-1 text-xs",
              isOwn ? "text-blue-100" : "text-muted-foreground"
            )}
          >
            {message.editedAt && <span className="italic">edited</span>}
            <span>{formatTime(message.createdAt)}</span>
            {isOwn && <MessageStatus status={message.status} />}
          </div>

          {/* Quick reaction buttons */}
          {showReactions && (
            <div
              className={cn(
                "absolute top-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity",
                isOwn ? "right-0 -translate-y-8" : "left-0 -translate-y-8"
              )}
            >
              {REACTIONS.slice(0, 3).map((reaction) => (
                <button
                  key={reaction}
                  className="w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform shadow-sm"
                  onClick={() => onReaction?.(message.id, reaction)}
                >
                  {reaction}
                </button>
              ))}

              {/* More options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                    <MoreVertical className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align={isOwn ? "end" : "start"}
                  className="w-48"
                >
                  <DropdownMenuItem onClick={() => onReply?.(message)}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onForward?.(message)}>
                    <Forward className="h-4 w-4 mr-2" />
                    Forward
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      navigator.clipboard.writeText(message.content)
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  {isOwn && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit?.(message)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(message)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Reactions */}
        {renderReactions()}

        {/* Timestamp (if enabled) */}
        {showTimestamp && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
            })}
          </p>
        )}
      </div>

      {/* Own message avatar placeholder */}
      {showAvatar && isOwn && <div className="w-8" />}
    </div>
  );
}
