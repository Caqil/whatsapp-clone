// src/app/(auth)/layout.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Shield, Globe, Smartphone } from "lucide-react";
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
  },
  {
    icon: Globe,
    title: "Cross-Platform",
    description: "Access your chats from any device, anywhere",
  },
  {
    icon: Smartphone,
    title: "Mobile Integration",
    description: "Seamlessly sync with your mobile WhatsApp",
  },
];

// Animated background component
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      {/* Floating elements */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-2 h-2 bg-primary/10 rounded-full",
              "animate-pulse"
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Geometric shapes */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" />

      {/* Message bubble decoration */}
      <div className="absolute top-20 right-20 opacity-20">
        <div className="relative">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-8 h-8" />
          </div>
          {/* Bubble tail */}
          <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-primary/20" />
        </div>
      </div>
    </div>
  );
}

// Features sidebar component
function FeaturesSidebar() {
  return (
    <div className="hidden lg:flex lg:flex-col lg:justify-center lg:px-12 lg:w-1/2">
      <div className="max-w-md">
        {/* App branding */}
        <div className="mb-12">
          <div className="flex items-center mb-6">
            <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center mr-4">
              <MessageSquare className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{APP_CONFIG.NAME}</h1>
              <p className="text-muted-foreground text-sm">Web</p>
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
                className="flex items-start space-x-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy notice */}
        <div className="mt-12 p-4 bg-muted/20 rounded-lg border border-muted">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-sm mb-1">Privacy & Security</h4>
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Features sidebar (desktop only) */}
        <FeaturesSidebar />

        {/* Auth content area */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 lg:w-1/2">
          <div className="w-full max-w-sm mx-auto">
            {/* Mobile branding */}
            <div className="lg:hidden text-center mb-8">
              <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{APP_CONFIG.NAME}</h1>
              <p className="text-muted-foreground">
                Stay connected with your world
              </p>
            </div>

            {/* Auth form content */}
            <div className="space-y-6">{children}</div>

            {/* Footer links */}
            <div className="mt-8 text-center space-y-2">
              <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
                <a
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </a>
                <a
                  href="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms of Service
                </a>
                <a
                  href="/help"
                  className="hover:text-foreground transition-colors"
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

      {/* Mobile features (bottom sheet style) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Secure messaging with end-to-end encryption
          </p>
          <div className="flex justify-center space-x-4 text-xs text-muted-foreground">
            <span className="flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              Encrypted
            </span>
            <span className="flex items-center">
              <Globe className="w-3 h-3 mr-1" />
              Cross-platform
            </span>
            <span className="flex items-center">
              <Smartphone className="w-3 h-3 mr-1" />
              Mobile sync
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
