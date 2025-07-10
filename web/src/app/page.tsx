// src/app/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  MessageSquare,
  Users,
  Plus,
  Settings,
  Search,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getInitials } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/constants";
import { ChatList } from "@/components/chat/chat-list";


const NewChatDialog = dynamic(
  () =>
    import("@/components/chat/new-chat-dialog").then((mod) => ({
      default: mod.NewChatDialog,
    })),
  {
    loading: () => (
      <Button disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    ),
    ssr: false,
  }
);

const MobileNav = dynamic(
  () =>
    import("@/components/layout/mobile-nav").then((mod) => ({
      default: mod.MobileNav,
    })),
  {
    ssr: false,
  }
);

// Loading skeleton for chat list
function ChatListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3">
          <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>
          <div className="h-3 bg-muted rounded animate-pulse w-12" />
        </div>
      ))}
    </div>
  );
}

// Empty state when no chats exist
function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
          <p className="text-muted-foreground text-sm">
            Start messaging by creating a new chat with your contacts
          </p>
        </div>

        <NewChatDialog>
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Start New Chat
          </Button>
        </NewChatDialog>
      </div>
    </div>
  );
}

// Welcome message for new users
function WelcomeMessage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-lg">
        <div className="mb-8">
          <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            Welcome to {APP_CONFIG.NAME}
          </h1>

          <p className="text-muted-foreground mb-6">
            {user?.firstName ? `Hi ${user.firstName}! ` : ""}
            Send and receive messages without keeping your phone online. Use{" "}
            {APP_CONFIG.NAME} on up to 4 linked devices and 1 mobile phone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-muted/50 rounded-lg">
            <MessageSquare className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-medium mb-1">Send Messages</h3>
            <p className="text-xs text-muted-foreground">
              Text, voice messages, and media sharing
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <Users className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-medium mb-1">Group Chats</h3>
            <p className="text-xs text-muted-foreground">
              Connect with multiple people at once
            </p>
          </div>
        </div>

        <NewChatDialog>
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Start Messaging
          </Button>
        </NewChatDialog>
      </div>
    </div>
  );
}

// Header component for the main page
function MainHeader() {
  const { user, logout } = useAuth();
  const { getTotalUnreadCount } = useChat();
  const isMobile = useIsMobile();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const unreadCount = getTotalUnreadCount();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left side - Mobile menu button or Logo */}
          <div className="flex items-center gap-3">
            {isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileNavOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-lg">{APP_CONFIG.NAME}</span>
              </div>
            )}
          </div>

          {/* Center - Search (desktop only) */}
          {!isMobile && (
            <div className="flex-1 max-w-md mx-4">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  // TODO: Implement search modal
                }}
              >
                <Search className="h-4 w-4 mr-2" />
                Search conversations...
              </Button>
            </div>
          )}

          {/* Right side - User actions */}
          <div className="flex items-center gap-2">
            {/* Search button (mobile only) */}
            {isMobile && (
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* New chat button */}
            <NewChatDialog>
              <Button size="icon" variant="ghost">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Plus className="h-5 w-5" />
                  </TooltipTrigger>
                  <TooltipContent>Start new chat</TooltipContent>
                </Tooltip>
              </Button>
            </NewChatDialog>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/settings")}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Settings className="h-5 w-5" />
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </Button>

            {/* User avatar */}
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
              onClick={() => router.push("/profile")}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} alt={user?.firstName} />
                <AvatarFallback>
                  {user
                    ? getInitials(`${user.firstName} ${user.lastName}`)
                    : "U"}
                </AvatarFallback>
              </Avatar>

              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
        />
      )}
    </>
  );
}

// Main page component
export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { chats, isLoading: isChatsLoading, loadChats } = useChat();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  // Load chats when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !hasInitialized) {
      loadChats();
      setHasInitialized(true);
    }
  }, [isAuthenticated, hasInitialized, loadChats]);

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    if (isMobile) {
      router.push(`/chat/${chatId}`);
    }
  };

  // Show loading state
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const chatList = Array.from(chats.values());
  const hasChats = chatList.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <MainHeader />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat list sidebar (desktop) or full screen (mobile) */}
        <div
          className={cn(
            "flex flex-col border-r bg-background",
            isMobile ? "w-full" : "w-80 lg:w-96"
          )}
        >
          {/* Chat list header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Chats
                {hasChats && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({chatList.length})
                  </span>
                )}
              </h2>

              <NewChatDialog>
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              </NewChatDialog>
            </div>
          </div>

          {/* Chat list content */}
          <ScrollArea className="flex-1">
            <Suspense fallback={<ChatListSkeleton />}>
              {isChatsLoading ? (
                <ChatListSkeleton />
              ) : hasChats ? (
                <ChatList
                  onChatSelect={handleChatSelect}
                  selectedChatId={selectedChatId ?? undefined}
                />
              ) : (
                <div className="p-4">
                  <EmptyState />
                </div>
              )}
            </Suspense>
          </ScrollArea>
        </div>

        {/* Chat area (desktop only) */}
        {!isMobile && (
          <div className="flex-1 flex flex-col">
            {selectedChatId ? (
              // TODO: Load the selected chat component
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Chat component will be loaded here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Selected chat ID: {selectedChatId}
                  </p>
                </div>
              </div>
            ) : hasChats ? (
              // No chat selected state
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Select a chat to start messaging
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Choose a conversation from the sidebar to view your messages
                  </p>
                </div>
              </div>
            ) : (
              // Welcome state for new users
              <WelcomeMessage />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
