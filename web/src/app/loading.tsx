// src/app/loading.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Loader2, MessageSquare, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/constants";

// Loading spinner component
function LoadingSpinner({
  size = "default",
}: {
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
  );
}

// Animated dots for loading text
function LoadingDots() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return <span className="inline-block w-6 text-left">{dots}</span>;
}

// Progressive loading messages
function LoadingMessages() {
  const messages = [
    "Connecting to server",
    "Loading your chats",
    "Syncing messages",
    "Almost ready",
  ];

  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="text-center">
      <p className="text-muted-foreground text-sm">
        {messages[currentMessage]}
        <LoadingDots />
      </p>
    </div>
  );
}

// Skeleton loader for chat list
function ChatListSkeleton() {
  return (
    <div className="space-y-3 w-full max-w-md">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3">
          {/* Avatar skeleton */}
          <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />

          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>

          {/* Time skeleton */}
          <div className="h-3 bg-muted rounded animate-pulse w-12" />
        </div>
      ))}
    </div>
  );
}

// Feature highlights during loading
function FeatureHighlights() {
  const features = [
    {
      icon: MessageSquare,
      title: "Real-time Messaging",
      description: "Instant message delivery and read receipts",
    },
    {
      icon: Users,
      title: "Group Chats",
      description: "Connect with multiple people at once",
    },
    {
      icon: Zap,
      title: "Fast & Reliable",
      description: "Built for speed and performance",
    },
  ];

  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="space-y-4 w-full max-w-sm">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        const isActive = index === activeFeature;

        return (
          <div
            key={index}
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg transition-all duration-500",
              isActive
                ? "bg-primary/10 border border-primary/20 scale-105"
                : "bg-muted/50 opacity-60"
            )}
          >
            <div
              className={cn(
                "p-2 rounded-lg transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <h3
                className={cn(
                  "font-medium text-sm transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Main loading component
export default function Loading() {
  const [loadingStage, setLoadingStage] = useState<
    "initial" | "features" | "skeleton"
  >("initial");

  useEffect(() => {
    // Progress through different loading stages
    const timer1 = setTimeout(() => {
      setLoadingStage("features");
    }, 1000);

    const timer2 = setTimeout(() => {
      setLoadingStage("skeleton");
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      {/* App Logo/Icon */}
      <div className="mb-8 relative">
        <div className="h-20 w-20 bg-primary rounded-3xl flex items-center justify-center shadow-lg">
          <MessageSquare className="h-10 w-10 text-primary-foreground" />
        </div>

        {/* Pulsing ring animation */}
        <div className="absolute inset-0 h-20 w-20 bg-primary/20 rounded-3xl animate-ping" />
      </div>

      {/* App Title */}
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {APP_CONFIG.NAME}
      </h1>

      <p className="text-muted-foreground text-center mb-8 max-w-md">
        {APP_CONFIG.DESCRIPTION}
      </p>

      {/* Loading Content - Changes based on stage */}
      <div className="flex flex-col items-center space-y-6">
        {loadingStage === "initial" && (
          <>
            <LoadingSpinner size="lg" />
            <LoadingMessages />
          </>
        )}

        {loadingStage === "features" && (
          <>
            <div className="flex items-center space-x-2 mb-4">
              <LoadingSpinner />
              <span className="text-sm text-muted-foreground">
                Preparing your experience
              </span>
            </div>
            <FeatureHighlights />
          </>
        )}

        {loadingStage === "skeleton" && (
          <>
            <div className="flex items-center space-x-2 mb-4">
              <LoadingSpinner />
              <span className="text-sm text-muted-foreground">
                Loading your conversations
              </span>
            </div>
            <ChatListSkeleton />
          </>
        )}
      </div>

      {/* Progress indicator */}
      <div className="mt-8 w-full max-w-xs">
        <div className="flex space-x-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                i === 0 && loadingStage === "initial" && "bg-primary",
                i === 1 && loadingStage === "features" && "bg-primary",
                i === 2 && loadingStage === "skeleton" && "bg-primary",
                "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Version info */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          Version {APP_CONFIG.VERSION}
        </p>
      </div>

      {/* Accessibility loading announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loadingStage === "initial" && "Loading application"}
        {loadingStage === "features" && "Preparing features"}
        {loadingStage === "skeleton" && "Loading your conversations"}
      </div>
    </div>
  );
}
