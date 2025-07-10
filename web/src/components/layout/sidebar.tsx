"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  Users,
  Settings,
  Archive,
  Star,
  Plus,
  ChevronLeft,
  Phone,
} from "lucide-react";
import { SearchBar } from "./search-bar";
import { ChatList } from "../chat/chat-list";
import { NewChatDialog } from "../chat/new-chat-dialog";
import type { ChatWithUsers } from "@/types/chat";
import type { User } from "@/types/user";

interface SidebarProps {
  chats?: ChatWithUsers[];
  selectedChatId?: string | null;
  users?: User[];
  isCollapsed?: boolean;
  unreadCount?: number;
  onChatSelect?: (chat: ChatWithUsers) => void;
  onToggleCollapse?: () => void;
  onSearchUsers?: (query: string) => void;
  onCreateDirectChat?: (userId: string) => void;
  onCreateGroupChat?: (
    name: string,
    userIds: string[],
    description?: string
  ) => void;
  className?: string;
}

const sidebarItems = [
  {
    id: "chats",
    label: "All Chats",
    icon: MessageCircle,
    badge: true,
  },
  {
    id: "starred",
    label: "Starred",
    icon: Star,
    badge: false,
  },
  {
    id: "archived",
    label: "Archived",
    icon: Archive,
    badge: false,
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: Users,
    badge: false,
  },
];

export function Sidebar({
  chats = [],
  selectedChatId,
  users = [],
  isCollapsed = false,
  unreadCount = 0,
  onChatSelect,
  onToggleCollapse,
  onSearchUsers,
  onCreateDirectChat,
  onCreateGroupChat,
  className,
}: SidebarProps) {
  const [activeSection, setActiveSection] = useState("chats");

  const getFilteredChats = () => {
    switch (activeSection) {
      case "starred":
        return chats.filter((chat) => chat.isPinned);
      case "archived":
        return chats.filter((chat) => chat.isArchived);
      default:
        return chats.filter((chat) => !chat.isArchived);
    }
  };

  const getSectionBadgeCount = (sectionId: string) => {
    switch (sectionId) {
      case "chats":
        return unreadCount;
      case "starred":
        return chats
          .filter((chat) => chat.isPinned && chat.unreadCount > 0)
          .reduce((sum, chat) => sum + chat.unreadCount, 0);
      default:
        return 0;
    }
  };

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "w-16 border-r border-border bg-background flex flex-col",
          className
        )}
      >
        {/* Expand button */}
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full h-10"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>

        <Separator />

        {/* Navigation items */}
        <div className="flex-1 py-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const badgeCount = getSectionBadgeCount(item.id);

            return (
              <div key={item.id} className="px-2 mb-1">
                <Button
                  variant={activeSection === item.id ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full h-10 relative"
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  {item.badge && badgeCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center"
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </Badge>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-80 border-r border-border bg-background flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Messages</h2>
          <div className="flex items-center space-x-1">
            <NewChatDialog
              trigger={
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                </Button>
              }
              users={users}
              onCreateDirectChat={onCreateDirectChat}
              onCreateGroupChat={onCreateGroupChat}
            />
            <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <SearchBar
          placeholder="Search chats..."
          onSearch={(query) => {
            // Handle search logic here
            console.log("Searching:", query);
          }}
        />
      </div>

      {/* Navigation */}
      <div className="px-2 py-2 border-b border-border">
        <div className="flex flex-col space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badgeCount = getSectionBadgeCount(item.id);

            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className="justify-start relative"
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && badgeCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Chat list */}
      <ChatList
        chats={getFilteredChats()}
        selectedChatId={selectedChatId}
        onChatSelect={onChatSelect}
      />
    </div>
  );
}
