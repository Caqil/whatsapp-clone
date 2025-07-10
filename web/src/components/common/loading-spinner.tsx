// src/components/common/loading-spinner.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare } from "lucide-react";

// Base spinner variants
type SpinnerVariant =
  | "default"
  | "dots"
  | "pulse"
  | "bounce"
  | "ping"
  | "whatsapp";
type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

interface LoadingSpinnerProps {
  variant?: SpinnerVariant;
  size?: SpinnerSize;
  className?: string;
  color?: string;
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

// Default spinning loader
export function LoadingSpinner({
  variant = "default",
  size = "md",
  className,
  color = "currentColor",
}: LoadingSpinnerProps) {
  const baseClasses = cn(sizeClasses[size], className);

  switch (variant) {
    case "dots":
      return <DotsSpinner size={size} className={className} />;
    case "pulse":
      return <PulseSpinner size={size} className={className} />;
    case "bounce":
      return <BounceSpinner size={size} className={className} />;
    case "ping":
      return <PingSpinner size={size} className={className} />;
    case "whatsapp":
      return <WhatsAppSpinner size={size} className={className} />;
    default:
      return (
        <Loader2
          className={cn(baseClasses, "animate-spin")}
          style={{ color }}
        />
      );
  }
}

// Dots spinner (three bouncing dots)
function DotsSpinner({
  size,
  className,
}: {
  size: SpinnerSize;
  className?: string;
}) {
  const dotSize = {
    xs: "w-1 h-1",
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
  }[size];

  return (
    <div className={cn("flex space-x-1", className)}>
      <div
        className={cn(dotSize, "bg-current rounded-full animate-bounce")}
        style={{ animationDelay: "0ms" }}
      />
      <div
        className={cn(dotSize, "bg-current rounded-full animate-bounce")}
        style={{ animationDelay: "150ms" }}
      />
      <div
        className={cn(dotSize, "bg-current rounded-full animate-bounce")}
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

// Pulse spinner (growing and shrinking circle)
function PulseSpinner({
  size,
  className,
}: {
  size: SpinnerSize;
  className?: string;
}) {
  return (
    <div
      className={cn(
        sizeClasses[size],
        "bg-current rounded-full animate-pulse",
        className
      )}
    />
  );
}

// Bounce spinner (single bouncing dot)
function BounceSpinner({
  size,
  className,
}: {
  size: SpinnerSize;
  className?: string;
}) {
  return (
    <div
      className={cn(
        sizeClasses[size],
        "bg-current rounded-full animate-bounce",
        className
      )}
    />
  );
}

// Ping spinner (expanding ring)
function PingSpinner({
  size,
  className,
}: {
  size: SpinnerSize;
  className?: string;
}) {
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 bg-current rounded-full animate-ping opacity-75" />
      <div className="relative bg-current rounded-full w-full h-full" />
    </div>
  );
}

// WhatsApp-style spinner (rotating message icon)
function WhatsAppSpinner({
  size,
  className,
}: {
  size: SpinnerSize;
  className?: string;
}) {
  return (
    <div className={cn("text-green-500", className)}>
      <MessageSquare className={cn(sizeClasses[size], "animate-spin")} />
    </div>
  );
}

// Full page loading overlay
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  variant?: SpinnerVariant;
  size?: SpinnerSize;
  backdrop?: boolean;
}

export function LoadingOverlay({
  isLoading,
  message = "Loading...",
  variant = "whatsapp",
  size = "lg",
  backdrop = true,
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        backdrop && "bg-background/80 backdrop-blur-sm"
      )}
    >
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner variant={variant} size={size} />
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// Inline loading state for components
interface InlineLoadingProps {
  message?: string;
  variant?: SpinnerVariant;
  size?: SpinnerSize;
  className?: string;
}

export function InlineLoading({
  message = "Loading...",
  variant = "default",
  size = "sm",
  className,
}: InlineLoadingProps) {
  return (
    <div
      className={cn(
        "flex items-center space-x-2 text-muted-foreground",
        className
      )}
    >
      <LoadingSpinner variant={variant} size={size} />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// Button loading state
interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  variant?: SpinnerVariant;
  size?: SpinnerSize;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function LoadingButton({
  isLoading,
  children,
  loadingText,
  variant = "default",
  size = "sm",
  className,
  disabled,
  onClick,
}: LoadingButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      disabled={isLoading || disabled}
      onClick={onClick}
    >
      {isLoading && <LoadingSpinner variant={variant} size={size} />}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  );
}

// Chat message loading placeholder
export function MessageSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
        >
          <div
            className={cn(
              "max-w-xs p-3 rounded-lg space-y-2",
              i % 2 === 0 ? "bg-muted" : "bg-primary/10"
            )}
          >
            <div className="h-4 bg-current opacity-20 rounded animate-pulse" />
            <div className="h-4 bg-current opacity-20 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-current opacity-10 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Chat list loading placeholder
export function ChatListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-4">
          <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>
          <div className="w-6 h-3 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// Search loading state
export function SearchLoading({
  message = "Searching...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <LoadingSpinner variant="dots" size="md" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Upload progress with spinner
interface UploadLoadingProps {
  progress?: number;
  message?: string;
  fileName?: string;
}

export function UploadLoading({
  progress,
  message = "Uploading...",
  fileName,
}: UploadLoadingProps) {
  return (
    <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
      <LoadingSpinner variant="default" size="sm" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{message}</span>
          {progress !== undefined && (
            <span className="text-xs text-muted-foreground">{progress}%</span>
          )}
        </div>
        {fileName && (
          <p className="text-xs text-muted-foreground truncate">{fileName}</p>
        )}
        {progress !== undefined && (
          <div className="w-full bg-background rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Connection status loading
interface ConnectionLoadingProps {
  status: "connecting" | "reconnecting" | "connected" | "disconnected";
  attempts?: number;
  maxAttempts?: number;
}

export function ConnectionLoading({
  status,
  attempts,
  maxAttempts,
}: ConnectionLoadingProps) {
  const messages = {
    connecting: "Connecting...",
    reconnecting:
      attempts && maxAttempts
        ? `Reconnecting... (${attempts}/${maxAttempts})`
        : "Reconnecting...",
    connected: "Connected",
    disconnected: "Disconnected",
  };

  const colors = {
    connecting: "text-yellow-500",
    reconnecting: "text-orange-500",
    connected: "text-green-500",
    disconnected: "text-red-500",
  };

  if (status === "connected") {
    return null; // Don't show when connected
  }

  return (
    <div className={cn("flex items-center space-x-2 text-xs", colors[status])}>
      {status !== "disconnected" && (
        <LoadingSpinner variant="default" size="xs" />
      )}
      <span>{messages[status]}</span>
    </div>
  );
}

export default LoadingSpinner;
