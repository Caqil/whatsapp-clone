// src/app/(auth)/layout.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Shield, Globe, Smartphone, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { APP_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Security feature highlights
const securityFeatures = [
  {
    icon: Shield,
    title: "End-to-End Encryption",
    description: "Your messages are secured with industry-standard encryption",
    color:
      "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20",
  },
  {
    icon: Globe,
    title: "Cross-Platform",
    description: "Access your chats from any device, anywhere",
    color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20",
  },
  {
    icon: Zap,
    title: "Instant Sync",
    description: "Real-time message delivery across all your devices",
    color:
      "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20",
  },
];

// Animated background component
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-muted/5" />

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />

      {/* Floating geometric shapes */}
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "6s", animationDelay: "2s" }}
      />

      {/* Subtle floating dots */}
      <div className="absolute inset-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Features sidebar component
function FeaturesSidebar() {
  return (
    <div className="hidden lg:flex lg:flex-col lg:justify-center lg:px-12 lg:w-1/2 xl:w-3/5">
      <div className="max-w-lg">
        {/* App branding */}
        <div className="mb-12">
          <div className="flex items-center mb-6">
            <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center mr-4 shadow-sm">
              <MessageSquare className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {APP_CONFIG.NAME}
              </h1>
              <p className="text-muted-foreground text-sm font-medium">Web</p>
            </div>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed">
            Stay connected with friends and family. Send messages, share photos,
            and make calls from your computer.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-6">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <div
                key={index}
                className="flex items-start space-x-4 p-4 rounded-xl bg-card border border-border/50 hover:border-border transition-all duration-200 hover:shadow-sm"
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                    feature.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy notice */}
        <div className="mt-12 p-4 bg-muted/30 rounded-xl border border-border/50">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-2 text-foreground">
                Privacy & Security
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your personal messages are protected with end-to-end encryption.
                Only you and the person you're communicating with can read them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main auth layout component
export default function AuthLayout({ children }: AuthLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render auth pages for authenticated users
  if (isAuthenticated) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Features sidebar (desktop only) */}
        <FeaturesSidebar />

        {/* Auth content area */}
        <div className="flex-1 flex flex-col justify-center px-6 py-8 lg:px-12 lg:w-1/2 xl:w-2/5">
          <div className="w-full max-w-md mx-auto">
            {/* Mobile branding */}
            <div className="lg:hidden text-center mb-8">
              <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MessageSquare className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-foreground">
                {APP_CONFIG.NAME}
              </h1>
              <p className="text-muted-foreground">
                Stay connected with your world
              </p>
            </div>

            {/* Auth form content */}
            <div className="space-y-6">{children}</div>

            {/* Footer links */}
            <div className="mt-8 text-center space-y-4">
              <div className="flex justify-center items-center space-x-4 text-sm text-muted-foreground">
                <a
                  href="/privacy"
                  className="hover:text-foreground transition-colors duration-200"
                >
                  Privacy Policy
                </a>
                <span className="text-muted-foreground/50">•</span>
                <a
                  href="/terms"
                  className="hover:text-foreground transition-colors duration-200"
                >
                  Terms of Service
                </a>
                <span className="text-muted-foreground/50">•</span>
                <a
                  href="/help"
                  className="hover:text-foreground transition-colors duration-200"
                >
                  Help
                </a>
              </div>

              <p className="text-xs text-muted-foreground">
                {APP_CONFIG.NAME} v{APP_CONFIG.VERSION}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile security features banner */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 shadow-lg">
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Secure messaging with end-to-end encryption
          </p>
          <div className="flex justify-center items-center space-x-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Encrypted
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Cross-platform
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Real-time
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
