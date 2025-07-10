// src/components/chat/message-item.tsx
"use client";

import React, { useState, useRef } from "react";
import {
  Check,
  CheckCheck,
  MoreVertical,
  Reply,
  Forward,
  Copy,
  Star,
  Trash2,
  Edit,
  Download,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MapPin,
  User,
  File,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMessages } from "@/hooks/use-messages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  cn,
  getInitials,
  formatChatDate,
  formatFileSize,
  formatDuration,
} from "@/lib/utils";
import type {
  MessageWithUser,
  ReactionType,
  MessageType,
} from "@/types/message";

interface MessageItemProps {
  message: MessageWithUser;
  isGrouped?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onReply?: (message: MessageWithUser) => void;
  onEdit?: (message: MessageWithUser) => void;
  onForward?: (messageIds: string[]) => void;
  onDelete?: (messageId: string, deleteForEveryone?: boolean) => void;
  onReaction?: (messageId: string, reaction: ReactionType) => void;
  className?: string;
}

const messageTypeIcons: Record<
  MessageType,
  React.ComponentType<{ className?: string }>
> = {
  text: () => null,
  image: ImageIcon,
  video: VideoIcon,
  audio: Mic,
  file: File,
  document: File,
  location: MapPin,
  contact: User,
};

const quickReactions: ReactionType[] = ["👍", "❤️", "😂", "😮", "😢", "😠"];

