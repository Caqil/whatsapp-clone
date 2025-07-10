"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Users, Search, Plus, X, Link } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGroupManagement } from "@/hooks/use-group-management";
import type { User } from "@/types/user";

interface NewChatDialogProps {
  trigger: React.ReactNode;
  users?: User[];
  onCreateDirectChat?: (userId: string) => void;
  onCreateGroupChat?: (
    name: string,
    userIds: string[],
    description?: string
  ) => void;
  onJoinViaInvite?: (inviteCode: string) => void;
}

export function NewChatDialog({
  trigger,
  users = [],
  onCreateDirectChat,
  onCreateGroupChat,
  onJoinViaInvite,
}: NewChatDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("direct");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const { user } = useAuth();
  const { joinViaInvite, isLoading } = useGroupManagement();

  // Filter users based on search
  const filteredUsers = users.filter(
    (u) =>
      u.id !== user?.id && // Exclude current user
      (u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUserSelect = (selectedUser: User) => {
    if (activeTab === "direct") {
      onCreateDirectChat?.(selectedUser.id);
      setIsOpen(false);
    } else {
      setSelectedUsers((prev) => {
        const isSelected = prev.some((u) => u.id === selectedUser.id);
        if (isSelected) {
          return prev.filter((u) => u.id !== selectedUser.id);
        } else {
          return [...prev, selectedUser];
        }
      });
    }
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      onCreateGroupChat?.(
        groupName.trim(),
        selectedUsers.map((u) => u.id),
        groupDescription.trim() || undefined
      );
      setIsOpen(false);
      resetForm();
    }
  };

  const handleJoinViaInvite = async () => {
    if (inviteCode.trim()) {
      try {
        await joinViaInvite(inviteCode.trim());
        setIsOpen(false);
        resetForm();
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSelectedUsers([]);
    setGroupName("");
    setGroupDescription("");
    setInviteCode("");
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Join
            </TabsTrigger>
          </TabsList>

          {/* Direct Chat Tab */}
          <TabsContent value="direct" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} alt={user.firstName} />
                      <AvatarFallback>
                        {user.firstName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Group Chat Tab */}
          <TabsContent value="group" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group name</Label>
                <Input
                  id="groupName"
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupDescription">Description (optional)</Label>
                <Textarea
                  id="groupDescription"
                  placeholder="Enter group description..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Selected members ({selectedUsers.length})</Label>
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {user.firstName} {user.lastName}
                        <button
                          onClick={() => removeSelectedUser(user.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="memberSearch">Add members</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="memberSearch"
                    placeholder="Search users to add..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUsers.some(
                      (u) => u.id === user.id
                    );
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer"
                      >
                        <Checkbox checked={isSelected} />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.firstName} />
                          <AvatarFallback>
                            {user.firstName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
              >
                Create Group
              </Button>
            </div>
          </TabsContent>

          {/* Join via Invite Tab */}
          <TabsContent value="invite" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite code or link</Label>
                <Input
                  id="inviteCode"
                  placeholder="Enter invite code or paste invite link..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                You can join a group by entering the invite code or pasting the
                full invite link.
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleJoinViaInvite}
                disabled={!inviteCode.trim() || isLoading}
              >
                {isLoading ? "Joining..." : "Join Group"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
