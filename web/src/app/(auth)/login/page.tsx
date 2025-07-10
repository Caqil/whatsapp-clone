"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, verifyMagicLink } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    // Add debug logging
    console.log("🔍 Login Page Effect:", {
      token: token ? "Present" : "Not present",
      isAuthenticated,
      isLoading,
      isVerifying,
    });

    // If user is already authenticated, redirect to chat
    if (isAuthenticated && !isLoading) {
      console.log("✅ User is authenticated, redirecting to chat");
      router.replace("/chat");
      return;
    }

    // If we have a token, verify it
    if (token && !isVerifying) {
      console.log("🔗 Found token, starting verification");
      setIsVerifying(true);

      verifyMagicLink(token)
        .then((response) => {
          // Success - user is now logged in
          console.log("✅ Magic link verified successfully:", response);
          toast.success("Magic link verified successfully!");

          // Debug: Check if tokens are stored
          const accessToken = localStorage.getItem("auth_access_token");
          const refreshToken = localStorage.getItem("auth_refresh_token");
          console.log("💾 Tokens after verification:", {
            accessToken: accessToken ? "✅ Present" : "❌ Missing",
            refreshToken: refreshToken ? "✅ Present" : "❌ Missing",
          });

          router.replace("/chat");
        })
        .catch((error) => {
          // Handle verification error
          console.error("❌ Magic link verification failed:", error);

          // Check if user needs to register
          if (error.response?.status === 412) {
            // Precondition Required
            const requiresRegistration =
              error.response?.data?.data?.requiresRegistration;
            if (requiresRegistration) {
              // Redirect to registration with token
              router.replace(`/register?token=${encodeURIComponent(token)}`);
              return;
            }
          }

          // Show error and stay on login page
          toast.error("Magic link verification failed. Please try again.");
          // Clear the token from URL
          router.replace("/login");
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [
    searchParams,
    isAuthenticated,
    isLoading,
    verifyMagicLink,
    router,
    isVerifying,
  ]);

  // Show loading while verifying token
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying magic link...</p>
        </div>
      </div>
    );
  }

  // Show auth tabs if not authenticated and not verifying
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <AuthTabs />
      </div>
    );
  }

  // Show loading while auth is initializing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
