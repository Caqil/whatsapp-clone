// src/components/common/search-bar.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Filter, ArrowLeft, Clock, Trash2 } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useMessages } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { SearchLoading } from "@/components/common/loading-spinner";
import { cn, formatDistanceToNow } from '@/lib/utils';
import { getInitials } from "@/lib/utils";

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showFilters?: boolean;
}

type SearchFilter = "all" | "chats" | "messages" | "contacts" | "media";

interface SearchResult {
  type: "chat" | "message" | "contact";
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  timestamp?: string;
  chatId?: string;
  messagePreview?: string;
  matchText?: string;
  unreadCount?: number;
}

const SEARCH_HISTORY_KEY = "whatsapp_search_history";
const MAX_HISTORY_ITEMS = 10;

export function SearchBar({
  isOpen,
  onClose,
  placeholder = "Search conversations...",
  className,
  autoFocus = true,
  showFilters = true,
}: SearchBarProps) {
  const { user } = useAuth();
  const { searchChats, clearSearchResults, chats } = useChat();
  const { searchMessages } = useMessages();
  const isMobile = useIsMobile();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load search history on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const history = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    }
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && autoFocus && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoFocus]);

  // Clear results when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setShowHistory(true);
      clearSearchResults();
    }
  }, [isOpen, clearSearchResults]);

  // Debounced search
  const performSearch = useCallback(
    async (searchQuery: string, searchFilter: SearchFilter) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setShowHistory(true);
        return;
      }

      setIsSearching(true);
      setShowHistory(false);

      try {
        const searchResults: SearchResult[] = [];

        // Search chats
        if (searchFilter === "all" || searchFilter === "chats") {
          await searchChats(searchQuery);
          // Convert chat search results (this would need to be implemented in useChat)
          // For now, we'll search locally
          const chatResults = Array.from(chats.values())
            .filter((chat) => {
              const chatName =
                chat.type === "group"
                  ? chat.name
                  : chat.participants[0]?.firstName +
                    " " +
                    chat.participants[0]?.lastName;
              return chatName
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase());
            })
            .map((chat) => ({
              type: "chat" as const,
              id: chat.id,
              title:
                chat.type === "group"
                  ? chat.name || "Group Chat"
                  : chat.participants[0]?.firstName +
                      " " +
                      chat.participants[0]?.lastName || "Unknown",
              subtitle: chat.lastMessage?.content || "No messages yet",
              avatar: chat.avatar || chat.participants[0]?.avatar,
              timestamp: chat.lastMessage?.createdAt,
              unreadCount: chat.unreadCount,
            }));

          searchResults.push(...chatResults);
        }

        // Search messages
        if (searchFilter === "all" || searchFilter === "messages") {
          // This would search across all chats
          // For now, we'll implement a basic version
          for (const chat of chats.values()) {
            try {
              const messageResults = await searchMessages(chat.id, searchQuery);
              const convertedResults = messageResults.map((result) => ({
                type: "message" as const,
                id: result.message.id,
                title:
                  chat.type === "group"
                    ? chat.name || "Group Chat"
                    : chat.participants[0]?.firstName +
                        " " +
                        chat.participants[0]?.lastName || "Unknown",
                subtitle:
                  result.message.sender.firstName +
                  " " +
                  result.message.sender.lastName,
                avatar: chat.avatar || chat.participants[0]?.avatar,
                timestamp: result.message.createdAt,
                chatId: chat.id,
                messagePreview: result.message.content,
                matchText: result.matchText,
              }));
              searchResults.push(...convertedResults.slice(0, 3)); // Limit results per chat
            } catch (error) {
              // Skip chat if search fails
              continue;
            }
          }
        }

        // Search contacts (placeholder)
        if (searchFilter === "all" || searchFilter === "contacts") {
          // This would search your contacts
          // Implementation depends on your contacts system
        }

        setResults(searchResults.slice(0, 20)); // Limit total results
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchChats, searchMessages, chats]
  );

  // Handle search input
  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce search
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery, filter);
      }, 300);
    },
    [performSearch, filter]
  );

  // Add to search history
  const addToHistory = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return;

      const newHistory = [
        searchQuery,
        ...searchHistory.filter((item) => item !== searchQuery),
      ].slice(0, MAX_HISTORY_ITEMS);

      setSearchHistory(newHistory);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    },
    [searchHistory]
  );

  // Handle search submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        addToHistory(query.trim());
        performSearch(query.trim(), filter);
      }
    },
    [query, filter, addToHistory, performSearch]
  );

  // Handle result selection
  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      addToHistory(query);

      if (result.type === "chat") {
        // Navigate to chat
        window.location.href = `/chat/${result.id}`;
      } else if (result.type === "message") {
        // Navigate to chat and highlight message
        window.location.href = `/chat/${result.chatId}?message=${result.id}`;
      }

      onClose();
    },
    [query, addToHistory, onClose]
  );

  // Handle history item select
  const handleHistorySelect = useCallback(
    (historyItem: string) => {
      setQuery(historyItem);
      performSearch(historyItem, filter);
    },
    [performSearch, filter]
  );

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      {/* Search Container */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 bg-background border-b z-50",
          isMobile ? "h-full" : "max-h-96",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Search Header */}
          <div className="flex items-center p-4 space-x-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}

            <form onSubmit={handleSubmit} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={placeholder}
                  className="pl-10 pr-10"
                />
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSearch("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </form>

            {showFilters && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter Results</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {["all", "chats", "messages", "contacts", "media"].map(
                    (filterOption) => (
                      <DropdownMenuItem
                        key={filterOption}
                        onClick={() => setFilter(filterOption as SearchFilter)}
                        className={filter === filterOption ? "bg-accent" : ""}
                      >
                        {filterOption.charAt(0).toUpperCase() +
                          filterOption.slice(1)}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Search Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {isSearching ? (
                <div className="p-8">
                  <SearchLoading message="Searching..." />
                </div>
              ) : showHistory && searchHistory.length > 0 ? (
                /* Search History */
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Recent Searches
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>

                  <div className="space-y-1">
                    {searchHistory.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleHistorySelect(item)}
                        className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : results.length > 0 ? (
                /* Search Results */
                <div className="p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Search Results ({results.length})
                  </h3>

                  <div className="space-y-1">
                    {results.map((result) => (
                      <SearchResultItem
                        key={`${result.type}-${result.id}`}
                        result={result}
                        query={query}
                        onClick={() => handleResultSelect(result)}
                      />
                    ))}
                  </div>
                </div>
              ) : query && !isSearching ? (
                /* No Results */
                <div className="p-8 text-center">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-muted-foreground">
                    Try searching for a different term or check your spelling.
                  </p>
                </div>
              ) : null}
            </ScrollArea>
          </div>
        </div>
      </div>
    </>
  );
}

// Search result item component
function SearchResultItem({
  result,
  query,
  onClick,
}: {
  result: SearchResult;
  query: string;
  onClick: () => void;
}) {
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;

    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getResultIcon = () => {
    switch (result.type) {
      case "chat":
        return (
          <Avatar className="w-10 h-10">
            <AvatarImage src={result.avatar} />
            <AvatarFallback className="text-xs">
              {getInitials(result.title)}
            </AvatarFallback>
          </Avatar>
        );
      case "message":
        return (
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={result.avatar} />
              <AvatarFallback className="text-xs">
                {getInitials(result.title)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <Search className="w-2 h-2 text-primary-foreground" />
            </div>
          </div>
        );
      default:
        return (
          <Avatar className="w-10 h-10">
            <AvatarFallback className="text-xs">
              {getInitials(result.title)}
            </AvatarFallback>
          </Avatar>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      {getResultIcon()}

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="font-medium text-sm truncate">
            {highlightText(result.title, query)}
          </p>
          {result.unreadCount && result.unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="h-4 min-w-[16px] px-1 text-xs"
            >
              {result.unreadCount}
            </Badge>
          )}
        </div>

        {result.subtitle && (
          <p className="text-xs text-muted-foreground truncate">
            {result.type === "message" ? `${result.subtitle}: ` : ""}
            {result.messagePreview
              ? highlightText(result.messagePreview, query)
              : result.subtitle}
          </p>
        )}
      </div>

      {result.timestamp && (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(result.timestamp))}
        </span>
      )}
    </button>
  );
}

export default SearchBar;
