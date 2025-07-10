"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Search, X, Loader2, MessageCircle, Users } from "lucide-react";
import type { ChatWithUsers } from "@/types/chat";
import type { User } from "@/types/user";

interface SearchResult {
  type: "chat" | "user" | "message";
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  data: any;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSelectResult?: (result: SearchResult) => void;
  results?: SearchResult[];
  isLoading?: boolean;
  className?: string;
}

export function SearchBar({
  placeholder = "Search chats and messages...",
  onSearch,
  onSelectResult,
  results = [],
  isLoading,
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle search input with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        onSearch?.(query.trim());
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, onSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setFocusedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
  };

  const handleInputBlur = () => {
    // Delay to allow for result clicks
    setTimeout(() => setIsExpanded(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isExpanded || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && results[focusedIndex]) {
          handleSelectResult(results[focusedIndex]);
        }
        break;
      case "Escape":
        setIsExpanded(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    onSelectResult?.(result);
    setQuery("");
    setIsExpanded(false);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setQuery("");
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "chat":
        return <MessageCircle className="h-4 w-4 text-blue-600" />;
      case "user":
        return <Users className="h-4 w-4 text-green-600" />;
      case "message":
        return <Search className="h-4 w-4 text-orange-600" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-6 w-6 p-0 -translate-y-1/2"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search results dropdown */}
      {isExpanded && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-80 overflow-hidden">
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching...
                </span>
              </div>
            ) : results.length === 0 ? (
              <div className="flex items-center justify-center p-4">
                <div className="text-center">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No results found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try a different search term
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-2 cursor-pointer transition-colors",
                      index === focusedIndex
                        ? "bg-blue-50 dark:bg-blue-950/20"
                        : "hover:bg-muted"
                    )}
                    onClick={() => handleSelectResult(result)}
                  >
                    {/* Avatar or icon */}
                    {result.avatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={result.avatar} />
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {result.title.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {getResultIcon(result.type)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-sm truncate">
                          {result.title}
                        </p>
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            result.type === "chat" &&
                              "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                            result.type === "user" &&
                              "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                            result.type === "message" &&
                              "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                          )}
                        >
                          {result.type}
                        </span>
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
