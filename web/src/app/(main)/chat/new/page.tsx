// src/app/(main)/chat/new/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { userApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Search,
  Users,
  MessageSquare,
  Loader2,
  Plus,
  Check,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { User } from "@/types/user";
import type { CreateChatRequest } from "@/types/chat";

export default function NewChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createChat, getDirectChatWithUser } = useChat();

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [chatType, setChatType] = useState<"direct" | "group">("direct");

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await userApi.search(searchQuery);
        // Filter out current user
        const filteredUsers = searchResults.filter((u) => u.id !== user?.id);
        setUsers(filteredUsers);
      } catch (error) {
        console.error("Failed to search users:", error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  // Create direct chat
  const handleCreateDirectChat = async (otherUser: User) => {
    setIsCreating(true);
    try {
      // Check if chat already exists
      const existingChat = getDirectChatWithUser(otherUser.id);
      if (existingChat) {
        router.push(`/chat/${existingChat.id}`);
        return;
      }

      // Create new direct chat
      const request: CreateChatRequest = {
        type: "direct",
        participants: [otherUser.id],
      };

      const newChat = await createChat(request);
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      console.error("Failed to create direct chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle user selection for group chat
  const toggleUserSelection = (selectedUser: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === selectedUser.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== selectedUser.id);
      } else {
        return [...prev, selectedUser];
      }
    });
  };

  // Create group chat
  const handleCreateGroupChat = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const request: CreateChatRequest = {
        type: "group",
        name: `Group with ${selectedUsers.map((u) => u.firstName).join(", ")}`,
        participants: selectedUsers.map((u) => u.id),
      };

      const newChat = await createChat(request);
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      console.error("Failed to create group chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-16 border-b bg-background/95 backdrop-blur flex items-center px-4">
        <div className="flex items-center gap-3 flex-1">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">New Chat</h1>
        </div>

        {/* Chat type toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={chatType === "direct" ? "default" : "outline"}
            size="sm"
            onClick={() => setChatType("direct")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Direct
          </Button>
          <Button
            variant={chatType === "group" ? "default" : "outline"}
            size="sm"
            onClick={() => setChatType("group")}
          >
            <Users className="h-4 w-4 mr-2" />
            Group
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Selected users (for group chat) */}
      {chatType === "group" && selectedUsers.length > 0 && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Selected ({selectedUsers.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <Badge
                key={user.id}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <Avatar className="h-4 w-4">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-xs">
                    {getInitials(`${user.firstName} ${user.lastName}`)}
                  </AvatarFallback>
                </Avatar>
                {user.firstName}
                <button
                  onClick={() => toggleUserSelection(user)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* User list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No search query */}
          {!searchQuery.trim() && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Search for users to start a chat</p>
            </div>
          )}

          {/* No results */}
          {searchQuery.trim() && !isLoading && users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found matching "{searchQuery}"</p>
            </div>
          )}

          {/* User results */}
          {users.map((user) => {
            const isSelected = selectedUsers.some((u) => u.id === user.id);

            return (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                  "hover:bg-muted/50",
                  isSelected && "bg-muted"
                )}
                onClick={() => {
                  if (chatType === "direct") {
                    handleCreateDirectChat(user);
                  } else {
                    toggleUserSelection(user);
                  }
                }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>
                    {getInitials(`${user.firstName} ${user.lastName}`)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{user.username}
                  </p>
                </div>

                {chatType === "group" && (
                  <div className="flex items-center">
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                )}

                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Group chat actions */}
      {chatType === "group" && selectedUsers.length > 0 && (
        <div className="p-4 border-t">
          <Button
            onClick={handleCreateGroupChat}
            disabled={isCreating || selectedUsers.length === 0}
            className="w-full"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create Group Chat ({selectedUsers.length})
          </Button>
        </div>
      )}
    </div>
  );
}
