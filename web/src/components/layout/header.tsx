// src/components/layout/header.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Settings,
  LogOut,
  User,
  Moon,
  Sun,
  Monitor,
  Bell,
  BellOff,
  Menu,
  MoreVertical,
  Phone,
  Video,
  Info,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { useIsMobile } from "@/hooks/use-media-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { useTheme } from "../common/theme-provider";

interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
  className?: string;
}

export function Header({
  onToggleSidebar,
  onOpenSearch,
  className,
}: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const { currentChat, getTotalUnreadCount } = useChat();
  const isMobile = useIsMobile();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const unreadCount = getTotalUnreadCount();

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

  const handleSettings = () => {
    router.push("/settings");
  };

  const handleProfile = () => {
    router.push("/profile");
  };

  const getThemeIcon = (themeValue: string) => {
    switch (themeValue) {
      case "light":
        return <Sun className="w-4 h-4" />;
      case "dark":
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <header
      className={cn(
        "h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-40",
        "flex items-center justify-between px-4",
        className
      )}
    >
      {/* Left Section */}
      <div className="flex items-center space-x-3">
        {/* Mobile Menu Toggle */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* App Logo/Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>

          {!isMobile && (
            <div>
              <h1 className="font-semibold text-lg">WhatsApp Web</h1>
            </div>
          )}
        </div>

        {/* Current Chat Info (Mobile) */}
        {isMobile && currentChat && (
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentChat.avatar} />
              <AvatarFallback className="text-xs">
                {getInitials(currentChat.name || "Chat")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">
                {currentChat.type === "group"
                  ? currentChat.name
                  : currentChat.participants[0]?.firstName +
                    " " +
                    currentChat.participants[0]?.lastName}
              </p>
              {currentChat.isTyping && (
                <p className="text-xs text-green-500">typing...</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center Section (Desktop) */}
      {!isMobile && (
        <div className="flex-1 max-w-md mx-8">
          <Button
            variant="outline"
            onClick={onOpenSearch}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Search className="w-4 h-4 mr-2" />
            Search conversations...
          </Button>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {/* Connection Status */}
        {/* <ConnectionStatus /> */}

        {/* Current Chat Actions (Mobile) */}
        {isMobile && currentChat && (
          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <Video className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Video Call</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <Phone className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Voice Call</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Search (Mobile) */}
        {isMobile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSearch}
                className="w-8 h-8"
              >
                <Search className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search</TooltipContent>
          </Tooltip>
        )}

        {/* Notifications Badge */}
        {unreadCount > 0 && (
          <div className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          </div>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-1 h-auto">
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="text-xs">
                    {user
                      ? getInitials(`${user.firstName} ${user.lastName}`)
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                {!isMobile && (
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* User Info */}
            <DropdownMenuLabel className="flex items-center space-x-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs">
                  {user
                    ? getInitials(`${user.firstName} ${user.lastName}`)
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Profile */}
            <DropdownMenuItem onClick={handleProfile}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>

            {/* Settings */}
            <DropdownMenuItem onClick={handleSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>

            {/* Theme Selector */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {getThemeIcon(theme || "system")}
                <span className="ml-2">Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="w-4 h-4 mr-2" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="w-4 h-4 mr-2" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="w-4 h-4 mr-2" />
                  System
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
