// src/app/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, isInitialized } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current || !isInitialized || pathname !== "/") {
      return;
    }

    // Only redirect from the root path
    if (isAuthenticated && user) {
      console.log("User authenticated, redirecting to chat");
      hasRedirected.current = true;
      router.replace("/chat");
    } else if (!isLoading && !isAuthenticated) {
      console.log("User not authenticated, redirecting to login");
      hasRedirected.current = true;
      router.replace("/login");
    }
  }, [user, isLoading, isAuthenticated, isInitialized, router, pathname]);

  // Don't render anything if we're not on the root path
  if (pathname !== "/") {
    return null;
  }

  // Show loading while checking auth status or redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
