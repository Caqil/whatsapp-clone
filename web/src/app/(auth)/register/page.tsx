// src/app/(auth)/register/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserPlus,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
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
import { RegisterForm } from "@/components/auth/register-form";
import { APP_CONFIG } from "@/lib/constants";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const [registrationStep, setRegistrationStep] = useState<"form" | "success">(
    "form"
  );
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Get token and email from URL params
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const fromMagicLink = !!token;

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle successful registration
  const handleRegistrationSuccess = () => {
    setRegistrationStep("success");
    setRegisteredEmail(email || "");
  };

  // Handle back to login
  const handleBackToLogin = () => {
    router.push("/auth/login");
  };

  // Don't render if loading or authenticated
  if (isLoading || isAuthenticated) {
    return null;
  }

  // If no token provided, redirect to login with info
  if (!fromMagicLink) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold">Registration Required</h1>
          <p className="text-muted-foreground">
            You need a magic link to create an account
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Account creation is only available through magic links for
              security. This ensures that you own the email address you're
              registering with.
            </p>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">How to create an account:</h3>
              <ol className="text-sm text-muted-foreground space-y-1 text-left">
                <li>1. Go to the login page</li>
                <li>2. Enter your email address</li>
                <li>3. Check your email for a magic link</li>
                <li>4. Click the link to create your account</li>
              </ol>
            </div>

            <Button onClick={handleBackToLogin} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (registrationStep === "success") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to {APP_CONFIG.NAME}!</h1>
          <p className="text-muted-foreground">
            Your account has been created successfully
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                You're now signed in and ready to start messaging!
              </p>
              {registeredEmail && (
                <p className="text-xs text-muted-foreground">
                  Account created for: <strong>{registeredEmail}</strong>
                </p>
              )}
            </div>

            <Button
              onClick={() => router.push("/")}
              className="w-full"
              size="lg"
            >
              Continue to {APP_CONFIG.NAME}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center space-y-3">
          <h3 className="font-medium">What's next?</h3>
          <div className="grid gap-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1">Set up your profile</h4>
              <p className="text-muted-foreground text-xs">
                Add a profile picture and customize your bio
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1">Start chatting</h4>
              <p className="text-muted-foreground text-xs">
                Find friends and family to start conversations
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1">Link your devices</h4>
              <p className="text-muted-foreground text-xs">
                Connect your mobile WhatsApp for seamless messaging
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToLogin}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground">
          Complete your profile to get started
        </p>
      </div>

      {/* Magic link verification badge */}
      {fromMagicLink && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Verified via magic link
          </Badge>
        </div>
      )}

      {/* Registration form */}
      <RegisterForm
        token={token!}
        onSuccess={handleRegistrationSuccess}
        onBack={handleBackToLogin}
        showBackButton={false}
        defaultValues={{
          email: email || "",
        }}
      />

      {/* Security notice */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <h3 className="font-medium flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Secure Registration
            </h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Your email has been verified through our secure magic link
                system.
              </p>
              <p>
                All information is encrypted and protected according to our
                privacy policy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms and privacy */}
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Help link */}
      <div className="text-center">
        <Link
          href="/help"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Need help with registration?
        </Link>
      </div>

      {/* Development notice */}
      {process.env.NODE_ENV === "development" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Development Mode:</strong> Registration is in demo mode.
            Some features may not work as expected.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
