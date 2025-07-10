// src/app/not-found.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Home,
  Search,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Compass,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/constants";

// Animated 404 illustration
function AnimatedIllustration() {
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFloating((prev) => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex items-center justify-center mb-8">
      {/* Main 404 number */}
      <div className="text-9xl font-bold text-muted-foreground/20 select-none">
        404
      </div>

      {/* Floating message bubble */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "transition-transform duration-2000 ease-in-out",
          isFloating ? "translate-y-[-10px]" : "translate-y-[10px]"
        )}
      >
        <div className="relative">
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg">
            <MessageSquare className="h-8 w-8" />
          </div>

          {/* Message bubble tail */}
          <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
        </div>
      </div>

      {/* Scattered dots */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-2 h-2 bg-primary/30 rounded-full",
              "animate-pulse"
            )}
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Quick navigation suggestions
function QuickNavigation() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const quickLinks = [
    {
      title: "Home",
      description: "Go back to your chats",
      icon: Home,
      href: "/",
      color: "text-blue-500",
    },
    {
      title: "Recent Chats",
      description: "View your recent conversations",
      icon: Clock,
      href: "/",
      color: "text-green-500",
    },
    {
      title: "Explore",
      description: "Discover new features",
      icon: Compass,
      href: "/",
      color: "text-purple-500",
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Search bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search for something else
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search chats, contacts, or messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!searchQuery.trim()}>
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick navigation links */}
      <div className="grid md:grid-cols-3 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;

          return (
            <Link key={link.href} href={link.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4",
                      "bg-muted group-hover:bg-muted/80 transition-colors"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", link.color)} />
                  </div>

                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                    {link.title}
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    {link.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Help and support section
function HelpSection() {
  const helpItems = [
    {
      question: "Lost a conversation?",
      answer:
        "Check your archived chats or try searching for the contact name.",
    },
    {
      question: "Looking for settings?",
      answer:
        "Access settings through your profile menu in the top navigation.",
    },
    {
      question: "Need to start a new chat?",
      answer: "Click the new chat button and search for contacts.",
    },
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Common Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {helpItems.map((item, index) => (
          <div key={index} className="pb-4 last:pb-0 border-b last:border-b-0">
            <h4 className="font-medium mb-2">{item.question}</h4>
            <p className="text-sm text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Main 404 page component
export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Auto redirect countdown
  useEffect(() => {
    if (!autoRedirect) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router, autoRedirect]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with app branding */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">{APP_CONFIG.NAME}</span>
          </Link>

          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center space-y-8">
        {/* Animated illustration */}
        <AnimatedIllustration />

        {/* Error message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-lg text-muted-foreground max-w-md">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>

        {/* Auto redirect notification */}
        {autoRedirect && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              Redirecting to home in {countdown} seconds
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRedirect(false)}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Quick navigation */}
        <QuickNavigation />

        {/* Help section */}
        <HelpSection />
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {APP_CONFIG.NAME} v{APP_CONFIG.VERSION} • Built with Next.js
          </p>
        </div>
      </footer>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
