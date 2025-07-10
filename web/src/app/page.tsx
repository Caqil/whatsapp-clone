"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to initialize before making any decisions
    if (isLoading) {
      return;
    }

    // Only redirect once when auth state is determined
    if (isAuthenticated) {
      // User is logged in, go to main chat page
      router.replace("/chat");
    } else {
      // User is not logged in, go to login
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Always show loading on root page
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">
          {isLoading ? "Loading..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
}
