"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, MessageCircle, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { chatApi, userApi, messageApi } from "@/lib/api";
import type { ChatWithUsers } from "@/types/chat";
import type { User } from "@/types/user";

export default function ChatPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // State management
  const [chats, setChats] = useState<ChatWithUsers[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatWithUsers | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Load chats when component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      loadChats();
    }
  }, [isAuthenticated, user]);

  // Load user's chats
  const loadChats = useCallback(async () => {
    try {
      setIsLoadingChats(true);
      console.log("📱 Loading chats...");

      const response = await chatApi.getUserChats();
      console.log("✅ Chats loaded:", response);

      setChats(response || []);
    } catch (error: any) {
      console.error("❌ Error loading chats:", error);
      toast.error(error.response?.data?.message || "Failed to load chats");
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      console.log("🔍 Searching users:", query);

      const response = await userApi.searchUsers(query);
      console.log("✅ Users found:", response);

      setSearchResults(response || []);
    } catch (error: any) {
      console.error("❌ Error searching users:", error);
      toast.error(error.response?.data?.message || "Failed to search users");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 0) {
      setShowUserSearch(true);
      searchUsers(query);
    } else {
      setShowUserSearch(false);
      setSearchResults([]);
    }
  };

  // Create direct chat
  const createDirectChat = useCallback(
    async (userId: string) => {
      try {
        console.log("💬 Creating direct chat with user:", userId);

        const response = await chatApi.createChat({
          type: "direct",
          participants: [userId],
        });

        console.log("✅ Direct chat created:", response);
        toast.success("Chat created successfully!");

        // Reload chats and select the new chat
        await loadChats();
        setShowUserSearch(false);
        setSearchQuery("");
        setSearchResults([]);

        // Find and select the new chat
        const newChat = chats.find(
          (chat) =>
            chat.type === "direct" &&
            chat.participants.some((p) => p.id === userId)
        );

        if (newChat) {
          setSelectedChat(newChat);
          loadMessages(newChat.id);
        }
      } catch (error: any) {
        console.error("❌ Error creating direct chat:", error);
        toast.error(error.response?.data?.message || "Failed to create chat");
      }
    },
    [chats, loadChats]
  );

  // Load messages for a chat
  const loadMessages = useCallback(async (chatId: string) => {
    try {
      setIsLoadingMessages(true);
      console.log("📨 Loading messages for chat:", chatId);

      const response = await messageApi.getChatMessages(chatId);
      console.log("✅ Messages loaded:", response);

      setMessages(response || []);
    } catch (error: any) {
      console.error("❌ Error loading messages:", error);
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Handle chat selection
  const handleChatSelect = useCallback(
    (chat: ChatWithUsers) => {
      console.log("📱 Selecting chat:", chat.id);
      setSelectedChat(chat);
      loadMessages(chat.id);
      setShowUserSearch(false);
      setSearchQuery("");

      // Navigate to chat URL
      router.push(`/chat/${chat.id}`);
    },
    [router, loadMessages]
  );

  // Send message
  const sendMessage = useCallback(async () => {
    if (!selectedChat || !newMessage.trim()) return;

    try {
      console.log("📤 Sending message:", newMessage);

      const response = await messageApi.sendMessage({
        chatId: selectedChat.id,
        content: newMessage.trim(),
        type: "text",
      });

      console.log("✅ Message sent:", response);
      setNewMessage("");

      // Add message to local state
      setMessages((prev) => [...prev, response]);
    } catch (error: any) {
      console.error("❌ Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  }, [selectedChat, newMessage]);

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get display name for chat
  const getChatDisplayName = (chat: ChatWithUsers): string => {
    if (chat.type === "group") {
      return chat.name || "Group Chat";
    }

    const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
    return otherParticipant
      ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
      : "Unknown User";
  };

  // Get chat avatar
  const getChatAvatar = (chat: ChatWithUsers): string => {
    if (chat.avatar) return chat.avatar;
    if (chat.type === "group") return "";

    const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
    return otherParticipant?.avatar || "";
  };

  // Get chat initials
  const getChatInitials = (chat: ChatWithUsers): string => {
    if (chat.type === "group") {
      return chat.name?.charAt(0).toUpperCase() || "G";
    }

    const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
    return otherParticipant?.firstName?.charAt(0).toUpperCase() || "U";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-card border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">Chats</h1>
              <Button
                size="sm"
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {/* User search results */}
          {showUserSearch && (
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-medium mb-3">Search Results</h3>
              <ScrollArea className="h-48">
                {isSearching ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => createDirectChat(user.id)}
                      >
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
                ) : searchQuery ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Type to search for users
                  </p>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Chat List */}
          <ScrollArea className="flex-1">
            {isLoadingChats ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : chats.length > 0 ? (
              <div className="space-y-0">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-4 hover:bg-muted cursor-pointer transition-colors ${
                      selectedChat?.id === chat.id ? "bg-muted" : ""
                    }`}
                    onClick={() => handleChatSelect(chat)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={getChatAvatar(chat)} />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {getChatInitials(chat)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {getChatDisplayName(chat)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.lastMessage?.content || "No messages yet"}
                        </p>
                      </div>
                      {chat.unreadCount > 0 && (
                        <div className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No chats yet. Start a new conversation!
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-border bg-background flex items-center px-6">
                <Avatar className="h-10 w-10 mr-4">
                  <AvatarImage src={getChatAvatar(selectedChat)} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {getChatInitials(selectedChat)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">
                    {getChatDisplayName(selectedChat)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedChat.type === "group"
                      ? `${selectedChat.participants.length} participants`
                      : "Direct message"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={message.id || index}
                        className={`flex ${
                          message.senderId === user?.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderId === user?.id
                              ? "bg-blue-600 text-white"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No messages yet</p>
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t border-border p-4">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Welcome to Chat</h3>
                <p className="text-muted-foreground">
                  Select a chat to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
