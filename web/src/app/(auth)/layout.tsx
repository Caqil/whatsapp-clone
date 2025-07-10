"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only act when auth is fully initialized
    if (!isInitialized) {
      return;
    }

    // If user is authenticated, redirect to main app
    if (isAuthenticated) {
      router.replace("/chat");
    }
  }, [isAuthenticated, isInitialized, router]);

  // Show loading while auth initializes
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show auth pages to authenticated users
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Redirecting to chat...
          </p>
        </div>
      </div>
    );
  }

  // Show auth pages for non-authenticated users
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Auth content area */}
        <div className="flex-1 flex flex-col justify-center px-6 py-8 lg:px-12">
          <div className="w-full max-w-md mx-auto">
            {/* Branding */}
            <div className="text-center mb-8">
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
          </div>
        </div>
      </div>
    </div>
  );
}
