"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, MessageCircle, Loader2 } from "lucide-react";
import type { User } from "@/types/user";

interface NewChatDialogProps {
  trigger?: React.ReactNode;
  users?: User[];
  isSearching?: boolean;
  onSearchUsers?: (query: string) => void;
  onCreateDirectChat?: (userId: string) => void;
  onCreateGroupChat?: (
    name: string,
    userIds: string[],
    description?: string
  ) => void;
}

export function NewChatDialog({
  trigger,
  users = [],
  isSearching,
  onSearchUsers,
  onCreateDirectChat,
  onCreateGroupChat,
}: NewChatDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [activeTab, setActiveTab] = useState("direct");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearchUsers?.(query);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreateDirectChat = (userId: string) => {
    onCreateDirectChat?.(userId);
    setIsOpen(false);
    resetForm();
  };

  const handleCreateGroupChat = () => {
    if (groupName.trim() && selectedUsers.size > 0) {
      onCreateGroupChat?.(
        groupName.trim(),
        Array.from(selectedUsers),
        groupDescription.trim() || undefined
      );
      setIsOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSelectedUsers(new Set());
    setGroupName("");
    setGroupDescription("");
    setActiveTab("direct");
  };

  const filteredUsers = users.filter(
    (user) =>
      searchQuery === "" ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <MessageCircle className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
          <DialogDescription>
            Create a direct chat or group conversation
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Direct Chat</span>
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Group Chat</span>
            </TabsTrigger>
          </TabsList>

          {/* Search users */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          <TabsContent value="direct" className="space-y-4">
            <ScrollArea className="h-80">
              {isSearching ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex items-center justify-center p-8 text-center">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">No users found</p>
                    <p className="text-sm text-muted-foreground">
                      Try searching for a different name or username
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleCreateDirectChat(user.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {user.firstName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                      {user.isOnline && (
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="groupDescription">Description (Optional)</Label>
                <Textarea
                  id="groupDescription"
                  placeholder="Enter group description..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label>Select Members ({selectedUsers.size} selected)</Label>
                <ScrollArea className="h-60 border rounded-md p-2">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="flex items-center justify-center p-8 text-center">
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => toggleUserSelection(user.id)}
                        >
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-blue-600 text-white text-xs">
                              {user.firstName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreateGroupChat}
                disabled={!groupName.trim() || selectedUsers.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Group Chat
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
