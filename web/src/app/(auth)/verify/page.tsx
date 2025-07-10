// src/app/(auth)/verify/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Mail,
  Clock,
  Shield,
  ArrowRight,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { APP_CONFIG } from "@/lib/constants";

type VerificationState =
  | "loading"
  | "success"
  | "registration_required"
  | "expired"
  | "invalid"
  | "already_used"
  | "error";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyMagicLink, sendMagicLink, isAuthenticated, isLoading } =
    useAuth();

  const [verificationState, setVerificationState] =
    useState<VerificationState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(0);

  // Get parameters from URL
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const redirect = searchParams.get("redirect") || "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirect);
    }
  }, [isAuthenticated, isLoading, router, redirect]);

  // Verify the magic link token
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerificationState("invalid");
        return;
      }

      try {
        setVerificationState("loading");
        await verifyMagicLink({ token });
        setVerificationState("success");

        // Start countdown for redirect
        let timeLeft = 5;
        setCountdown(timeLeft);
        setProgress(0);

        const interval = setInterval(() => {
          timeLeft -= 1;
          setCountdown(timeLeft);
          setProgress((5 - timeLeft) * 20);

          if (timeLeft <= 0) {
            clearInterval(interval);
            router.push(redirect);
          }
        }, 1000);

        return () => clearInterval(interval);
      } catch (error: any) {
        console.error("Magic link verification failed:", error);

        // Handle specific error types
        if (error.message === "user registration required") {
          setVerificationState("registration_required");
        } else if (error.message?.includes("expired")) {
          setVerificationState("expired");
        } else if (error.message?.includes("already used")) {
          setVerificationState("already_used");
        } else if (error.message?.includes("invalid")) {
          setVerificationState("invalid");
        } else {
          setVerificationState("error");
          setErrorMessage(error.message || "Verification failed");
        }
      }
    };

    // Small delay to show loading state
    const timer = setTimeout(verifyToken, 500);
    return () => clearTimeout(timer);
  }, [token, verifyMagicLink, router, redirect]);

  // Handle resend magic link
  const handleResendMagicLink = async () => {
    if (!email) return;

    try {
      await sendMagicLink({
        email,
        deviceType: "web",
        deviceName: navigator.userAgent || "Web Browser",
      });
      router.push(
        `/auth/login?method=magic-link&email=${encodeURIComponent(email)}`
      );
    } catch (error) {
      console.error("Failed to resend magic link:", error);
    }
  };

  // Handle redirect to registration
  const handleGoToRegistration = () => {
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    if (email) params.set("email", email);
    router.push(`/auth/register?${params.toString()}`);
  };

  // Don't render if loading or authenticated
  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {verificationState === "loading" && (
        <>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Verifying your magic link</h1>
            <p className="text-muted-foreground">
              Please wait while we verify your identity...
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm">Checking authentication token</span>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Validating email address</span>
                </div>
                <div className="flex items-center space-x-3 opacity-50">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm">Setting up your session</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Success State */}
      {verificationState === "success" && (
        <>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Successfully verified!</h1>
            <p className="text-muted-foreground">
              Welcome to {APP_CONFIG.NAME}. You'll be redirected automatically.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <p className="text-sm">
                    Redirecting in {countdown} seconds...
                  </p>
                  <Progress value={progress} className="w-full" />
                </div>

                <Button
                  onClick={() => router.push(redirect)}
                  className="w-full"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue to {APP_CONFIG.NAME}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Registration Required State */}
      {verificationState === "registration_required" && (
        <>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold">Account creation required</h1>
            <p className="text-muted-foreground">
              This email is not associated with an existing account
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                Your email has been verified. Complete your profile to get
                started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {email && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    <strong>Email:</strong> {email}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              )}

              <Button
                onClick={handleGoToRegistration}
                className="w-full"
                size="lg"
              >
                Complete Registration
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Expired State */}
      {verificationState === "expired" && (
        <>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold">Magic link expired</h1>
            <p className="text-muted-foreground">
              This magic link has expired for security reasons
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Magic links expire after 15 minutes to keep your account
                  secure.
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Request a new magic link to continue
                </p>

                {email ? (
                  <Button onClick={handleResendMagicLink} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Send new magic link to {email}
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push("/auth/login")}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Go to login
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Already Used State */}
      {verificationState === "already_used" && (
        <>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold">Magic link already used</h1>
            <p className="text-muted-foreground">
              This magic link has already been used and cannot be used again
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Each magic link can only be used once for security reasons.
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  If you need to sign in again, request a new magic link
                </p>

                <Button
                  onClick={() => router.push("/auth/login")}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Go to login
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Invalid State */}
      {verificationState === "invalid" && (
        <>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold">Invalid magic link</h1>
            <p className="text-muted-foreground">
              This magic link is not valid or has been corrupted
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The verification token is missing or invalid.
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Please request a new magic link from the login page
                </p>

                <Button
                  onClick={() => router.push("/auth/login")}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Go to login
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Error State */}
      {verificationState === "error" && (
        <>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold">Verification failed</h1>
            <p className="text-muted-foreground">
              Something went wrong while verifying your magic link
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage ||
                    "An unexpected error occurred during verification."}
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  You can try requesting a new magic link or contact support if
                  the problem persists
                </p>

                <div className="space-y-2">
                  <Button
                    onClick={() => router.push("/auth/login")}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Try again
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push("/contact")}
                    className="w-full"
                  >
                    Contact support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Help section */}
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          Having trouble? Check our{" "}
          <Link href="/help" className="text-primary hover:underline">
            help documentation
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
