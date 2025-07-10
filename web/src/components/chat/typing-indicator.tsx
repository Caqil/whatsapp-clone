// src/components/chat/typing-indicator.tsx
"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type { User } from "@/types/user";
import type { ChatType } from "@/types/chat";

interface TypingIndicatorProps {
  users: User[] | string[];
  chatType?: ChatType;
  showAvatar?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface TypingDotsProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Animated typing dots component
function TypingDots({ size = "md", className }: TypingDotsProps) {
  const sizeClasses = {
    sm: "w-1 h-1",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  };

  const dotClass = cn(
    "rounded-full bg-muted-foreground/60 animate-pulse",
    sizeClasses[size]
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className={cn(dotClass, "animation-delay-0")} />
      <div className={cn(dotClass, "animation-delay-150")} />
      <div className={cn(dotClass, "animation-delay-300")} />

      <style jsx>{`
        .animation-delay-0 {
          animation-delay: 0ms;
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        .animation-delay-300 {
          animation-delay: 300ms;
        }

        @keyframes pulse {
          0%,
          60%,
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
          30% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .animate-pulse {
          animation: pulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export function TypingIndicator({
  users,
  chatType = "direct",
  showAvatar = true,
  size = "md",
  className,
}: TypingIndicatorProps) {
  // Handle empty state
  if (!users || users.length === 0) {
    return null;
  }

  // Convert string array to user objects if needed (for backward compatibility)
  const typingUsers: User[] = users.map((user, index) => {
    if (typeof user === "string") {
      return {
        id: user,
        username: user,
        firstName: `User`,
        lastName: `${index + 1}`,
        email: `${user}@example.com`,
        avatar: "",
        isOnline: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return user;
  });

  // Format typing message based on number of users and chat type
  const getTypingMessage = () => {
    const count = typingUsers.length;

    if (count === 0) return "";

    if (chatType === "direct") {
      return "typing...";
    }

    // Group chat messages
    if (count === 1) {
      return `${typingUsers[0].firstName} is typing...`;
    } else if (count === 2) {
      return `${typingUsers[0].firstName} and ${typingUsers[1].firstName} are typing...`;
    } else if (count === 3) {
      return `${typingUsers[0].firstName}, ${typingUsers[1].firstName} and ${typingUsers[2].firstName} are typing...`;
    } else {
      return `${typingUsers[0].firstName} and ${
        count - 1
      } others are typing...`;
    }
  };

  const avatarSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Avatar(s) - only show for group chats or when explicitly requested */}
      {showAvatar && chatType === "group" && (
        <div className="flex items-center">
          {typingUsers.slice(0, 3).map((user, index) => (
            <Avatar
              key={user.id}
              className={cn(
                avatarSizes[size],
                index > 0 && "-ml-2",
                "border-2 border-background"
              )}
              style={{ zIndex: 3 - index }}
            >
              <AvatarImage src={user.avatar} alt={user.firstName} />
              <AvatarFallback
                className={cn(textSizes.sm, "bg-muted text-muted-foreground")}
              >
                {getInitials(`${user.firstName} ${user.lastName}`)}
              </AvatarFallback>
            </Avatar>
          ))}

          {/* Show count if more than 3 users */}
          {typingUsers.length > 3 && (
            <div
              className={cn(
                avatarSizes[size],
                "bg-muted rounded-full flex items-center justify-center -ml-2 border-2 border-background",
                textSizes.sm,
                "text-muted-foreground font-medium"
              )}
            >
              +{typingUsers.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Typing message and animation */}
      <div className="flex items-center gap-2 min-h-0">
        {/* Typing text */}
        <span
          className={cn(
            textSizes[size],
            "text-muted-foreground italic",
            "animate-pulse"
          )}
        >
          {getTypingMessage()}
        </span>

        {/* Typing dots animation */}
        <TypingDots size={size} />
      </div>
    </div>
  );
}

// Compact version for chat list items
export function TypingIndicatorCompact({
  users,
  className,
}: {
  users: User[] | string[];
  className?: string;
}) {
  if (!users || users.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="text-xs text-green-500 italic">typing</span>
      <TypingDots size="sm" />
    </div>
  );
}

// Minimal version for message input area
export function TypingIndicatorMinimal({
  isVisible,
  className,
}: {
  isVisible: boolean;
  className?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2", className)}>
      <div className="w-8 h-6 bg-muted rounded-full flex items-center justify-center">
        <TypingDots size="sm" />
      </div>
      <span className="text-sm text-muted-foreground italic">typing...</span>
    </div>
  );
}

// Hook for managing typing state
export function useTypingIndicator(chatId: string, timeout = 3000) {
  const [isTyping, setIsTyping] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const startTyping = React.useCallback(() => {
    setIsTyping(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to stop typing
    timeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, timeout);
  }, [timeout]);

  const stopTyping = React.useCallback(() => {
    setIsTyping(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    startTyping,
    stopTyping,
  };
}
