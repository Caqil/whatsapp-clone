// src/components/layout/mobile-nav.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageSquare,
  Users,
  Phone,
  Settings,
  Search,
  Archive,
  Star,
  Bell,
  X,
  ChevronRight,
  User,
  LogOut,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { useTheme } from "../common/theme-provider";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  badge?: number;
  disabled?: boolean;
}

export function MobileNav({ isOpen, onClose, className }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { getTotalUnreadCount, getPinnedChats, getArchivedChats } = useChat();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const unreadCount = getTotalUnreadCount();
  const pinnedChats = getPinnedChats();
  const archivedChats = getArchivedChats();

  // Close nav on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when nav is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
      onClose();
    }
  };

  const mainNavItems: NavItem[] = [
    {
      label: "Chats",
      icon: MessageSquare,
      href: "/",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      label: "Contacts",
      icon: Users,
      href: "/contacts",
    },
    {
      label: "Calls",
      icon: Phone,
      href: "/calls",
      disabled: true, // Feature not implemented yet
    },
  ];

  const quickActions: NavItem[] = [
    {
      label: "Search",
      icon: Search,
      onClick: () => {
        // Implement search functionality
        onClose();
      },
    },
    {
      label: "Starred Messages",
      icon: Star,
      href: "/starred",
      disabled: true,
    },
    {
      label: "Archived Chats",
      icon: Archive,
      href: "/archived",
      badge: archivedChats.length > 0 ? archivedChats.length : undefined,
      disabled: true,
    },
  ];

  const settingsItems: NavItem[] = [
    {
      label: "Profile",
      icon: User,
      href: "/profile",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
    },
    {
      label: "Notifications",
      icon: Bell,
      href: "/settings/notifications",
      disabled: true,
    },
  ];

  const themeItems = [
    { label: "Light", value: "light", icon: Sun },
    { label: "Dark", value: "dark", icon: Moon },
    { label: "System", value: "system", icon: Monitor },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 lg:hidden"
        onClick={onClose}
      />

      {/* Navigation Panel */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-background border-r z-50 lg:hidden",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {/* User Profile Section */}
            <div className="p-4">
              <div
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleNavigation("/profile")}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>
                    {user
                      ? getInitials(`${user.firstName} ${user.lastName}`)
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {user ? `${user.firstName} ${user.lastName}` : "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.bio || "Hey there! I am using WhatsApp."}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <Separator />

            {/* Main Navigation */}
            <div className="p-4 space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Navigation
              </h3>
              {mainNavItems.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  isActive={pathname === item.href}
                  onClick={
                    item.href
                      ? () => handleNavigation(item.href!)
                      : item.onClick
                  }
                />
              ))}
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="p-4 space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              {quickActions.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  onClick={
                    item.href
                      ? () => handleNavigation(item.href!)
                      : item.onClick
                  }
                />
              ))}
            </div>

            <Separator />

            {/* Theme Selection */}
            <div className="p-4 space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Appearance
              </h3>
              {themeItems.map((themeItem) => (
                <button
                  key={themeItem.value}
                  onClick={() => setTheme(themeItem.value)}
                  className={cn(
                    "w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left",
                    theme === themeItem.value
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <themeItem.icon className="w-4 h-4" />
                  <span className="text-sm">{themeItem.label}</span>
                  {theme === themeItem.value && (
                    <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <Separator />

            {/* Settings */}
            <div className="p-4 space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Settings
              </h3>
              {settingsItems.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  isActive={pathname === item.href}
                  onClick={
                    item.href
                      ? () => handleNavigation(item.href!)
                      : item.onClick
                  }
                />
              ))}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="p-4 border-t space-y-2">
            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="w-4 h-4 mr-3" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// Navigation item component
function NavItem({
  item,
  isActive = false,
  onClick,
}: {
  item: NavItem;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      disabled={item.disabled}
      className={cn(
        "w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
        item.disabled && "hover:bg-transparent"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm flex-1">{item.label}</span>

      {/* Badge */}
      {item.badge && item.badge > 0 && (
        <Badge variant="secondary" className="h-5 min-w-[20px] px-1 text-xs">
          {item.badge > 99 ? "99+" : item.badge}
        </Badge>
      )}

      {/* Disabled indicator */}
      {item.disabled && (
        <span className="text-xs text-muted-foreground">Soon</span>
      )}

      {/* Arrow for navigation items */}
      {item.href && !item.disabled && (
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );
}

export default MobileNav;
