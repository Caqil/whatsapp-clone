"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { useSocket } from "@/hooks/use-socket";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const {
    chats,
    loadChats,
    createDirectChat,
    createGroupChat,
    isLoading: chatLoading,
  } = useChat();
  const { connect, isConnected } = useSocket();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated && user) {
      loadChats();
      connect();
    }
  }, [isAuthenticated, user, loadChats, connect]);

  // Show loading screen
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Loading ChatApp...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const handleCreateDirectChat = async (userId: string) => {
    try {
      const chat = await createDirectChat(userId);
      router.push(`/chat/${chat.id}`);
      toast.success("Chat created successfully");
    } catch (error) {
      toast.error("Failed to create chat");
    }
  };

  const handleCreateGroupChat = async (
    name: string,
    userIds: string[],
    description?: string
  ) => {
    try {
      const chat = await createGroupChat(name, userIds, description);
      router.push(`/chat/${chat.id}`);
      toast.success(`Group "${name}" created successfully`);
    } catch (error) {
      toast.error("Failed to create group chat");
    }
  };

  const totalUnreadCount = chats.reduce(
    (total, chat) => total + chat.unreadCount,
    0
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <Header
        user={user}
        unreadCount={totalUnreadCount}
        onToggleSidebar={() => {
          if (isMobile) {
            setShowMobileSidebar(!showMobileSidebar);
          } else {
            setIsSidebarCollapsed(!isSidebarCollapsed);
          }
        }}
        onProfile={() => router.push("/profile")}
        onSettings={() => router.push("/settings")}
        onLogout={handleLogout}
        isMobile={isMobile}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop */}
        {!isMobile && (
          <Sidebar
            chats={chats}
            isCollapsed={isSidebarCollapsed}
            unreadCount={totalUnreadCount}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onCreateDirectChat={handleCreateDirectChat}
            onCreateGroupChat={handleCreateGroupChat}
          />
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && showMobileSidebar && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMobileSidebar(false)}
            />

            {/* Sidebar */}
            <div className="fixed left-0 top-16 bottom-16 w-80 z-50 transform transition-transform">
              <Sidebar
                chats={chats}
                unreadCount={totalUnreadCount}
                onCreateDirectChat={(userId) => {
                  handleCreateDirectChat(userId);
                  setShowMobileSidebar(false);
                }}
                onCreateGroupChat={(name, userIds, description) => {
                  handleCreateGroupChat(name, userIds, description);
                  setShowMobileSidebar(false);
                }}
              />
            </div>
          </>
        )}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">{children}</div>
      </div>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav
          unreadCount={totalUnreadCount}
          onTabChange={(tab) => {
            if (tab === "chats") {
              setShowMobileSidebar(true);
            } else {
              router.push(`/${tab}`);
            }
          }}
        />
      )}

      {/* Connection status */}
      {!isConnected && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 text-center">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Connecting to chat server...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