export function MessageItem({
  message,
  isGrouped = false,
  showAvatar = true,
  showTimestamp = true,
  onReply,
  onEdit,
  onForward,
  onDelete,
  onReaction,
  className,
}: MessageItemProps) {
  const { user } = useAuth();
  const { addReaction, removeReaction, editMessage, deleteMessage } =
    useMessages();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isEditing, setIsEditing] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const isOwn = message.isOwn || message.senderId === user?.id;
  const isDeleted = message.isDeleted;
  const isEdited = !!message.editedAt;
  const canEdit = isOwn && !isDeleted && message.type === "text";
  const canDelete = isOwn && !isDeleted;

  // Format message status
  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case "failed":
        return <span className="text-red-500 text-xs">Failed</span>;
      default:
        return null;
    }
  };

  // Handle reactions
  const handleReaction = async (reaction: ReactionType) => {
    try {
      const existingReaction = message.reactions.find(
        (r) => r.userId === user?.id
      );

      if (existingReaction?.reaction === reaction) {
        await removeReaction(message.id);
      } else {
        await addReaction(message.id, reaction);
      }

      onReaction?.(message.id, reaction);
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
    setShowReactions(false);
  };

  // Handle edit
  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }

    try {
      await editMessage(message.id, editContent);
      setIsEditing(false);
      onEdit?.(message);
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  // Handle delete
  const handleDelete = async (deleteForEveryone = false) => {
    try {
      await deleteMessage(message.id, deleteForEveryone);
      onDelete?.(message.id, deleteForEveryone);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
    setIsMenuOpen(false);
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsMenuOpen(false);
  };

  // Handle audio playback
  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Render reply preview - FIXED to only use properties that exist on Message type
  const renderReplyPreview = () => {
    if (!message.replyToMessage) return null;

    const replyMsg = message.replyToMessage;
    const ReplyIcon = messageTypeIcons[replyMsg.type];

    return (
      <div className="mb-2 p-2 border-l-4 border-primary bg-muted/50 rounded-r">
        <div className="text-xs text-primary font-medium mb-1">
          Replying to message
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {ReplyIcon && <ReplyIcon className="h-3 w-3" />}
          <span className="truncate">
            {replyMsg.type === "text"
              ? replyMsg.content
              : `${
                  replyMsg.type.charAt(0).toUpperCase() + replyMsg.type.slice(1)
                }`}
          </span>
        </div>
      </div>
    );
  };

  // Render message content based on type
  const renderMessageContent = () => {
    if (isDeleted) {
      return (
        <div className="text-muted-foreground italic text-sm">
          This message was deleted
        </div>
      );
    }

    switch (message.type) {
      case "text":
        if (isEditing) {
          return (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[60px] p-2 border rounded-md resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleEdit();
                  } else if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          );
        }
        return (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {isEdited && (
              <span className="text-xs text-muted-foreground ml-2">
                (edited)
              </span>
            )}
          </div>
        );

      case "image":
        return (
          <div className="max-w-sm">
            <img
              src={message.mediaUrl}
              alt="Shared image"
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                // TODO: Open image viewer modal
              }}
            />
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );

      case "video":
        return (
          <div className="max-w-sm">
            <video
              src={message.mediaUrl}
              controls
              className="rounded-lg max-w-full h-auto"
              poster={message.thumbnailUrl}
            />
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );

      case "audio":
        return (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-xs">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleAudioPlayback}
              className="flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1">
              <div className="text-sm font-medium">Voice message</div>
              <div className="text-xs text-muted-foreground">
                {message.duration ? formatDuration(message.duration) : "0:00"}
              </div>
            </div>
            <audio
              ref={audioRef}
              src={message.mediaUrl}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        );

      case "file":
      case "document":
        return (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-xs">
            <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {message.fileName || "Unknown file"}
              </div>
              <div className="text-xs text-muted-foreground">
                {message.fileSize
                  ? formatFileSize(message.fileSize)
                  : "Unknown size"}
              </div>
            </div>
            <Button size="icon" variant="ghost" className="flex-shrink-0">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      case "location":
        return (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-xs">
            <MapPin className="h-8 w-8 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">Location</div>
              <div className="text-xs text-muted-foreground">
                Shared location
              </div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-xs">
            <User className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">Contact</div>
              <div className="text-xs text-muted-foreground">
                Shared contact
              </div>
            </div>
          </div>
        );

      default:
        return <div className="text-sm">{message.content}</div>;
    }
  };

  // Render reactions
  const renderReactions = () => {
    if (!message.reactions.length) return null;

    // Group reactions by type
    const reactionGroups = message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.reaction]) {
        acc[reaction.reaction] = [];
      }
      acc[reaction.reaction].push(reaction);
      return acc;
    }, {} as Record<ReactionType, typeof message.reactions>);

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(reactionGroups).map(([emoji, reactions]) => {
          const hasUserReaction = reactions.some((r) => r.userId === user?.id);

          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleReaction(emoji as ReactionType)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors",
                    hasUserReaction
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="text-xs">{reactions.length}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  {reactions.length} reaction{reactions.length > 1 ? "s" : ""}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-2 hover:bg-muted/30 transition-colors",
        isOwn ? "flex-row-reverse" : "flex-row",
        isGrouped && "py-1",
        className
      )}
    >
      {/* Avatar */}
      {showAvatar && !isGrouped && (
        <div className="flex-shrink-0">
          {isOwn ? (
            <div className="w-8 h-8" /> // Empty space for own messages
          ) : (
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={message.sender.avatar}
                alt={message.sender.firstName}
              />
              <AvatarFallback>
                {getInitials(
                  `${message.sender.firstName} ${message.sender.lastName}`
                )}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className={cn("flex-1 max-w-[70%]", isOwn && "flex flex-col items-end")}
      >
        {/* Sender name and timestamp */}
        {!isOwn && !isGrouped && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-primary">
              {message.sender.firstName}
            </span>
            {showTimestamp && (
              <span className="text-xs text-muted-foreground">
                {formatChatDate(message.createdAt)}
              </span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "relative p-3 rounded-lg",
            isOwn ? "bg-primary text-primary-foreground" : "bg-muted",
            message.type !== "text" && "p-2"
          )}
        >
          {renderReplyPreview()}
          {renderMessageContent()}

          {/* Message actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1">
              {/* Quick reactions */}
              {!isDeleted && (
                <div className="relative">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setShowReactions(!showReactions)}
                  >
                    <span className="text-sm">😊</span>
                  </Button>

                  {showReactions && (
                    <div className="absolute bottom-full right-0 mb-2 flex gap-1 p-2 bg-background border rounded-lg shadow-lg z-10">
                      {quickReactions.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(emoji)}
                          className="hover:scale-110 transition-transform p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* More actions */}
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {!isDeleted && (
                    <>
                      <DropdownMenuItem onClick={() => onReply?.(message)}>
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onForward?.([message.id])}
                      >
                        <Forward className="h-4 w-4 mr-2" />
                        Forward
                      </DropdownMenuItem>

                      {message.type === "text" && (
                        <DropdownMenuItem onClick={handleCopy}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy text
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {canEdit && (
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {canDelete && (
                    <>
                      <DropdownMenuItem onClick={() => handleDelete(false)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete for me
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleDelete(true)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete for everyone
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Reactions */}
        {renderReactions()}

        {/* Own message status and timestamp */}
        {isOwn && showTimestamp && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <span>{formatChatDate(message.createdAt)}</span>
            {getStatusIcon()}
          </div>
        )}
      </div>
    </div>
  );
}
