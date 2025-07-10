// src/app/verify/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Mail,
  ArrowRight,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";

type VerificationState =
  | "verifying"
  | "success"
  | "registration_required"
  | "error";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    verifyMagicLink,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const [state, setState] = useState<VerificationState>("verifying");
  const [error, setError] = useState<string | null>(null);
  const [registrationToken, setRegistrationToken] = useState<string | null>(
    null
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    console.log("🔍 Verify page mounted:", { token, email, isAuthenticated });

    // Don't redirect if already authenticated - let verification complete
    if (isAuthenticated && !token) {
      console.log("✅ Already authenticated, redirecting to chat");
      router.replace("/chat");
      return;
    }

    // Verify magic link if token exists
    if (token) {
      handleVerification();
    } else {
      console.error("❌ No token provided");
      setState("error");
      setError("Invalid magic link - no token provided");
    }
  }, [token, email]); // Removed isAuthenticated from deps to prevent redirect loop

  const handleVerification = async () => {
    if (!token) {
      console.error("❌ No token available for verification");
      return;
    }

    try {
      setState("verifying");
      setError(null);

      console.log("🔐 Starting magic link verification:", { token });

      // Call the verification API
      await verifyMagicLink({ token });

      console.log("✅ Magic link verification successful");
      setState("success");

      // Redirect to chat after showing success
      setTimeout(() => {
        console.log("🔄 Redirecting to chat...");
        router.replace("/chat");
      }, 2000);
    } catch (error: any) {
      console.error("❌ Magic link verification failed:", error);

      // Handle registration required error (412 status)
      if (error.response?.status === 412) {
        const errorData = error.response.data;
        console.log("📝 Registration required:", errorData);

        if (errorData?.data?.requiresRegistration) {
          setState("registration_required");
          setRegistrationToken(errorData.data.token || token);
          setUserEmail(email || errorData.data.email);
          return;
        }
      }

      // Handle other errors
      setState("error");
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Magic link verification failed";
      setError(errorMessage);
    }
  };

  const handleProceedToRegistration = () => {
    console.log("🔄 Proceeding to registration:", {
      registrationToken,
      userEmail,
    });

    if (registrationToken) {
      const params = new URLSearchParams();
      params.set("token", registrationToken);
      if (userEmail) params.set("email", userEmail);

      router.push(`/register?${params.toString()}`);
    }
  };

  const handleBackToLogin = () => {
    console.log("🔄 Going back to login");
    router.push("/login");
  };

  const handleRetryVerification = () => {
    console.log("🔄 Retrying verification");
    handleVerification();
  };

  // Don't render anything while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {state === "verifying" && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <CardTitle>Verifying Magic Link</CardTitle>
              <CardDescription>
                Please wait while we verify your magic link...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-2 bg-primary/20 rounded-full mb-4">
                    <div className="h-2 bg-primary rounded-full w-2/3 transition-all duration-1000"></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This should only take a moment...
                  </p>
                </div>

                {/* Debug info in development */}
                {process.env.NODE_ENV === "development" && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    Token: {token?.substring(0, 10)}...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {state === "success" && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-green-600 dark:text-green-400">
                Welcome back!
              </CardTitle>
              <CardDescription>
                You have been successfully signed in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>Redirecting to your chats</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
                <div className="animate-pulse">
                  <div className="h-2 bg-green-200 dark:bg-green-800 rounded-full">
                    <div className="h-2 bg-green-500 rounded-full w-full transition-all duration-2000"></div>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/chat")}
                  variant="outline"
                  size="sm"
                >
                  Go to Chat Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {state === "registration_required" && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle>Account Setup Required</CardTitle>
              <CardDescription>
                Welcome! Let's create your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  You're signing in for the first time. We'll help you set up
                  your account.
                </AlertDescription>
              </Alert>

              {userEmail && (
                <div className="text-sm text-muted-foreground">
                  Creating account for: <strong>{userEmail}</strong>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleProceedToRegistration}
                  className="w-full"
                  size="lg"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </Button>

                <Button
                  variant="outline"
                  onClick={handleBackToLogin}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {state === "error" && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-red-600 dark:text-red-400">
                Verification Failed
              </CardTitle>
              <CardDescription>
                There was a problem with your magic link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error || "The magic link is invalid or has expired"}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={handleRetryVerification}
                  variant="outline"
                  className="w-full"
                >
                  <Loader2 className="h-4 w-4 mr-2" />
                  Try Again
                </Button>

                <Button
                  onClick={handleBackToLogin}
                  className="w-full"
                  size="lg"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Request New Magic Link
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Magic links expire after 15 minutes for security
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
