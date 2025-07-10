// src/components/chat/new-chat-dialog.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  MessageCircle,
  X,
  Plus,
  Check,
  ArrowLeft,
  Camera,
  Loader2,
} from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getInitials } from "@/lib/utils";
import type { User } from "@/types/user";
import type { CreateChatRequest, ChatType } from "@/types/chat";

interface NewChatDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultTab?: "direct" | "group";
  children?: React.ReactNode;
}

interface UserSearchResult extends User {
  isSelected?: boolean;
}

type ChatStep = "select-type" | "select-users" | "group-details";

export function NewChatDialog({
  open,
  onOpenChange,
  defaultTab = "direct",
  children,
}: NewChatDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { createChat, getDirectChatWithUser } = useChat();

  const [isOpen, setIsOpen] = useState(open ?? false);
  const [currentStep, setCurrentStep] = useState<ChatStep>("select-type");
  const [chatType, setChatType] = useState<ChatType>(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Group chat details
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string>("");

  // Handle dialog state
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);

      if (!open) {
        // Reset state when dialog closes
        setCurrentStep("select-type");
        setChatType(defaultTab);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUsers([]);
        setGroupName("");
        setGroupDescription("");
        setGroupAvatar(null);
        setGroupAvatarPreview("");
      }
    },
    [onOpenChange, defaultTab]
  );

  // Search users - FIXED to use correct API
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Import and use the userApi directly
        const { userApi } = await import("@/lib/api");
        const results = await userApi.search(query);

        // Filter out current user
        const filteredResults = results.filter((u) => u.id !== user?.id);
        setSearchResults(filteredResults);
      } catch (error) {
        console.error("Failed to search users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [user?.id]
  );

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  // Handle user selection
  const handleUserSelect = (selectedUser: User) => {
    if (chatType === "direct") {
      // For direct chats, start chat immediately
      handleCreateDirectChat(selectedUser);
    } else {
      // For group chats, add to selection
      setSelectedUsers((prev) => {
        const isAlreadySelected = prev.some((u) => u.id === selectedUser.id);
        if (isAlreadySelected) {
          return prev.filter((u) => u.id !== selectedUser.id);
        } else {
          return [...prev, selectedUser];
        }
      });
    }
  };

  // Create direct chat
  const handleCreateDirectChat = async (otherUser: User) => {
    setIsCreating(true);
    try {
      // Check if direct chat already exists
      const existingChat = getDirectChatWithUser(otherUser.id);
      if (existingChat) {
        router.push(`/chat/${existingChat.id}`);
        handleOpenChange(false);
        return;
      }

      // Create new direct chat
      const request: CreateChatRequest = {
        type: "direct",
        participants: [otherUser.id],
      };

      const newChat = await createChat(request);
      router.push(`/chat/${newChat.id}`);
      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to create direct chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Proceed to group details
  const handleProceedToGroupDetails = () => {
    if (selectedUsers.length >= 1) {
      setCurrentStep("group-details");
    }
  };

  // Create group chat
  const handleCreateGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const request: CreateChatRequest = {
        type: "group",
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        participants: selectedUsers.map((u) => u.id),
      };

      const newChat = await createChat(request);

      // TODO: Upload group avatar if provided
      if (groupAvatar) {
        // Handle avatar upload
      }

      router.push(`/chat/${newChat.id}`);
      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to create group chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle group avatar selection
  const handleGroupAvatarSelect = (file: File) => {
    setGroupAvatar(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setGroupAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Go back to previous step
  const handleGoBack = () => {
    if (currentStep === "group-details") {
      setCurrentStep("select-users");
    } else if (currentStep === "select-users") {
      setCurrentStep("select-type");
    }
  };

  // Start new chat flow
  const handleStartNewChat = (type: ChatType) => {
    setChatType(type);
    setCurrentStep("select-users");
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "select-type":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <DialogTitle>Start a new chat</DialogTitle>
              <DialogDescription>
                Choose how you'd like to connect with others
              </DialogDescription>
            </div>

            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => handleStartNewChat("direct")}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Direct Message</div>
                    <div className="text-sm text-muted-foreground">
                      Start a private conversation
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => handleStartNewChat("group")}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Group Chat</div>
                    <div className="text-sm text-muted-foreground">
                      Create a group conversation
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        );

      case "select-users":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleGoBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <DialogTitle>
                  {chatType === "direct"
                    ? "Select contact"
                    : "Add participants"}
                </DialogTitle>
                <DialogDescription>
                  {chatType === "direct"
                    ? "Choose someone to start a conversation with"
                    : `Select people to add to your group (${selectedUsers.length} selected)`}
                </DialogDescription>
              </div>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selected users (for group chats) */}
            {chatType === "group" && selectedUsers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Selected participants
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="flex items-center gap-2 pr-1"
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(`${user.firstName} ${user.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{user.firstName}</span>
                      <button
                        onClick={() => handleUserSelect(user)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search results */}
            <ScrollArea className="h-64">
              {isSearching ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">
                    Searching...
                  </span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((searchUser) => {
                    const isSelected = selectedUsers.some(
                      (u) => u.id === searchUser.id
                    );

                    return (
                      <div
                        key={searchUser.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                          "hover:bg-accent",
                          isSelected && "bg-accent"
                        )}
                        onClick={() => handleUserSelect(searchUser)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={searchUser.avatar} />
                          <AvatarFallback>
                            {getInitials(
                              `${searchUser.firstName} ${searchUser.lastName}`
                            )}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {searchUser.firstName} {searchUser.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            @{searchUser.username}
                          </div>
                        </div>

                        {chatType === "group" && isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="text-center p-4 text-muted-foreground">
                  <div className="text-sm">No users found</div>
                  <div className="text-xs">Try a different search term</div>
                </div>
              ) : (
                <div className="text-center p-4 text-muted-foreground">
                  <div className="text-sm">
                    Start typing to search for users
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Continue button for group chats */}
            {chatType === "group" && selectedUsers.length > 0 && (
              <Button onClick={handleProceedToGroupDetails} className="w-full">
                Continue
              </Button>
            )}
          </div>
        );

      case "group-details":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleGoBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <DialogTitle>Group details</DialogTitle>
                <DialogDescription>
                  Set up your group chat with a name and photo
                </DialogDescription>
              </div>
            </div>

            {/* Group avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  {groupAvatarPreview ? (
                    <AvatarImage src={groupAvatarPreview} />
                  ) : (
                    <AvatarFallback>
                      <Users className="h-8 w-8" />
                    </AvatarFallback>
                  )}
                </Avatar>

                <label className="absolute -bottom-1 -right-1 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-3 w-3 text-primary-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGroupAvatarSelect(file);
                    }}
                  />
                </label>
              </div>

              <div className="flex-1">
                <Label htmlFor="group-name" className="text-sm font-medium">
                  Group name *
                </Label>
                <Input
                  id="group-name"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={25}
                  className="mt-1"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {groupName.length}/25 characters
                </div>
              </div>
            </div>

            {/* Group description */}
            <div className="space-y-2">
              <Label
                htmlFor="group-description"
                className="text-sm font-medium"
              >
                Description (optional)
              </Label>
              <Textarea
                id="group-description"
                placeholder="What's this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={512}
                rows={3}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground">
                {groupDescription.length}/512 characters
              </div>
            </div>

            {/* Selected participants preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Participants ({selectedUsers.length + 1})
              </Label>
              <div className="flex flex-wrap gap-2">
                {/* Current user */}
                <Badge variant="secondary" className="flex items-center gap-2">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-xs">
                      {user &&
                        getInitials(`${user.firstName} ${user.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">You (Admin)</span>
                </Badge>

                {/* Selected users */}
                {selectedUsers.map((participant) => (
                  <Badge
                    key={participant.id}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(
                          `${participant.firstName} ${participant.lastName}`
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{participant.firstName}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Create button */}
            <Button
              onClick={handleCreateGroupChat}
              disabled={!groupName.trim() || isCreating}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating group...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create group
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent className="sm:max-w-md">
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}
