// src/components/chat/message-status.tsx
"use client";

import React from "react";
import { Check, CheckCheck, Clock, AlertCircle, Send } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials, formatChatDate } from "@/lib/utils";
import type {
  MessageStatus,
  MessageWithUser,
  DeliveryInfo,
  ReadInfo,
} from "@/types/message";
import type { User } from "@/types/user";

interface MessageStatusProps {
  status: MessageStatus;
  message?: MessageWithUser;
  showDetailed?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface MessageStatusDetailProps {
  message: MessageWithUser;
  onClose?: () => void;
  className?: string;
}

const statusConfig = {
  sent: {
    icon: Check,
    color: "text-muted-foreground",
    label: "Sent",
    description: "Message sent",
  },
  delivered: {
    icon: CheckCheck,
    color: "text-muted-foreground",
    label: "Delivered",
    description: "Message delivered",
  },
  read: {
    icon: CheckCheck,
    color: "text-blue-500",
    label: "Read",
    description: "Message read",
  },
  failed: {
    icon: AlertCircle,
    color: "text-red-500",
    label: "Failed",
    description: "Failed to send",
  },
} as const;

export function MessageStatus({
  status,
  message,
  showDetailed = false,
  size = "sm",
  className,
}: MessageStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (showDetailed && message) {
    return <MessageStatusDetail message={message} className={className} />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center", className)}>
          <Icon className={cn(sizeClasses[size], config.color)} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div className="font-medium">{config.label}</div>
          <div className="text-muted-foreground">{config.description}</div>
          {message?.createdAt && (
            <div className="text-muted-foreground mt-1">
              {formatChatDate(message.createdAt)}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function MessageStatusDetail({
  message,
  onClose,
  className,
}: MessageStatusDetailProps) {
  const { deliveredTo, readBy, status, createdAt } = message;

  // Group delivery and read info
  const deliveryData = deliveredTo.map((delivery) => ({
    ...delivery,
    type: "delivered" as const,
  }));

  const readData = readBy.map((read) => ({
    ...read,
    type: "read" as const,
    deliveredAt: read.readAt, // Normalize the property name
  }));

  // Combine and sort by timestamp
  const allStatusData = [...deliveryData, ...readData].sort(
    (a, b) =>
      new Date(a.deliveredAt).getTime() - new Date(b.deliveredAt).getTime()
  );

  // Get unique users and their latest status
  const userStatusMap = new Map<
    string,
    {
      userId: string;
      type: "delivered" | "read";
      timestamp: string;
    }
  >();

  allStatusData.forEach((item) => {
    const existing = userStatusMap.get(item.userId);
    if (!existing || item.type === "read") {
      userStatusMap.set(item.userId, {
        userId: item.userId,
        type: item.type,
        timestamp: item.deliveredAt,
      });
    }
  });

  const userStatuses = Array.from(userStatusMap.values());

  // Count statistics
  const deliveredCount = userStatuses.filter(
    (s) => s.type === "delivered"
  ).length;
  const readCount = userStatuses.filter((s) => s.type === "read").length;
  const totalRecipients = message.deliveredTo.length + message.readBy.length;

  return (
    <div className={cn("p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Message Info</h3>
          <p className="text-sm text-muted-foreground">
            Sent {formatChatDate(createdAt)}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      {/* Overall status */}
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <MessageStatus status={status} size="md" />
        <div>
          <div className="font-medium">{statusConfig[status].label}</div>
          <div className="text-sm text-muted-foreground">
            {statusConfig[status].description}
          </div>
        </div>
      </div>

      {/* Statistics */}
      {totalRecipients > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold">{totalRecipients}</div>
            <div className="text-xs text-muted-foreground">Recipients</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold text-muted-foreground">
              {deliveredCount}
            </div>
            <div className="text-xs text-muted-foreground">Delivered</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold text-blue-500">
              {readCount}
            </div>
            <div className="text-xs text-muted-foreground">Read</div>
          </div>
        </div>
      )}

      {/* Detailed status per user */}
      {userStatuses.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Delivery Status</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {userStatuses.map((userStatus) => {
              // In a real app, you would fetch user data by ID
              // For now, we'll show the user ID
              const displayName = `User ${userStatus.userId}`;
              const isRead = userStatus.type === "read";

              return (
                <div
                  key={userStatus.userId}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatChatDate(userStatus.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isRead ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        isRead && "bg-blue-500 text-white"
                      )}
                    >
                      {isRead ? "Read" : "Delivered"}
                    </Badge>
                    <MessageStatus
                      status={isRead ? "read" : "delivered"}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No recipients */}
      {totalRecipients === 0 && status === "sent" && (
        <div className="text-center p-4 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2" />
          <div className="text-sm">Waiting for delivery confirmation</div>
        </div>
      )}

      {/* Failed state */}
      {status === "failed" && (
        <div className="text-center p-4 text-red-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <div className="text-sm font-medium">Message failed to send</div>
          <div className="text-xs text-muted-foreground mt-1">
            Please check your connection and try again
          </div>
        </div>
      )}
    </div>
  );
}

// Utility component for showing read receipts in group chats
export function ReadReceipts({
  readBy,
  totalParticipants,
  className,
}: {
  readBy: ReadInfo[];
  totalParticipants: number;
  className?: string;
}) {
  const readCount = readBy.length;
  const hasReadReceipts = readCount > 0;

  if (!hasReadReceipts) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        className
      )}
    >
      <CheckCheck className="h-3 w-3 text-blue-500" />
      <span>
        Read by {readCount} of {totalParticipants} participants
      </span>
    </div>
  );
}

// Utility component for delivery status in chat list
export function DeliveryStatus({
  status,
  isOwn,
  className,
}: {
  status: MessageStatus;
  isOwn: boolean;
  className?: string;
}) {
  if (!isOwn) return null;

  return <MessageStatus status={status} size="sm" className={className} />;
}
