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

      // Ensure chats is an array before using find
      const chatsArray = Array.isArray(chats) ? chats : [];

      // Find and select the new chat
      const newChat = chatsArray.find(
        (chat) =>
          chat.type === "direct" &&
          chat.participants.some((p) => p.id === userId)
      );

      if (newChat) {
        router.push(`/chat/${newChat.id}`);
      } else {
        // Fallback to the returned chat ID
        router.push(`/chat/${chat.id}`);
      }

      toast.success("Chat created successfully");
    } catch (error) {
      console.error("Failed to create direct chat:", error);
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
      console.error("Failed to create group chat:", error);
      toast.error("Failed to create group chat");
    }
  };

  // Ensure user has required properties
  const safeUser = user
    ? {
        ...user,
        username: user.username || user.firstName || user.email || "User",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        user={safeUser}
        onLogout={handleLogout}
        onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)}
        isMobile={isMobile}
      />

      <div className="flex">
        {/* Mobile Navigation */}
        {isMobile && (
          <MobileNav
            chats={chats}
            isOpen={showMobileSidebar}
            onClose={() => setShowMobileSidebar(false)}
            onCreateDirectChat={handleCreateDirectChat}
            onCreateGroupChat={handleCreateGroupChat}
          />
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sidebar
            chats={chats}
            selectedChatId={null}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onCreateDirectChat={handleCreateDirectChat}
            onCreateGroupChat={handleCreateGroupChat}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
